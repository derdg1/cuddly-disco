"""PDF processing endpoints (marks, imposition, color conversion)."""
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.color_convert import convert_to_cmyk, normalize_pdf
from app.core.imposition import step_and_repeat
from app.core.marks import add_printer_marks
from app.database import get_db
from app.models.file import PDFFile

router = APIRouter(prefix="/process", tags=["process"])

OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./outputs"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class MarksRequest(BaseModel):
    file_id: str
    bleed_mm: float = 3.0
    mark_offset_mm: float = 5.0
    mark_length_mm: float = 5.0
    add_crop_marks: bool = True
    add_registration: bool = True
    add_color_bar: bool = True


class ImpositionRequest(BaseModel):
    file_id: str
    cols: int = 2
    rows: int = 2
    gap_mm: float = 5.0
    bleed_mm: float = 3.0
    sheet_width_mm: float | None = None
    sheet_height_mm: float | None = None
    page_num: int = 0


class ColorConvertRequest(BaseModel):
    file_id: str
    target: str = "cmyk"  # cmyk | pdf_x3 | pdf_x4


async def _get_pdf(file_id: str, db: AsyncSession) -> PDFFile:
    result = await db.execute(select(PDFFile).where(PDFFile.id == file_id))
    pdf = result.scalar_one_or_none()
    if not pdf:
        raise HTTPException(404, "File not found")
    return pdf


@router.post("/marks")
async def add_marks(req: MarksRequest, db: AsyncSession = Depends(get_db)):
    pdf = await _get_pdf(req.file_id, db)
    out_name = f"marks_{uuid.uuid4()}.pdf"
    out_path = str(OUTPUT_DIR / out_name)

    try:
        add_printer_marks(
            pdf.path,
            out_path,
            bleed_mm=req.bleed_mm,
            mark_offset_mm=req.mark_offset_mm,
            mark_length_mm=req.mark_length_mm,
            add_crop_marks=req.add_crop_marks,
            add_registration=req.add_registration,
            add_color_bar=req.add_color_bar,
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to add marks: {e}")

    return {"output_file": out_name, "download_url": f"/api/process/download/{out_name}"}


@router.post("/impose")
async def impose(req: ImpositionRequest, db: AsyncSession = Depends(get_db)):
    pdf = await _get_pdf(req.file_id, db)
    out_name = f"imposed_{uuid.uuid4()}.pdf"
    out_path = str(OUTPUT_DIR / out_name)

    try:
        info = step_and_repeat(
            pdf.path,
            out_path,
            cols=req.cols,
            rows=req.rows,
            gap_mm=req.gap_mm,
            bleed_mm=req.bleed_mm,
            sheet_width_mm=req.sheet_width_mm,
            sheet_height_mm=req.sheet_height_mm,
            page_num=req.page_num,
        )
    except Exception as e:
        raise HTTPException(500, f"Imposition failed: {e}")

    return {
        "output_file": out_name,
        "download_url": f"/api/process/download/{out_name}",
        **info,
    }


@router.post("/color-convert")
async def color_convert(req: ColorConvertRequest, db: AsyncSession = Depends(get_db)):
    pdf = await _get_pdf(req.file_id, db)
    out_name = f"converted_{uuid.uuid4()}.pdf"
    out_path = str(OUTPUT_DIR / out_name)

    try:
        if req.target == "cmyk":
            convert_to_cmyk(pdf.path, out_path)
        elif req.target in ("pdf_x3", "pdf_x4"):
            normalize_pdf(pdf.path, out_path, target=req.target)
        else:
            raise HTTPException(400, f"Unknown target: {req.target}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Conversion failed: {e}")

    return {"output_file": out_name, "download_url": f"/api/process/download/{out_name}"}


@router.get("/download/{filename}")
async def download_output(filename: str):
    # Prevent path traversal
    if ".." in filename or "/" in filename:
        raise HTTPException(400, "Invalid filename")
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(404, "Output file not found")
    return FileResponse(
        str(file_path),
        media_type="application/pdf",
        filename=filename,
    )
