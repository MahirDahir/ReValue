import os
import uuid
from typing import List, Optional
from fastapi import UploadFile, HTTPException
from PIL import Image
from config import get_settings

settings = get_settings()


def ensure_upload_dir():
    """Ensure upload directory exists"""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def validate_file_extension(filename: str) -> bool:
    """Check if file extension is allowed"""
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    return ext in settings.ALLOWED_EXTENSIONS


def save_upload_file(file: UploadFile) -> str:
    """Save uploaded file and return filepath"""
    ensure_upload_dir()

    # Validate extension
    if not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}",
        )

    # Generate unique filename
    ext = file.filename.rsplit(".", 1)[1].lower()
    unique_filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Save file using the underlying sync file object
    with open(filepath, "wb") as buffer:
        buffer.write(file.file.read())

    # Validate it's an image
    try:
        with Image.open(filepath) as img:
            img.verify()
    except Exception:
        os.remove(filepath)
        raise HTTPException(status_code=400, detail="Invalid image file")

    return filepath


def get_image_url(filepath: str) -> str:
    """Get URL for an image file"""
    filename = os.path.basename(filepath)
    return f"/uploads/{filename}"
