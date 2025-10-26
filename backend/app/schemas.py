from pydantic import BaseModel, constr

class UserCreate(BaseModel):
    username: str
    email: str
    password: constr(min_length=6, max_length=72)

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class ResetPasswordSchema(BaseModel):
    reset_token: str
    new_password: constr(min_length=6, max_length=72)
