from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field

Language = Literal["cpp", "python", "java"]
TestCaseStatus = Literal[
    "PASSED",
    "WRONG_ANSWER",
    "TIME_LIMIT_EXCEEDED",
    "MEMORY_LIMIT_EXCEEDED",
    "RUNTIME_ERROR",
    "COMPILATION_ERROR",
    "PENDING",
]
OverallStatus = Literal[
    "ACCEPTED",
    "WRONG_ANSWER",
    "TIME_LIMIT_EXCEEDED",
    "MEMORY_LIMIT_EXCEEDED",
    "RUNTIME_ERROR",
    "COMPILATION_ERROR",
    "INTERNAL_ERROR",
]


class TestCaseInput(BaseModel):
    id: str = Field(..., description="Unique identifier for test case (e.g. '1', 'custom-1')")
    input: str = Field(default="", description="Standard input text")
    expected_output: Optional[str] = Field(None, description="Expected standard output text")


class CodeRunRequest(BaseModel):
    language: Language = Field(..., description="Programming language: cpp, python, or java")
    code: str = Field(..., min_length=1, max_length=100_000, description="Source code")
    test_cases: List[TestCaseInput] = Field(
        default_factory=list,
        max_length=20,
        description="List of test cases to execute against",
    )
    time_limit_ms: int = Field(2000, ge=100, le=10000, description="Per-testcase timeout in milliseconds")
    memory_limit_mb: int = Field(256, ge=32, le=512, description="Memory limit in megabytes")


class TestCaseResult(BaseModel):
    id: str
    input: str
    expected_output: Optional[str] = None
    actual_output: str = ""
    status: TestCaseStatus
    time_ms: int = 0
    memory_kb: int = 0
    stderr: Optional[str] = None


class CodeRunResponse(BaseModel):
    status: OverallStatus
    compile_output: Optional[str] = None
    total_time_ms: int = 0
    peak_memory_kb: int = 0
    test_cases: List[TestCaseResult] = Field(default_factory=list)
