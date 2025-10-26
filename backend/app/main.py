from fastapi import FastAPI, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db
from app.models import User
from app.auth_utils import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user, verify_token
from .schemas import UserCreate, UserLogin, TokenResponse, ResetPasswordSchema
import time, secrets

init_db()
app = FastAPI(title="Full Auth API with Roles and Reset Token")

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

# Register
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed_pw = hash_password(user.password)
    new_user = User(username=user.username, email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"msg": "User created successfully"}

# Login
@app.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
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
    
    access_token = create_access_token({"sub": db_user.username})
    refresh_token = create_refresh_token({"sub": db_user.username})
    db_user.refresh_token = refresh_token
    db.commit()
    
    return {"access_token": access_token, "refresh_token": refresh_token}

# Logout
@app.post("/logout")
def logout(refresh_token: str = Body(...), db: Session = Depends(get_db)):
    username = verify_token(refresh_token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    db_user = db.query(User).filter(User.username == username).first()
    if not db_user or db_user.refresh_token != refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not valid")
    db_user.refresh_token = None
    db.commit()
    return {"msg": f"User {username} has been logged out successfully"}

# Refresh token
@app.post("/refresh", response_model=TokenResponse)
def refresh_token(refresh_token: str = Body(...), db: Session = Depends(get_db)):
    username = verify_token(refresh_token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    db_user = db.query(User).filter(User.username == username).first()
    if not db_user or db_user.refresh_token != refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not valid")
    
    new_access_token = create_access_token({"sub": username})
    new_refresh_token = create_refresh_token({"sub": username})
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
    return {"msg": f"Password for {db_user.username} has been reset successfully"}

# Protected route
@app.get("/protected")
def protected_route(current_user: User = Depends(get_current_user)):
    return {"msg": f"Hello {current_user.username}, you have access!", "role": current_user.role}

# Admin route
@app.get("/admin-dashboard")
def admin_dashboard(current_user: User = Depends(lambda: get_current_user(required_roles=["admin"]))):
    return {"msg": f"Welcome to admin dashboard, {current_user.username}"}
