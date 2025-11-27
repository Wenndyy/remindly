from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import time

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    refresh_token = Column(String, nullable=True)
    
    # Reset password
    reset_token = Column(String, nullable=True)
    reset_token_expiry = Column(Integer, nullable=True)

    # Role & status
    role = Column(String, default="user") 
    is_active = Column(Integer, default=1) 

    # Metadata
    created_at = Column(Integer, default=lambda: int(time.time()))
    updated_at = Column(Integer, default=lambda: int(time.time()), onupdate=lambda: int(time.time()))
    last_login = Column(Integer, nullable=True)
    failed_login_attempts = Column(Integer, default=0)

    # Profil
    profile_picture = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)

    # Relationships
    events = relationship("Event", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    color = Column(String, nullable=True)
    meetings = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(Integer, default=lambda: int(time.time()))

    user = relationship("User", back_populates="projects")
    events = relationship("Event", back_populates="project", cascade="all, delete-orphan")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    start_time = Column(String, nullable=True)
    end_time = Column(String, nullable=True)
    all_day = Column(Boolean, default=False)
    guest = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(Integer, default=lambda: int(time.time()))
    updated_at = Column(Integer, default=lambda: int(time.time()), onupdate=lambda: int(time.time()))

    project = relationship("Project", back_populates="events")
    user = relationship("User", back_populates="events")