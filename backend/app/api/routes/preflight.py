"""Preflight check endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.preflight import run_preflight
from app.database import get_db
from app.models.file import PDFFile

router = APIRouter(prefix="/preflight", tags=["preflight"])


class PreflightRequest(BaseModel):
    file_id: str
    profile: str = "default"


@router.post("/run")
async def preflight_check(req: PreflightRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PDFFile).where(PDFFile.id == req.file_id))
    pdf = result.scalar_one_or_none()
    if not pdf:
        raise HTTPException(404, "File not found")

    try:
        report = run_preflight(pdf.path, profile=req.profile)
    except Exception as e:
        raise HTTPException(500, f"Preflight error: {e}")

    return report
