from fastapi import FastAPI, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db
from app.models import User
from app.auth_utils import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user, verify_token
from .schemas import UserCreate, UserLogin, TokenResponse, ResetPasswordSchema, RegisterResponse, UserResponse
import time, secrets
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware

init_db()
app = FastAPI(title="Full Auth API with Roles and Reset Token")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Health check
@app.get("/health")
def health_check():
    return {"status": "Backend is running"}

@app.post("/register", response_model=RegisterResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(status_code=400, detail="email already exists")
        
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(status_code=400, detail="Email already exists")
        
        hashed_pw = hash_password(user.password)
        full_name = f"{user.first_name} {user.last_name}"
        
        new_user = User(
            email=user.email,
            hashed_password=hashed_pw,
            full_name=full_name
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return RegisterResponse(
            msg="User created successfully",
            user=UserResponse.from_orm(new_user)
        )
    except Exception as e:
        import traceback
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))


# Login
@app.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if db_user.is_active != 1:
        raise HTTPException(status_code=403, detail="User inactive")
    if not verify_password(user.password, db_user.hashed_password):
        db_user.failed_login_attempts += 1
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Reset failed attempts
    db_user.failed_login_attempts = 0
    db_user.last_login = int(time.time())
    
    access_token = create_access_token({"sub": db_user.email})
    refresh_token = create_refresh_token({"sub": db_user.email})
    db_user.refresh_token = refresh_token
    db.commit()
    
    return {"access_token": access_token, "refresh_token": refresh_token}

# Logout
@app.post("/logout")
def logout(refresh_token: str = Body(...), db: Session = Depends(get_db)):
    email = verify_token(refresh_token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user or db_user.refresh_token != refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not valid")
    db_user.refresh_token = None
    db.commit()
    return {"msg": f"User {email} has been logged out successfully"}

# Refresh token
@app.post("/refresh", response_model=TokenResponse)
def refresh_token(refresh_token: str = Body(...), db: Session = Depends(get_db)):
    email = verify_token(refresh_token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user or db_user.refresh_token != refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not valid")
    
    new_access_token = create_access_token({"sub": email})
    new_refresh_token = create_refresh_token({"sub": email})
    db_user.refresh_token = new_refresh_token
    db.commit()
    return {"access_token": new_access_token, "refresh_token": new_refresh_token}

# Request reset token
@app.post("/request-reset")
def request_reset(email: str = Body(...), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Email not found")
    
    reset_token = secrets.token_urlsafe(32)
    db_user.reset_token = reset_token
    db_user.reset_token_expiry = int(time.time()) + 3600
    db.commit()
    return {"msg": "Reset token generated", "reset_token": reset_token}

# Reset password
@app.post("/reset-password")
def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.reset_token == data.reset_token).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    if db_user.reset_token_expiry < int(time.time()):
        raise HTTPException(status_code=400, detail="Reset token expired")
    
    db_user.hashed_password = hash_password(data.new_password)
    db_user.reset_token = None
    db_user.reset_token_expiry = None
    db.commit()
    return {"msg": f"Password for {db_user.email} has been reset successfully"}

# User route
@app.get("/user-dashboard")
def user_dashboard(current_user: User = Depends(lambda: get_current_user(required_roles=["user"]))):
    return {"msg": f"Welcome to user dashboard, {current_user.email}"}


# Admin route
@app.get("/admin-dashboard")
def admin_dashboard(current_user: User = Depends(lambda: get_current_user(required_roles=["admin"]))):
    return {"msg": f"Welcome to admin dashboard, {current_user.email}"}
