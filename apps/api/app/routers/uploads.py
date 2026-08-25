from __future__ import annotations

import os
import uuid
import logging
from pathlib import Path
from fastapi import APIRouter, File, HTTPException, UploadFile, status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "uploads" / "screenshots"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_FILE_SIZE = 3 * 1024 * 1024  # 3 MB


@router.post("/screenshot", status_code=status.HTTP_201_CREATED)
async def upload_screenshot(file: UploadFile = File(...)):
    """
    Lightweight screenshot upload abstraction.
    Validates file type and size, stores file in static directory, and returns URL.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename missing",
        )

    # Validate extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Validate content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported media type '{content_type}'",
        )

    # Read content and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Screenshot exceeds maximum size of 3 MB",
        )

    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    target_path = UPLOAD_DIR / unique_filename

    try:
        with open(target_path, "wb") as f:
            f.write(content)
        logger.info("Saved screenshot upload to %s (%d bytes)", target_path, len(content))
    except Exception as e:
        logger.error("Failed to save screenshot upload: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store uploaded screenshot",
        ) from e

    # In local/development, serve via /static/uploads/screenshots/<filename>
    # In production with CDN, this would return the S3/R2 public URL
    public_url = f"/static/uploads/screenshots/{unique_filename}"

    return {
        "url": public_url,
        "filename": unique_filename,
        "size_bytes": len(content),
    }
