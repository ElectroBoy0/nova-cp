from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field

BugCategory = Literal[
    "Authentication",
    "Codeforces Sync",
    "Recommendations",
    "Analytics",
    "Problem Explorer",
    "UI/UX",
    "Performance",
    "Other",
]

BugPriority = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
BugStatus = Literal["OPEN", "IN_PROGRESS", "FIXED", "CLOSED"]


class BugReportCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Issue summary")
    category: str = Field(..., description="Category of the bug")
    description: str = Field(..., min_length=5, description="Detailed explanation of the issue")
    reproduction_steps: Optional[str] = Field(None, description="Steps to reproduce")
    expected_behavior: Optional[str] = Field(None, description="What was expected")
    actual_behavior: Optional[str] = Field(None, description="What actually occurred")
    priority: BugPriority = Field("MEDIUM", description="Issue priority")
    screenshot_url: Optional[str] = Field(None, max_length=1024, description="URL to uploaded screenshot")
    environment_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Client diagnostic metadata")


class BugReportStatusUpdate(BaseModel):
    status: Optional[BugStatus] = None
    priority: Optional[BugPriority] = None


class BugReportRead(BaseModel):
    id: str
    user_id: str
    title: str
    category: str
    description: str
    reproduction_steps: Optional[str] = None
    expected_behavior: Optional[str] = None
    actual_behavior: Optional[str] = None
    priority: str
    status: str
    screenshot_url: Optional[str] = None
    environment_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BugReportListResponse(BaseModel):
    items: List[BugReportRead]
    total: int
