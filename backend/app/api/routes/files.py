"""File upload and management endpoints."""
import json
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pdf_processor import (
    calculate_ink_coverage,
    get_pdf_info,
    render_page_preview,
    render_separation,
)
from app.database import get_db
from app.models.file import PDFFile

router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}.pdf"
    file_path = UPLOAD_DIR / safe_name

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        info = get_pdf_info(str(file_path))
    except Exception as e:
        file_path.unlink(missing_ok=True)
        raise HTTPException(422, f"Failed to parse PDF: {e}")

    pdf_record = PDFFile(
        id=file_id,
        filename=safe_name,
        original_name=file.filename,
        path=str(file_path),
        size=len(content),
        pages=info["pages"],
        width_mm=info["width_mm"],
        height_mm=info["height_mm"],
        color_spaces=json.dumps(info["color_spaces"]),
        spot_colors=json.dumps(info["spot_colors"]),
        fonts=json.dumps(info["fonts"]),
    )
    db.add(pdf_record)
    await db.commit()
    await db.refresh(pdf_record)

    return {
        "id": file_id,
        "filename": file.filename,
        "pages": info["pages"],
        "width_mm": info["width_mm"],
        "height_mm": info["height_mm"],
        "size": len(content),
        "color_spaces": info["color_spaces"],
        "spot_colors": info["spot_colors"],
    }


@router.get("")
async def list_files(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PDFFile).order_by(PDFFile.uploaded_at.desc()))
    files = result.scalars().all()
    return [
        {
            "id": f.id,
            "filename": f.original_name,
            "pages": f.pages,
            "width_mm": f.width_mm,
            "height_mm": f.height_mm,
            "size": f.size,
            "color_spaces": json.loads(f.color_spaces or "[]"),
            "spot_colors": json.loads(f.spot_colors or "[]"),
            "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
        }
        for f in files
    ]


@router.get("/{file_id}/info")
async def get_file_info(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PDFFile).where(PDFFile.id == file_id))
    pdf = result.scalar_one_or_none()
    if not pdf:
        raise HTTPException(404, "File not found")

    info = get_pdf_info(pdf.path)
    return {
        "id": pdf.id,
        "filename": pdf.original_name,
        **info,
    }


@router.get("/{file_id}/preview/{page}")
async def get_preview(file_id: str, page: int = 0, dpi: int = 150, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PDFFile).where(PDFFile.id == file_id))
    pdf = result.scalar_one_or_none()
    if not pdf:
        raise HTTPException(404, "File not found")

    png_bytes = render_page_preview(pdf.path, page_num=page, dpi=min(dpi, 300))
    return Response(content=png_bytes, media_type="image/png")


@router.get("/{file_id}/separation/{page}/{channel}")
async def get_separation(file_id: str, page: int, channel: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PDFFile).where(PDFFile.id == file_id))
    pdf = result.scalar_one_or_none()
    if not pdf:
        raise HTTPException(404, "File not found")

    png_bytes = render_separation(pdf.path, page_num=page, channel=channel)
    return Response(content=png_bytes, media_type="image/png")


@router.get("/{file_id}/ink-coverage/{page}")
async def get_ink_coverage(file_id: str, page: int = 0, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PDFFile).where(PDFFile.id == file_id))
    pdf = result.scalar_one_or_none()
    if not pdf:
        raise HTTPException(404, "File not found")

    coverage = calculate_ink_coverage(pdf.path, page_num=page)
    return coverage


@router.delete("/{file_id}")
async def delete_file(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PDFFile).where(PDFFile.id == file_id))
    pdf = result.scalar_one_or_none()
    if not pdf:
        raise HTTPException(404, "File not found")

    Path(pdf.path).unlink(missing_ok=True)
    await db.delete(pdf)
    await db.commit()
    return {"deleted": file_id}
