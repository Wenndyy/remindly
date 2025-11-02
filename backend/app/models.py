from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.sqlite import JSON
import os
import time

Base = declarative_base()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./remindly.db")
if DATABASE_URL.startswith("sqlite"):
    ArrayType = JSON
else:
    ArrayType = ARRAY

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
    updated_at = Column(Integer, default=lambda: int(time.time()))
    last_login = Column(Integer, nullable=True)
    failed_login_attempts = Column(Integer, default=0)

    # Profil
    profile_picture = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)

