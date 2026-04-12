"""Job queue management endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.workflow import Job

router = APIRouter(prefix="/jobs", tags=["jobs"])

OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./outputs"))


@router.get("")
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).order_by(Job.created_at.desc()))
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "workflow_id": j.workflow_id,
            "file_id": j.file_id,
            "operation": j.operation,
            "status": j.status,
            "progress": j.progress,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
            "has_output": bool(j.output_path),
        }
        for j in jobs
    ]


@router.get("/{job_id}")
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "id": job.id,
        "workflow_id": job.workflow_id,
        "file_id": job.file_id,
        "operation": job.operation,
        "status": job.status,
        "progress": job.progress,
        "log": job.log,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "has_output": bool(job.output_path),
    }


@router.get("/{job_id}/download")
async def download_job_output(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.output_path:
        raise HTTPException(404, "No output file for this job")
    out_path = Path(job.output_path)
    if not out_path.exists():
        raise HTTPException(404, "Output file missing from disk")
    return FileResponse(str(out_path), media_type="application/pdf", filename=out_path.name)
