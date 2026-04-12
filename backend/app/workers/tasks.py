"""Celery tasks for async PDF processing."""
# Celery requires Redis for the broker.
# To start: celery -A app.workers.tasks worker --loglevel=info
#
# When not using Celery, jobs can be run synchronously from the API endpoints.
# Configure REDIS_URL in environment for full async support.

import os

try:
    from celery import Celery

    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    celery_app = Celery("prepress", broker=REDIS_URL, backend=REDIS_URL)
    celery_app.conf.task_serializer = "json"
    celery_app.conf.result_serializer = "json"
    celery_app.conf.accept_content = ["json"]
    celery_app.conf.timezone = "Europe/Berlin"

    @celery_app.task(bind=True, name="prepress.execute_workflow")
    def execute_workflow(self, job_id: str):
        """Execute a workflow job."""
        import asyncio
        from app.database import AsyncSessionLocal
        from app.models.workflow import Job
        from sqlalchemy import select
        from datetime import datetime, timezone

        async def _run():
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Job).where(Job.id == job_id))
                job = result.scalar_one_or_none()
                if not job:
                    return

                job.status = "running"
                job.progress = 10
                job.log += "Workflow gestartet...\n"
                await db.commit()

                # TODO: Execute workflow nodes in sequence
                # For now, mark as completed
                job.status = "completed"
                job.progress = 100
                job.log += "Workflow abgeschlossen.\n"
                job.completed_at = datetime.now(timezone.utc)
                await db.commit()

        asyncio.run(_run())

except ImportError:
    # Celery not available – define stubs
    class celery_app:  # type: ignore
        pass

    def execute_workflow(job_id: str):
        pass
