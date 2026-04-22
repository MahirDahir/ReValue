import os
import uuid
import pathlib
from fastapi import UploadFile, HTTPException
from PIL import Image
from config import get_settings

settings = get_settings()
UPLOAD_DIR = pathlib.Path(settings.UPLOAD_DIR).resolve()

# Cloudinary is used when CLOUDINARY_URL is set (production).
# Falls back to local disk (dev / Docker Compose).
_cloudinary_enabled = bool(settings.CLOUDINARY_URL)
if _cloudinary_enabled:
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)


def _validate(file: UploadFile) -> str:
    if not file.filename or "." not in file.filename:
        raise HTTPException(status_code=400, detail="File has no extension")
    ext = file.filename.rsplit(".", 1)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}")
    return ext


def save_upload_file(file: UploadFile) -> str:
    ext = _validate(file)

    raw = file.file.read()
    if len(raw) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 5 MB)")

    # Validate it's a real image
    import io
    try:
        with Image.open(io.BytesIO(raw)) as img:
            img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    if _cloudinary_enabled:
        result = cloudinary.uploader.upload(
            io.BytesIO(raw),
            folder="revalue",
            resource_type="image",
            format=ext,
        )
        return result["secure_url"]

    # Local disk fallback
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR / filename
    filepath.write_bytes(raw)
    return str(filepath)


def safe_delete_upload(img_url: str):
    if _cloudinary_enabled:
        # Extract public_id from Cloudinary URL: .../revalue/<public_id>.<ext>
        try:
            name = img_url.rsplit("/", 1)[-1].rsplit(".", 1)[0]
            cloudinary.uploader.destroy(f"revalue/{name}")
        except Exception:
            pass
        return
    filename = os.path.basename(img_url)
    filepath = (UPLOAD_DIR / filename).resolve()
    if str(filepath).startswith(str(UPLOAD_DIR)):
        filepath.unlink(missing_ok=True)


def get_image_url(filepath: str) -> str:
    # Cloudinary: filepath is already the full URL
    if filepath.startswith("http"):
        return filepath
    return f"/uploads/{os.path.basename(filepath)}"
