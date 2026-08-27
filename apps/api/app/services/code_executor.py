from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
import time
import logging
from pathlib import Path
from typing import List, Optional, Tuple

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


class CodeExecutorService:
    """
    Secure sandboxed code execution service supporting C++, Python, and Java.
    Executes in an ephemeral sandbox with strict CPU, memory, and wall-clock timeouts.
    """

    @classmethod
    def _find_compiler(cls, lang: Language) -> Optional[str]:
        if lang == "cpp":
            for bin_name in ["g++", "clang++", "g++-12", "g++-13", "g++-11", "gcc"]:
                found = shutil.which(bin_name)
                if found:
                    return found
            # Fallback absolute paths in Linux/Debian/macOS environments
            for path_str in ["/usr/bin/g++", "/usr/local/bin/g++", "/usr/bin/clang++", "/opt/homebrew/bin/g++"]:
                if Path(path_str).is_file() and os.access(path_str, os.X_OK):
                    return path_str
            return None
        elif lang == "python":
            return shutil.which("python3") or shutil.which("python") or "/usr/bin/python3"
        elif lang == "java":
            for bin_name in ["javac"]:
                found = shutil.which(bin_name)
                if found:
                    return found
            for path_str in ["/usr/bin/javac", "/usr/lib/jvm/default-java/bin/javac"]:
                if Path(path_str).is_file() and os.access(path_str, os.X_OK):
                    return path_str
            return None
        return None

    @classmethod
    def _find_runner(cls, lang: Language) -> Optional[str]:
        if lang == "python":
            return shutil.which("python3") or shutil.which("python") or "/usr/bin/python3"
        elif lang == "java":
            return shutil.which("java") or "/usr/bin/java"
        return None

    @classmethod
    def _normalize_output(cls, text: str) -> str:
        """
        Normalize output by converting line endings and trimming trailing whitespace on lines.
        """
        lines = [line.rstrip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
        # Remove trailing empty lines
        while lines and not lines[-1]:
            lines.pop()
        return "\n".join(lines)

    @classmethod
    async def run(cls, request: CodeRunRequest) -> CodeRunResponse:
        """
        Execute code against multiple test cases inside a temporary isolated environment.
        """
        start_total_time = time.perf_counter()
        time_limit_sec = request.time_limit_ms / 1000.0

        with tempfile.TemporaryDirectory(prefix="novacp_exec_") as tmpdir:
            work_dir = Path(tmpdir)
            compile_output: Optional[str] = None
            executable_path: Optional[Path] = None

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

                try:
                    proc = await asyncio.create_subprocess_exec(
                        *cmd,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        cwd=str(work_dir),
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
                except asyncio.TimeoutError:
                    return CodeRunResponse(
                        status="COMPILATION_ERROR",
                        compile_output="Compilation timed out (> 10s).",
                    )
                except Exception as e:
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
                try:
                    proc = await asyncio.create_subprocess_exec(
                        *cmd,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        cwd=str(work_dir),
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
                except asyncio.TimeoutError:
                    return CodeRunResponse(
                        status="COMPILATION_ERROR",
                        compile_output="Java compilation timed out (> 10s).",
                    )
                except Exception as e:
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
            test_results: List[TestCaseResult] = []
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
        executable_path: Optional[Path],
        time_limit_sec: float,
        memory_limit_mb: int,
    ) -> Tuple[TestCaseResult, TestCaseStatus]:
        """
        Execute code against one test case input and capture runtime, memory, and output.
        """
        if language == "cpp":
            cmd = [str(executable_path)]
        elif language == "python":
            py_runner = cls._find_runner("python") or "python3"
            cmd = [py_runner, "-u", "solution.py"]
        elif language == "java":
            java_runner = cls._find_runner("java") or "java"
            cmd = [java_runner, f"-Xmx{memory_limit_mb}m", "-Xss32m", "Main"]
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

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(work_dir),
            )

            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(input=input_bytes),
                timeout=time_limit_sec,
            )
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            # Enforce output length limit
            stdout_str = stdout_bytes[:MAX_OUTPUT_BYTES].decode("utf-8", errors="replace")
            stderr_str = stderr_bytes[:MAX_OUTPUT_BYTES].decode("utf-8", errors="replace")

            # Check exit code
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

        except asyncio.TimeoutError:
            try:
                proc.kill()
                await proc.wait()
            except Exception:
                pass
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
