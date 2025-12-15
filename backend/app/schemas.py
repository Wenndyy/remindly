from pydantic import BaseModel, EmailStr, constr
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str

class ResetPasswordSchema(BaseModel):
    reset_token: str
    new_password: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: int
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone_number: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    profile_picture: Optional[str] = None
    created_at: Optional[int] = None
    
    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone_number: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    profile_picture: Optional[str] = None

class RegisterResponse(BaseModel):
    msg: str
    user: UserResponse

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    start_date: str
    end_date: Optional[str] = None 
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    all_day: bool = False
    guest: Optional[str] = None
    location: Optional[str] = None
    project_id: Optional[int] = None 

    class Config:
        from_attributes = True

class EventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    start_date: str
    end_date: str
    start_time: Optional[str]
    end_time: Optional[str]
    all_day: bool
    guest: Optional[str]
    location: Optional[str]
    project_id: Optional[int]
    user_id: int
    created_at: Optional[int] = None
    updated_at: Optional[int] = None
    
    # Additional fields for response
    participants: Optional[int] = 0
    project_name: Optional[str] = None
    project_color: Optional[str] = None
    guest_list: Optional[List[str]] = None
    time_display: Optional[str] = None
    
    # Tambahkan field organizer
    organizer_id: Optional[int] = None
    organizer_name: Optional[str] = None
    organizer_email: Optional[str] = None
    
    class Config:
        from_attributes = True
        
class ProjectResponse(BaseModel):
    id: int
    name: str
    color: Optional[str] = None
    meetings: int  
    user_id: int
    created_at: Optional[int] = None
    events: Optional[List[EventResponse]] = None

    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    name: constr(strip_whitespace=True, min_length=1)
    color: Optional[str] = None

    class Config:
        from_attributes = True

class ProjectUpdate(BaseModel):
    name: Optional[constr(strip_whitespace=True, min_length=1)] = None
    color: Optional[str] = None
    meetings: Optional[int] = None

    class Config:
        from_attributes = True


# Notification Schemas
class NotificationResponse(BaseModel):
    """Response schema for notification data."""
    id: int
    user_id: int
    event_id: Optional[int] = None
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: Optional[int] = None
    expires_at: Optional[int] = None
    
    # Optional event details for context
    event_title: Optional[str] = None
    event_date: Optional[str] = None
    
    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    """Schema for creating a new notification."""
    event_id: Optional[int] = None
    title: str
    message: str
    notification_type: str = "reminder"
    expires_at: Optional[int] = None


class UpcomingEventSummary(BaseModel):
    """Schema for upcoming event with AI-generated summary."""
    event_id: int
    title: str
    start_date: str
    end_date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    days_until: int
    project_name: Optional[str] = None
    ai_reminder: Optional[str] = None  # AI-generated reminder message
    
    class Config:
        from_attributes = True


class UpcomingTasksResponse(BaseModel):
    """Response schema for AI-generated upcoming task reminders."""
    total_events: int
    upcoming_events: List[UpcomingEventSummary]
    ai_summary: Optional[str] = None  # Overall AI summary of upcoming tasks