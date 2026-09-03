from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.codeforces_submit import CodeforcesSubmitService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/codeforces", tags=["codeforces"])


class CodeforcesSubmitRequest(BaseModel):
    user_id: Optional[str] = None
    contest_id: int = Field(..., description="Codeforces contest ID e.g. 2258")
    problem_index: str = Field(..., description="Problem index e.g. A")
    code: str = Field(..., min_length=1, description="Source code to submit")
    language: str = Field(default="cpp", description="Programming language")
    session_cookie: Optional[str] = Field(
        default=None,
        description="Optional Codeforces JSESSIONID and 39ce7 cookie string",
    )


class CodeforcesSubmitResponse(BaseModel):
    status: str
    message: str
    contest_id: str
    index: str
    language_id: int


@router.post("/submit", response_model=CodeforcesSubmitResponse, status_code=status.HTTP_200_OK)
async def submit_to_codeforces(
    req: CodeforcesSubmitRequest,
    db: AsyncSession = Depends(get_db),
) -> CodeforcesSubmitResponse:
    """
    Submits source code directly to Codeforces using user's session cookie.
    If session_cookie is not provided in request, checks user's saved preferences.
    """
    cookie = req.session_cookie

    # Fallback to user saved preferences if cookie not provided directly
    if not cookie and req.user_id:
        user = (await db.execute(select(User).where(User.id == req.user_id))).scalar_one_or_none()
        if user and user.custom_preferences:
            cookie = user.custom_preferences.get("cf_session_cookie")

    if not cookie:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Codeforces session cookie not provided. Please provide your Codeforces session "
                "cookies (JSESSIONID and 39ce7) or configure them in Settings -> Integrations."
            ),
        )

    try:
        result = await CodeforcesSubmitService.submit_solution(
            contest_id=req.contest_id,
            problem_index=req.problem_index,
            code=req.code,
            language=req.language,
            session_cookie=cookie,
        )
        return CodeforcesSubmitResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        logger.exception("Codeforces submit router error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit to Codeforces: {str(e)}",
        ) from e
