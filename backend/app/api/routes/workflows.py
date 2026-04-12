"""Workflow CRUD and execution endpoints."""
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.workflow import Job, Workflow

router = APIRouter(prefix="/workflows", tags=["workflows"])


class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    flow_data: dict = {}


class WorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    flow_data: dict | None = None


class WorkflowRunRequest(BaseModel):
    file_id: str


@router.get("")
async def list_workflows(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).order_by(Workflow.created_at.desc()))
    workflows = result.scalars().all()
    return [
        {
            "id": w.id,
            "name": w.name,
            "description": w.description,
            "created_at": w.created_at.isoformat() if w.created_at else None,
            "updated_at": w.updated_at.isoformat() if w.updated_at else None,
        }
        for w in workflows
    ]


@router.post("")
async def create_workflow(req: WorkflowCreate, db: AsyncSession = Depends(get_db)):
    workflow = Workflow(
        id=str(uuid.uuid4()),
        name=req.name,
        description=req.description,
        flow_data=json.dumps(req.flow_data),
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    return {
        "id": workflow.id,
        "name": workflow.name,
        "description": workflow.description,
        "flow_data": json.loads(workflow.flow_data or "{}"),
    }


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(404, "Workflow not found")
    return {
        "id": workflow.id,
        "name": workflow.name,
        "description": workflow.description,
        "flow_data": json.loads(workflow.flow_data or "{}"),
        "created_at": workflow.created_at.isoformat() if workflow.created_at else None,
        "updated_at": workflow.updated_at.isoformat() if workflow.updated_at else None,
    }


@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, req: WorkflowUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(404, "Workflow not found")

    if req.name is not None:
        workflow.name = req.name
    if req.description is not None:
        workflow.description = req.description
    if req.flow_data is not None:
        workflow.flow_data = json.dumps(req.flow_data)

    await db.commit()
    await db.refresh(workflow)
    return {
        "id": workflow.id,
        "name": workflow.name,
        "flow_data": json.loads(workflow.flow_data or "{}"),
    }


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(404, "Workflow not found")
    await db.delete(workflow)
    await db.commit()
    return {"deleted": workflow_id}


@router.post("/{workflow_id}/run")
async def run_workflow(workflow_id: str, req: WorkflowRunRequest, db: AsyncSession = Depends(get_db)):
    """Create a job to execute a workflow on a file."""
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(404, "Workflow not found")

    job = Job(
        id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        file_id=req.file_id,
        operation="workflow",
        status="pending",
        params=workflow.flow_data or "{}",
        log="Job created, waiting for worker...\n",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # In production, dispatch to Celery here:
    # from app.workers.tasks import execute_workflow
    # execute_workflow.delay(job.id)

    return {
        "job_id": job.id,
        "status": job.status,
        "message": "Job queued successfully",
    }
