from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class DataSession(Base):
    __tablename__ = "data_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    filename = Column(String)
    file_type = Column(String) # 'tabular' or 'image'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Store DQS (Data Quality Score) before and after
    dqs_before = Column(Float, nullable=True)
    dqs_after = Column(Float, nullable=True)
    
    # Summary JSON string (stored as text in SQLite)
    summary_stats = Column(Text, nullable=True)

    issues = relationship("IssueLog", back_populates="session", cascade="all, delete-orphan")
    actions = relationship("CleaningAction", back_populates="session", cascade="all, delete-orphan")

class IssueLog(Base):
    __tablename__ = "issue_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("data_sessions.session_id"))
    issue_type = Column(String) # e.g., 'missing_value', 'outlier', 'blur', 'duplicate_image'
    severity = Column(String) # 'critical', 'warning', 'info'
    description = Column(String)
    affected_column_or_file = Column(String)
    count = Column(Integer, default=1)

    session = relationship("DataSession", back_populates="issues")

class CleaningAction(Base):
    __tablename__ = "cleaning_actions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("data_sessions.session_id"))
    action_type = Column(String) # e.g., 'impute_median', 'drop_row', 'remove_image'
    description = Column(String)
    applied_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("DataSession", back_populates="actions")
