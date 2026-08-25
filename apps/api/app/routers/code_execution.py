from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.code_execution import CodeRunRequest, CodeRunResponse
from app.services.code_executor import CodeExecutorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/code", tags=["code-execution"])


@router.post("/run", response_model=CodeRunResponse, status_code=status.HTTP_200_OK)
async def run_code(request: CodeRunRequest) -> CodeRunResponse:
    """
    Execute user competitive programming code in a secure sandboxed environment
    against single or multiple custom test cases.
    """
    try:
        response = await CodeExecutorService.run(request)
        return response
    except Exception as e:
        logger.exception("Unexpected error in code execution endpoint: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code execution failed: {str(e)}",
        ) from e
