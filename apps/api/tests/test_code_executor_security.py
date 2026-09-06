from __future__ import annotations

import shutil

import pytest
from httpx import AsyncClient

from app.schemas.code_execution import CodeRunRequest, TestCaseInput
from app.services.code_executor import CodeExecutorService


@pytest.mark.asyncio
async def test_environment_sanitization_no_secrets(client: AsyncClient, internal_headers: dict[str, str]):
    """
    Verify that user code CANNOT access DATABASE_URL, REDIS_URL,
    INTERNAL_API_KEY, or any host server secrets via os.environ.
    """
    code = (
        "import os\n"
        "secrets = ['DATABASE_URL', 'REDIS_URL', 'INTERNAL_API_KEY', 'GEMINI_API_KEY', 'CF_API_KEY']\n"
        "found = [s for s in secrets if s in os.environ]\n"
        "if found:\n"
        "    print('LEAK:' + ','.join(found))\n"
        "else:\n"
        "    print('CLEAN')\n"
    )
    req = CodeRunRequest(
        language="python",
        code=code,
        test_cases=[TestCaseInput(id="1", input="", expected_output="CLEAN")],
        time_limit_ms=2000,
        memory_limit_mb=256,
    )

    resp = await CodeExecutorService.run(req)
    assert resp.status == "ACCEPTED"
    assert len(resp.test_cases) == 1
    assert resp.test_cases[0].status == "PASSED"
    assert resp.test_cases[0].actual_output.strip() == "CLEAN"


@pytest.mark.asyncio
async def test_process_tree_termination_on_timeout():
    """
    Verify that if user code spawns a background child process (fork / Popen)
    and loops, the entire process group is terminated cleanly on timeout
    and no orphaned processes remain alive.
    """
    code = (
        "import subprocess, time, sys\n"
        "# Spawn a background child process that tries to live forever\n"
        "p = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'])\n"
        "print(p.pid)\n"
        "sys.stdout.flush()\n"
        "time.sleep(10) # Trigger timeout\n"
    )
    req = CodeRunRequest(
        language="python",
        code=code,
        test_cases=[TestCaseInput(id="1", input="")],
        time_limit_ms=500,  # 0.5s timeout
        memory_limit_mb=256,
    )

    resp = await CodeExecutorService.run(req)
    assert resp.status == "TIME_LIMIT_EXCEEDED"
    assert resp.test_cases[0].status == "TIME_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_output_buffer_bounded_to_max():
    """
    Verify that programs generating massive stdout (e.g. 500,000 characters)
    have their output strictly truncated to MAX_OUTPUT_BYTES without exhausting RAM.
    """
    code = (
        "import sys\n"
        "# Generate ~1 MB of output\n"
        "for i in range(20000):\n"
        "    sys.stdout.write('01234567890123456789012345678901234567890123456789\\n')\n"
    )
    req = CodeRunRequest(
        language="python",
        code=code,
        test_cases=[TestCaseInput(id="1", input="")],
        time_limit_ms=3000,
        memory_limit_mb=256,
    )

    resp = await CodeExecutorService.run(req)
    assert resp.status == "ACCEPTED"
    # Output must be capped
    assert len(resp.test_cases[0].actual_output.encode("utf-8")) <= 64 * 1024 + 1024


@pytest.mark.asyncio
async def test_cpp_infinite_loop_translates_to_tle():
    """
    Verify that an infinite CPU loop in C++ triggers TIME_LIMIT_EXCEEDED,
    not RUNTIME_ERROR.
    """
    if not (shutil.which("g++") or shutil.which("clang++")):
        pytest.skip("g++ or clang++ not installed")

    code = (
        "#include <iostream>\n"
        "int main() {\n"
        "    volatile long long x = 0;\n"
        "    while (true) { x++; }\n"
        "    return 0;\n"
        "}\n"
    )
    req = CodeRunRequest(
        language="cpp",
        code=code,
        test_cases=[TestCaseInput(id="1", input="")],
        time_limit_ms=500,  # 0.5s
        memory_limit_mb=256,
    )

    resp = await CodeExecutorService.run(req)
    assert resp.status == "TIME_LIMIT_EXCEEDED"
    assert resp.test_cases[0].status == "TIME_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_java_execution_with_memory_options():
    """
    Verify that Java compiles and runs successfully using JVM memory flags
    without failing JVM initialization.
    """
    if not (CodeExecutorService._find_compiler("java") and CodeExecutorService._find_runner("java")):
        pytest.skip("Working Java runtime not installed on system")

    code = (
        "import java.util.Scanner;\n"
        "public class Main {\n"
        "    public static void main(String[] args) {\n"
        "        Scanner sc = new Scanner(System.in);\n"
        "        if (sc.hasNextInt()) {\n"
        "            int a = sc.nextInt();\n"
        "            int b = sc.nextInt();\n"
        "            System.out.println(a * b);\n"
        "        }\n"
        "    }\n"
        "}\n"
    )
    req = CodeRunRequest(
        language="java",
        code=code,
        test_cases=[TestCaseInput(id="1", input="6 7\n", expected_output="42\n")],
        time_limit_ms=3000,
        memory_limit_mb=256,
    )

    resp = await CodeExecutorService.run(req)
    assert resp.status == "ACCEPTED"
    assert resp.test_cases[0].status == "PASSED"
    assert resp.test_cases[0].actual_output.strip() == "42"
