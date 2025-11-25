from pydantic import BaseModel, EmailStr
from typing import Optional

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
    profile_picture: Optional[str] = None
    created_at: Optional[int] = None
    
    class Config:
        from_attributes = True

class RegisterResponse(BaseModel):
    msg: str
    user: UserResponse

