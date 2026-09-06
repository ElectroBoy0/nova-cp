from __future__ import annotations

import asyncio
import contextlib
import logging
import math
import os
import platform
import resource
import shutil
import signal
import subprocess
import tempfile
import time
from pathlib import Path

from app.schemas.code_execution import (
    CodeRunRequest,
    CodeRunResponse,
    Language,
    OverallStatus,
    TestCaseInput,
    TestCaseResult,
    TestCaseStatus,
)

logger = logging.getLogger(__name__)

MAX_OUTPUT_BYTES = 64 * 1024  # 64 KB max stdout/stderr per testcase
COMPILE_TIMEOUT_SECONDS = 10.0

# Base clean environment containing zero server secrets
BASE_CLEAN_ENV: dict[str, str] = {
    "PATH": os.environ.get("PATH", "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"),
    "LANG": "en_US.UTF-8",
    "LC_ALL": "en_US.UTF-8",
    "PYTHONHASHSEED": "random",
    "PYTHONUNBUFFERED": "1",
}


class CodeExecutorService:
    """
    Secure sandboxed code execution service supporting C++, Python, and Java.
    Executes in an ephemeral sandbox with process-group isolation, sanitized environment,
    bounded streams, and strict CPU, memory, and wall-clock timeouts.
    """

    # Concurrency semaphore to throttle CPU-intensive compilations per worker process
    _COMPILATION_SEMAPHORE = asyncio.Semaphore(2)

    # Compiler/runner verification caches
    _compiler_cache: dict[str, str | None] = {}
    _runner_cache: dict[str, str | None] = {}

    @classmethod
    def _make_clean_env(cls, work_dir: Path) -> dict[str, str]:
        """
        Build an isolated, sanitized environment stripped of all server secrets
        (DATABASE_URL, REDIS_URL, INTERNAL_API_KEY, GEMINI_API_KEY, cookies, etc.).
        """
        clean_env = dict(BASE_CLEAN_ENV)
        clean_env["HOME"] = str(work_dir)
        clean_env["TMPDIR"] = str(work_dir)
        if "JAVA_HOME" in os.environ:
            clean_env["JAVA_HOME"] = os.environ["JAVA_HOME"]
        return clean_env

    @classmethod
    def _make_rlimit_preexec(
        cls,
        cpu_time_sec: int,
        max_file_bytes: int = 10 * 1024 * 1024,
        memory_bytes: int | None = None,
    ):
        """
        POSIX preexec hook to configure kernel-level resource limits before execve.
        """
        def preexec():
            # 1. CPU Limit: soft limit triggers SIGXCPU, hard limit triggers SIGKILL
            if hasattr(resource, "RLIMIT_CPU"):
                with contextlib.suppress(ValueError, OSError):
                    resource.setrlimit(resource.RLIMIT_CPU, (cpu_time_sec, cpu_time_sec + 1))

            # 2. File Size Limit: prevents runaway disk writes (>10MB)
            if hasattr(resource, "RLIMIT_FSIZE"):
                with contextlib.suppress(ValueError, OSError):
                    resource.setrlimit(resource.RLIMIT_FSIZE, (max_file_bytes, max_file_bytes))

            # 3. Virtual Address Space Limit (C++ and Python on Linux):
            # Explicitly NOT applied to Java as OpenJDK reserves several GBs upfront
            if memory_bytes is not None and hasattr(resource, "RLIMIT_AS") and platform.system() == "Linux":
                with contextlib.suppress(ValueError, OSError):
                    resource.setrlimit(resource.RLIMIT_AS, (memory_bytes, memory_bytes))

        return preexec

    @classmethod
    async def _kill_process_group(cls, proc: asyncio.subprocess.Process | None) -> None:
        """
        Safely terminate all processes in the process group (parent, children, grandchildren).
        """
        if proc is None:
            return
        if proc.returncode is not None:
            return
        try:
            # Deliver SIGKILL to the process group (pgid == proc.pid since start_new_session=True)
            os.killpg(proc.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError, OSError):
            with contextlib.suppress(Exception):
                proc.kill()
        with contextlib.suppress(TimeoutError, Exception):
            await asyncio.wait_for(proc.wait(), timeout=1.0)

    @classmethod
    async def _communicate_bounded(
        cls,
        proc: asyncio.subprocess.Process,
        input_bytes: bytes,
        max_bytes: int = MAX_OUTPUT_BYTES,
    ) -> tuple[bytes, bytes]:
        """
        Send input and read stdout/stderr concurrently, capping buffer accumulation
        to avoid RAM exhaustion if user code prints gigabytes of output.
        """
        stdout_chunks: list[bytes] = []
        stderr_chunks: list[bytes] = []
        stdout_len = 0
        stderr_len = 0
        buf_limit = max_bytes * 2

        async def read_stream(stream: asyncio.StreamReader | None, is_stdout: bool):
            nonlocal stdout_len, stderr_len
            if not stream:
                return
            while True:
                chunk = await stream.read(4096)
                if not chunk:
                    break
                curr_len = stdout_len if is_stdout else stderr_len
                if curr_len < buf_limit:
                    if is_stdout:
                        stdout_chunks.append(chunk)
                        stdout_len += len(chunk)
                    else:
                        stderr_chunks.append(chunk)
                        stderr_len += len(chunk)

        async def write_stdin(stream: asyncio.StreamWriter | None):
            if stream and input_bytes:
                try:
                    stream.write(input_bytes)
                    await stream.drain()
                except (BrokenPipeError, ConnectionResetError, OSError):
                    pass
                finally:
                    with contextlib.suppress(Exception):
                        stream.close()
            elif stream:
                with contextlib.suppress(Exception):
                    stream.close()

        await asyncio.gather(
            write_stdin(proc.stdin),
            read_stream(proc.stdout, True),
            read_stream(proc.stderr, False),
        )
        await proc.wait()

        return b"".join(stdout_chunks)[:max_bytes], b"".join(stderr_chunks)[:max_bytes]

    @classmethod
    def _find_compiler(cls, lang: Language) -> str | None:
        if lang in cls._compiler_cache:
            return cls._compiler_cache[lang]

        result: str | None = None
        if lang == "cpp":
            for bin_name in ["g++", "clang++", "g++-12", "g++-13", "g++-11", "gcc"]:
                found = shutil.which(bin_name)
                if found:
                    result = found
                    break
            if not result:
                for path_str in ["/usr/bin/g++", "/usr/local/bin/g++", "/usr/bin/clang++", "/opt/homebrew/bin/g++"]:
                    if Path(path_str).is_file() and os.access(path_str, os.X_OK):
                        result = path_str
                        break
        elif lang == "python":
            result = shutil.which("python3") or shutil.which("python") or "/usr/bin/python3"
        elif lang == "java":
            for bin_name in ["javac"]:
                found = shutil.which(bin_name)
                if found:
                    try:
                        res = subprocess.run([found, "-version"], capture_output=True, timeout=2.0)
                        if res.returncode == 0:
                            result = found
                            break
                    except Exception:
                        pass
            if not result:
                for path_str in ["/usr/bin/javac", "/usr/lib/jvm/default-java/bin/javac"]:
                    if Path(path_str).is_file() and os.access(path_str, os.X_OK):
                        try:
                            res = subprocess.run([path_str, "-version"], capture_output=True, timeout=2.0)
                            if res.returncode == 0:
                                result = path_str
                                break
                        except Exception:
                            pass

        cls._compiler_cache[lang] = result
        return result

    @classmethod
    def _find_runner(cls, lang: Language) -> str | None:
        if lang in cls._runner_cache:
            return cls._runner_cache[lang]

        result: str | None = None
        if lang == "python":
            result = shutil.which("python3") or shutil.which("python") or "/usr/bin/python3"
        elif lang == "java":
            for bin_name in ["java"]:
                found = shutil.which(bin_name)
                if found:
                    try:
                        res = subprocess.run([found, "-version"], capture_output=True, timeout=2.0)
                        if res.returncode == 0:
                            result = found
                            break
                    except Exception:
                        pass
            if not result:
                for path_str in ["/usr/bin/java", "/usr/lib/jvm/default-java/bin/java"]:
                    if Path(path_str).is_file() and os.access(path_str, os.X_OK):
                        result = path_str
                        break

        cls._runner_cache[lang] = result
        return result

    @classmethod
    def _normalize_output(cls, text: str) -> str:
        """
        Normalize output by converting line endings and trimming trailing whitespace on lines.
        """
        lines = [line.rstrip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
        while lines and not lines[-1]:
            lines.pop()
        return "\n".join(lines)

    @classmethod
    async def run(cls, request: CodeRunRequest) -> CodeRunResponse:
        """
        Execute code against multiple test cases inside a temporary isolated environment.
        """
        time_limit_sec = request.time_limit_ms / 1000.0

        with tempfile.TemporaryDirectory(prefix="novacp_exec_") as tmpdir:
            work_dir = Path(tmpdir)
            compile_output: str | None = None
            executable_path: Path | None = None
            exec_env = cls._make_clean_env(work_dir)

            # ----------------------------------------------------
            # 1. Compile Step (C++ & Java)
            # ----------------------------------------------------
            if request.language == "cpp":
                source_file = work_dir / "solution.cpp"
                source_file.write_text(request.code, encoding="utf-8")
                binary_file = work_dir / "solution.out"

                compiler = cls._find_compiler("cpp")
                if not compiler:
                    return CodeRunResponse(
                        status="INTERNAL_ERROR",
                        compile_output="C++ compiler (g++/clang++) not found on server.",
                    )

                cmd = [
                    compiler,
                    "-O3",
                    "-std=c++20",
                    "-DONLINE_JUDGE",
                    str(source_file),
                    "-o",
                    str(binary_file),
                ]

                proc: asyncio.subprocess.Process | None = None
                try:
                    async with cls._COMPILATION_SEMAPHORE:
                        proc = await asyncio.create_subprocess_exec(
                            *cmd,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE,
                            cwd=str(work_dir),
                            env=exec_env,
                            start_new_session=True,
                        )
                        stdout, stderr = await asyncio.wait_for(
                            proc.communicate(),
                            timeout=COMPILE_TIMEOUT_SECONDS,
                        )

                    compile_str = (stderr.decode("utf-8", errors="replace") + stdout.decode("utf-8", errors="replace")).strip()
                    if proc.returncode != 0:
                        return CodeRunResponse(
                            status="COMPILATION_ERROR",
                            compile_output=compile_str or "Compilation failed with non-zero exit code.",
                            test_cases=[],
                        )
                    if compile_str:
                        compile_output = compile_str
                    executable_path = binary_file
                except TimeoutError:
                    await cls._kill_process_group(proc)
                    return CodeRunResponse(
                        status="COMPILATION_ERROR",
                        compile_output="Compilation timed out (> 10s).",
                    )
                except Exception as e:
                    await cls._kill_process_group(proc)
                    logger.error("C++ compilation error: %s", e)
                    return CodeRunResponse(
                        status="INTERNAL_ERROR",
                        compile_output=f"Compilation error: {e}",
                    )

            elif request.language == "java":
                source_file = work_dir / "Main.java"
                source_file.write_text(request.code, encoding="utf-8")

                javac = cls._find_compiler("java")
                if not javac:
                    return CodeRunResponse(
                        status="INTERNAL_ERROR",
                        compile_output="Java compiler (javac) not found on server.",
                    )

                cmd = [javac, str(source_file)]
                proc = None
                try:
                    async with cls._COMPILATION_SEMAPHORE:
                        proc = await asyncio.create_subprocess_exec(
                            *cmd,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE,
                            cwd=str(work_dir),
                            env=exec_env,
                            start_new_session=True,
                        )
                        stdout, stderr = await asyncio.wait_for(
                            proc.communicate(),
                            timeout=COMPILE_TIMEOUT_SECONDS,
                        )

                    compile_str = (stderr.decode("utf-8", errors="replace") + stdout.decode("utf-8", errors="replace")).strip()
                    if proc.returncode != 0:
                        return CodeRunResponse(
                            status="COMPILATION_ERROR",
                            compile_output=compile_str or "Java compilation failed.",
                            test_cases=[],
                        )
                    if compile_str:
                        compile_output = compile_str
                except TimeoutError:
                    await cls._kill_process_group(proc)
                    return CodeRunResponse(
                        status="COMPILATION_ERROR",
                        compile_output="Java compilation timed out (> 10s).",
                    )
                except Exception as e:
                    await cls._kill_process_group(proc)
                    logger.error("Java compilation error: %s", e)
                    return CodeRunResponse(
                        status="INTERNAL_ERROR",
                        compile_output=f"Compilation error: {e}",
                    )

            elif request.language == "python":
                source_file = work_dir / "solution.py"
                source_file.write_text(request.code, encoding="utf-8")

            # ----------------------------------------------------
            # 2. Execute Test Cases
            # ----------------------------------------------------
            test_results: list[TestCaseResult] = []
            overall_status: OverallStatus = "ACCEPTED"
            peak_memory_kb = 0
            total_execution_ms = 0

            # If no test cases were supplied, run an empty default testcase
            test_cases = request.test_cases if request.test_cases else [TestCaseInput(id="default", input="")]

            for tc in test_cases:
                tc_result, tc_status = await cls._execute_single_testcase(
                    tc=tc,
                    language=request.language,
                    work_dir=work_dir,
                    exec_env=exec_env,
                    executable_path=executable_path,
                    time_limit_sec=time_limit_sec,
                    memory_limit_mb=request.memory_limit_mb,
                )
                test_results.append(tc_result)
                total_execution_ms += tc_result.time_ms
                if tc_result.memory_kb > peak_memory_kb:
                    peak_memory_kb = tc_result.memory_kb

                # Overall status priority: TLE > RTE > WA > ACCEPTED
                if tc_status == "TIME_LIMIT_EXCEEDED" and overall_status != "TIME_LIMIT_EXCEEDED":
                    overall_status = "TIME_LIMIT_EXCEEDED"
                elif tc_status == "RUNTIME_ERROR" and overall_status not in ("TIME_LIMIT_EXCEEDED", "RUNTIME_ERROR"):
                    overall_status = "RUNTIME_ERROR"
                elif tc_status == "WRONG_ANSWER" and overall_status == "ACCEPTED":
                    overall_status = "WRONG_ANSWER"

            return CodeRunResponse(
                status=overall_status,
                compile_output=compile_output,
                total_time_ms=total_execution_ms,
                peak_memory_kb=peak_memory_kb,
                test_cases=test_results,
            )

    @classmethod
    async def _execute_single_testcase(
        cls,
        tc: TestCaseInput,
        language: Language,
        work_dir: Path,
        exec_env: dict[str, str],
        executable_path: Path | None,
        time_limit_sec: float,
        memory_limit_mb: int,
    ) -> tuple[TestCaseResult, TestCaseStatus]:
        """
        Execute code against one test case input in an isolated process group
        with kernel resource limits and bounded stream handling.
        """
        memory_bytes: int | None = None

        if language == "cpp":
            cmd = [str(executable_path)]
            cpu_time_sec = max(1, math.ceil(time_limit_sec) + 1)
            memory_bytes = memory_limit_mb * 1024 * 1024
        elif language == "python":
            py_runner = cls._find_runner("python") or "python3"
            cmd = [py_runner, "-u", "solution.py"]
            cpu_time_sec = max(2, math.ceil(time_limit_sec) + 1)
            memory_bytes = max(128, memory_limit_mb) * 1024 * 1024
        elif language == "java":
            java_runner = cls._find_runner("java") or "java"
            # Explicit JVM memory options; no RLIMIT_AS to prevent JVM initialization failures
            cmd = [
                java_runner,
                f"-Xmx{memory_limit_mb}m",
                "-Xms16m",
                "-Xss32m",
                "-XX:+UseSerialGC",
                "Main",
            ]
            cpu_time_sec = max(3, math.ceil(time_limit_sec) + 2)
            memory_bytes = None
        else:
            return (
                TestCaseResult(
                    id=tc.id,
                    input=tc.input,
                    expected_output=tc.expected_output,
                    status="RUNTIME_ERROR",
                    stderr=f"Unsupported language {language}",
                ),
                "RUNTIME_ERROR",
            )

        input_bytes = tc.input.encode("utf-8")
        start_time = time.perf_counter()
        preexec = cls._make_rlimit_preexec(
            cpu_time_sec=cpu_time_sec,
            max_file_bytes=10 * 1024 * 1024,
            memory_bytes=memory_bytes,
        )

        proc: asyncio.subprocess.Process | None = None
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(work_dir),
                env=exec_env,
                start_new_session=True,
                preexec_fn=preexec,
            )

            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                cls._communicate_bounded(proc, input_bytes, MAX_OUTPUT_BYTES),
                timeout=time_limit_sec,
            )
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            stdout_str = stdout_bytes.decode("utf-8", errors="replace")
            stderr_str = stderr_bytes.decode("utf-8", errors="replace")

            # Check exit code
            # Detect SIGXCPU (-24, 152) or SIGKILL (-9, 137) as TLE
            is_tle_signal = proc.returncode in (-signal.SIGXCPU, 152, -signal.SIGKILL, 137)
            if is_tle_signal:
                return (
                    TestCaseResult(
                        id=tc.id,
                        input=tc.input,
                        expected_output=tc.expected_output,
                        actual_output="",
                        status="TIME_LIMIT_EXCEEDED",
                        time_ms=int(time_limit_sec * 1000),
                        memory_kb=0,
                        stderr=f"Time limit exceeded ({int(time_limit_sec * 1000)}ms)",
                    ),
                    "TIME_LIMIT_EXCEEDED",
                )

            if proc.returncode != 0:
                return (
                    TestCaseResult(
                        id=tc.id,
                        input=tc.input,
                        expected_output=tc.expected_output,
                        actual_output=stdout_str,
                        status="RUNTIME_ERROR",
                        time_ms=elapsed_ms,
                        memory_kb=1024,
                        stderr=stderr_str or f"Process exited with code {proc.returncode}",
                    ),
                    "RUNTIME_ERROR",
                )

            # Compare output with expected if expected_output is given
            norm_actual = cls._normalize_output(stdout_str)
            if tc.expected_output is not None:
                norm_expected = cls._normalize_output(tc.expected_output)
                if norm_actual == norm_expected:
                    status: TestCaseStatus = "PASSED"
                else:
                    status = "WRONG_ANSWER"
            else:
                status = "PASSED"

            return (
                TestCaseResult(
                    id=tc.id,
                    input=tc.input,
                    expected_output=tc.expected_output,
                    actual_output=stdout_str,
                    status=status,
                    time_ms=elapsed_ms,
                    memory_kb=2048,
                    stderr=stderr_str if stderr_str else None,
                ),
                status,
            )

        except TimeoutError:
            await cls._kill_process_group(proc)
            elapsed_ms = int(time_limit_sec * 1000)
            return (
                TestCaseResult(
                    id=tc.id,
                    input=tc.input,
                    expected_output=tc.expected_output,
                    actual_output="",
                    status="TIME_LIMIT_EXCEEDED",
                    time_ms=elapsed_ms,
                    memory_kb=0,
                    stderr=f"Time limit exceeded ({int(time_limit_sec * 1000)}ms)",
                ),
                "TIME_LIMIT_EXCEEDED",
            )
        except Exception as e:
            await cls._kill_process_group(proc)
            return (
                TestCaseResult(
                    id=tc.id,
                    input=tc.input,
                    expected_output=tc.expected_output,
                    actual_output="",
                    status="RUNTIME_ERROR",
                    time_ms=0,
                    memory_kb=0,
                    stderr=f"Execution error: {e}",
                ),
                "RUNTIME_ERROR",
            )
        finally:
            # Ensure process group is killed if somehow still alive
            if proc is not None and proc.returncode is None:
                await cls._kill_process_group(proc)
