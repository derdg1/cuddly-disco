from sqlalchemy import Column, String, Integer, DateTime, Text, Float
from sqlalchemy.sql import func
from app.database import Base


class PDFFile(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    path = Column(String, nullable=False)
    size = Column(Integer, default=0)
    pages = Column(Integer, default=0)
    width_mm = Column(Float, default=0)
    height_mm = Column(Float, default=0)
    color_spaces = Column(Text, default="[]")
    spot_colors = Column(Text, default="[]")
    fonts = Column(Text, default="[]")
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
