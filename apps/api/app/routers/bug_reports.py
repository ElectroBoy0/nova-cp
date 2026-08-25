from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.bug_report import BugReport
from app.models.user import User
from app.schemas.bug_report import (
    BugReportCreate,
    BugReportListResponse,
    BugReportRead,
    BugReportStatusUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bug-reports", tags=["bug-reports"])


@router.post("", response_model=BugReportRead, status_code=status.HTTP_201_CREATED)
async def create_bug_report(
    payload: BugReportCreate,
    user_id: str = Query(..., description="ID of the user filing the bug report"),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a new bug report linked to an authenticated user with automated diagnostic metadata.
    """
    # Verify user exists
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found",
        )

    bug_report = BugReport(
        user_id=user_id,
        title=payload.title.strip(),
        category=payload.category,
        description=payload.description.strip(),
        reproduction_steps=payload.reproduction_steps.strip() if payload.reproduction_steps else None,
        expected_behavior=payload.expected_behavior.strip() if payload.expected_behavior else None,
        actual_behavior=payload.actual_behavior.strip() if payload.actual_behavior else None,
        priority=payload.priority,
        status="OPEN",
        screenshot_url=payload.screenshot_url,
        environment_metadata=payload.environment_metadata or {},
    )

    db.add(bug_report)
    await db.commit()
    await db.refresh(bug_report)

    logger.info(
        "Created bug report %s (title=%r, user_id=%s, priority=%s)",
        bug_report.id,
        bug_report.title,
        user_id,
        bug_report.priority,
    )

    return bug_report


@router.get("", response_model=BugReportListResponse)
async def list_bug_reports(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    status: Optional[str] = Query(None, description="Filter by status (OPEN, IN_PROGRESS, FIXED, CLOSED)"),
    priority: Optional[str] = Query(None, description="Filter by priority (LOW, MEDIUM, HIGH, CRITICAL)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    List bug reports with optional filtering by user, status, priority, and category.
    """
    query = select(BugReport)
    count_query = select(func.count(BugReport.id))

    if user_id:
        query = query.where(BugReport.user_id == user_id)
        count_query = count_query.where(BugReport.user_id == user_id)

    if status:
        query = query.where(BugReport.status == status.upper())
        count_query = count_query.where(BugReport.status == status.upper())

    if priority:
        query = query.where(BugReport.priority == priority.upper())
        count_query = count_query.where(BugReport.priority == priority.upper())

    if category:
        query = query.where(BugReport.category == category)
        count_query = count_query.where(BugReport.category == category)

    query = query.order_by(BugReport.created_at.desc()).offset(offset).limit(limit)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(query)
    items = result.scalars().all()

    return BugReportListResponse(items=list(items), total=total)


@router.get("/{report_id}", response_model=BugReportRead)
async def get_bug_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve details of a single bug report.
    """
    report = await db.get(BugReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bug report '{report_id}' not found",
        )
    return report


@router.patch("/{report_id}/status", response_model=BugReportRead)
async def update_bug_report_status(
    report_id: str,
    payload: BugReportStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update the lifecycle status and/or priority of a bug report.
    """
    report = await db.get(BugReport, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bug report '{report_id}' not found",
        )

    if payload.status:
        report.status = payload.status
    if payload.priority:
        report.priority = payload.priority

    await db.commit()
    await db.refresh(report)

    logger.info("Updated bug report %s status to %s (priority=%s)", report_id, report.status, report.priority)
    return report
