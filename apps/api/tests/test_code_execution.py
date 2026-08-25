import shutil
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_python_code_execution_passed(client: AsyncClient, internal_headers: dict[str, str]):
    """
    Test executing Python code that passes all test cases.
    """
    payload = {
        "language": "python",
        "code": (
            "import sys\n"
            "def solve():\n"
            "    lines = sys.stdin.read().split()\n"
            "    if not lines: return\n"
            "    a, b = int(lines[0]), int(lines[1])\n"
            "    print(a + b)\n"
            "solve()\n"
        ),
        "test_cases": [
            {"id": "1", "input": "3 4\n", "expected_output": "7\n"},
            {"id": "2", "input": "100 250\n", "expected_output": "350\n"},
        ],
        "time_limit_ms": 2000,
        "memory_limit_mb": 256,
    }

    response = await client.post("/api/v1/code/run", json=payload, headers=internal_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ACCEPTED"
    assert len(data["test_cases"]) == 2
    assert data["test_cases"][0]["status"] == "PASSED"
    assert data["test_cases"][0]["actual_output"].strip() == "7"
    assert data["test_cases"][1]["status"] == "PASSED"
    assert data["test_cases"][1]["actual_output"].strip() == "350"


@pytest.mark.asyncio
async def test_python_code_execution_wrong_answer(client: AsyncClient, internal_headers: dict[str, str]):
    """
    Test executing Python code that outputs wrong answer on one test case.
    """
    payload = {
        "language": "python",
        "code": "print(42)\n",
        "test_cases": [
            {"id": "1", "input": "", "expected_output": "42"},
            {"id": "2", "input": "", "expected_output": "100"},
        ],
    }

    response = await client.post("/api/v1/code/run", json=payload, headers=internal_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "WRONG_ANSWER"
    assert data["test_cases"][0]["status"] == "PASSED"
    assert data["test_cases"][1]["status"] == "WRONG_ANSWER"


@pytest.mark.asyncio
async def test_python_code_runtime_error(client: AsyncClient, internal_headers: dict[str, str]):
    """
    Test executing Python code with runtime exception.
    """
    payload = {
        "language": "python",
        "code": "x = 1 / 0\n",
        "test_cases": [{"id": "1", "input": ""}],
    }

    response = await client.post("/api/v1/code/run", json=payload, headers=internal_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "RUNTIME_ERROR"
    assert data["test_cases"][0]["status"] == "RUNTIME_ERROR"
    assert "ZeroDivisionError" in (data["test_cases"][0]["stderr"] or "")


@pytest.mark.asyncio
async def test_python_code_time_limit_exceeded(client: AsyncClient, internal_headers: dict[str, str]):
    """
    Test executing Python code that times out.
    """
    payload = {
        "language": "python",
        "code": "import time\ntime.sleep(2)\n",
        "test_cases": [{"id": "1", "input": ""}],
        "time_limit_ms": 500,  # 0.5s timeout
    }

    response = await client.post("/api/v1/code/run", json=payload, headers=internal_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "TIME_LIMIT_EXCEEDED"
    assert data["test_cases"][0]["status"] == "TIME_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_cpp_code_execution(client: AsyncClient, internal_headers: dict[str, str]):
    """
    Test compiling and executing C++ code if a compiler is available.
    """
    has_compiler = shutil.which("g++") or shutil.which("clang++")
    if not has_compiler:
        pytest.skip("No C++ compiler installed on test environment")

    payload = {
        "language": "cpp",
        "code": (
            "#include <iostream>\n"
            "int main() {\n"
            "    long long a, b;\n"
            "    if (std::cin >> a >> b) {\n"
            "        std::cout << (a * b) << std::endl;\n"
            "    }\n"
            "    return 0;\n"
            "}\n"
        ),
        "test_cases": [
            {"id": "1", "input": "6 7\n", "expected_output": "42\n"},
            {"id": "2", "input": "12 12\n", "expected_output": "144\n"},
        ],
        "time_limit_ms": 2000,
    }

    response = await client.post("/api/v1/code/run", json=payload, headers=internal_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ACCEPTED"
    assert len(data["test_cases"]) == 2
    assert data["test_cases"][0]["status"] == "PASSED"
    assert data["test_cases"][0]["actual_output"].strip() == "42"


@pytest.mark.asyncio
async def test_cpp_compilation_error(client: AsyncClient, internal_headers: dict[str, str]):
    """
    Test C++ code with syntax error returns COMPILATION_ERROR with diagnostics.
    """
    has_compiler = shutil.which("g++") or shutil.which("clang++")
    if not has_compiler:
        pytest.skip("No C++ compiler installed on test environment")

    payload = {
        "language": "cpp",
        "code": "int main() { syntax_error_here; }\n",
        "test_cases": [{"id": "1", "input": ""}],
    }

    response = await client.post("/api/v1/code/run", json=payload, headers=internal_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPILATION_ERROR"
    assert data["compile_output"] is not None
    assert "syntax_error_here" in data["compile_output"]
