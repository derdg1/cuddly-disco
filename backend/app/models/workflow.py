from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    flow_data = Column(Text, default="{}")  # React Flow JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, nullable=True)
    file_id = Column(String, nullable=False)
    operation = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending/running/completed/failed
    progress = Column(Integer, default=0)
    log = Column(Text, default="")
    output_path = Column(String, nullable=True)
    params = Column(Text, default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
