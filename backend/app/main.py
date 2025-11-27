from fastapi import FastAPI, Depends, HTTPException, Body, Request ,status
from sqlalchemy.orm import Session,joinedload
from app.database import SessionLocal, init_db
from app.models import User, Event,Project
from app.auth_utils import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user, verify_token
from .schemas import UserCreate, UserLogin, TokenResponse, ResetPasswordSchema, RegisterResponse, UserResponse, EventCreate, EventResponse,ProjectCreate, ProjectUpdate, ProjectResponse
import time, secrets, json  
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


init_db()
app = FastAPI(title="Full Auth API with Roles and Reset Token")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
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

@app.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.from_orm(current_user)

@app.post("/events", response_model=EventResponse)
async def create_event(
    payload: Optional[EventCreate] = None,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create event. Accepts direct EventCreate or wrapped { payload: {...} }.
    If end_date is omitted, it will be set equal to start_date (single-day event).
    If all_day is true, times are defaulted to 00:00 - 23:59 when missing.
    Returns EventResponse with optional project_name.
    """
    # Normalize input (fast-path if payload parsed by FastAPI)
    data_obj = None
    if payload is not None:
        data_obj = payload.dict()
    else:
        try:
            body_json = await request.json()
        except Exception:
            body_json = None

        if body_json is None:
            raise HTTPException(status_code=400, detail="No JSON body received")

        if isinstance(body_json, dict) and "payload" in body_json and isinstance(body_json["payload"], dict):
            data_obj = body_json["payload"]
        elif isinstance(body_json, dict):
            data_obj = body_json
        else:
            raise HTTPException(status_code=422, detail="Invalid JSON body for event")

        try:
            payload = EventCreate.parse_obj(data_obj)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Invalid body for EventCreate: {str(e)}")
        data_obj = payload.dict()

    # Ensure start_date exists
    if not payload.start_date:
        raise HTTPException(status_code=422, detail="start_date is required")

    # If end_date missing, set to start_date (single-day event)
    if not payload.end_date:
        payload.end_date = payload.start_date

    # If all_day, fill times if missing
    if payload.all_day:
        if not payload.start_time:
            payload.start_time = "00:00"
        if not payload.end_time:
            payload.end_time = "23:59"

    # Validate project_id ownership if provided (nullable allowed)
    project = None
    if payload.project_id is not None:
        project = db.query(Project).filter(Project.id == payload.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You cannot attach event to a project you don't own")

    # Create Event
    new_event = Event(
        title=payload.title,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        all_day=payload.all_day,
        guest=payload.guest,
        location=payload.location,
        project_id=payload.project_id,
        user_id=current_user.id,
    )

    db.add(new_event)
    try:
        db.commit()
        db.refresh(new_event)
        if new_event.project_id:
            db.refresh(new_event, ['project'])
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")
    event_with_relations = db.query(Event).options(
        joinedload(Event.user),
        joinedload(Event.project)
    ).filter(Event.id == new_event.id).first()

    resp = EventResponse.from_orm(event_with_relations).dict()
    resp["participants"] = len([g.strip() for g in (event_with_relations.guest or "").split(",") if g.strip()])
    resp["project_name"] = event_with_relations.project.name if event_with_relations.project else None
    resp["project_color"] = event_with_relations.project.color if event_with_relations.project else None
    
    # Tambahkan organizer info
    resp["organizer_id"] = event_with_relations.user.id
    resp["organizer_name"] = event_with_relations.user.full_name or event_with_relations.user.email
    resp["organizer_email"] = event_with_relations.user.email
    
    return resp


@app.get("/events")
def get_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Gunakan joinedload untuk mengambil data user dan project sekaligus
    events = db.query(Event).options(
        joinedload(Event.user),
        joinedload(Event.project)
    ).filter(Event.user_id == current_user.id).all()
    
    out = []
    for e in events:
        d = EventResponse.from_orm(e).dict()
        
        # Project info langsung dari relationship yang sudah di-join
        d["project_name"] = e.project.name if e.project else "No Project"
        d["project_color"] = e.project.color if e.project else "#337AF7"  # Default color

        # participants: hitung dari guest CSV
        if e.guest:
            d["participants"] = len([x for x in (e.guest or "").split(",") if x.strip()])
        else:
            d["participants"] = 0

        # Tambahkan organizer info
        d["organizer_id"] = e.user.id
        d["organizer_name"] = e.user.full_name or e.user.email
        d["organizer_email"] = e.user.email

        # Guest list
        d["guest_list"] = [g.strip() for g in (e.guest or "").split(",") if g.strip()] if e.guest else []

        # Time display
        if e.start_time and e.end_time:
            d["time_display"] = f"{e.start_time} - {e.end_time}"
        elif e.all_day:
            d["time_display"] = "All day"
        else:
            d["time_display"] = "No time specified"

        out.append(d)
    return out

# Edit Event
@app.put("/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    payload: Optional[EventCreate] = None,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update event. Accepts direct EventCreate or wrapped { payload: {...} }.
    Returns updated EventResponse with project info.
    """
    # Cari event yang akan diupdate
    event = db.query(Event).filter(Event.id == event_id, Event.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Normalize input (sama seperti create event)
    data_obj = None
    if payload is not None:
        data_obj = payload.dict()
    else:
        try:
            body_json = await request.json()
        except Exception:
            body_json = None

        if body_json is None:
            raise HTTPException(status_code=400, detail="No JSON body received")

        if isinstance(body_json, dict) and "payload" in body_json and isinstance(body_json["payload"], dict):
            data_obj = body_json["payload"]
        elif isinstance(body_json, dict):
            data_obj = body_json
        else:
            raise HTTPException(status_code=422, detail="Invalid JSON body for event")

        try:
            payload = EventCreate.parse_obj(data_obj)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Invalid body for EventCreate: {str(e)}")
        data_obj = payload.dict()

    # Validasi project_id ownership jika diubah
    project = None
    if payload.project_id is not None:
        project = db.query(Project).filter(Project.id == payload.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You cannot attach event to a project you don't own")

    # Update fields
    if payload.title is not None:
        event.title = payload.title
    if payload.description is not None:
        event.description = payload.description
    if payload.start_date is not None:
        event.start_date = payload.start_date
    if payload.end_date is not None:
        event.end_date = payload.end_date
    if payload.start_time is not None:
        event.start_time = payload.start_time
    if payload.end_time is not None:
        event.end_time = payload.end_time
    if payload.all_day is not None:
        event.all_day = payload.all_day
    if payload.guest is not None:
        event.guest = payload.guest
    if payload.location is not None:
        event.location = payload.location
    if payload.project_id is not None:
        event.project_id = payload.project_id

    # Jika all_day true, pastikan times ada
    if event.all_day:
        if not event.start_time:
            event.start_time = "00:00"
        if not event.end_time:
            event.end_time = "23:59"

    try:
        db.commit()
        # Refresh dengan join untuk mendapatkan project data
        event_with_relations = db.query(Event).options(
            joinedload(Event.user),
            joinedload(Event.project)
        ).filter(Event.id == event_id).first()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    # Build response dari data yang sudah di-join
    resp = EventResponse.from_orm(event_with_relations).dict()
    resp["participants"] = len([g.strip() for g in (event_with_relations.guest or "").split(",") if g.strip()])
    resp["project_name"] = event_with_relations.project.name if event_with_relations.project else None
    resp["project_color"] = event_with_relations.project.color if event_with_relations.project else None
    
    # Tambahkan organizer info
    resp["organizer_id"] = event_with_relations.user.id
    resp["organizer_name"] = event_with_relations.user.full_name or event_with_relations.user.email
    resp["organizer_email"] = event_with_relations.user.email
    
    return resp


# Delete Event
@app.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete event by ID. Only the event owner can delete.
    """
    event = db.query(Event).filter(Event.id == event_id, Event.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    try:
        db.delete(event)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    return

@app.get("/events/{event_id}", response_model=EventResponse)
def get_event_detail(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get detailed information for a specific event.
    Returns complete event data including project information.
    """
    # Gunakan joinedload untuk mengambil data user dan project sekaligus
    event = db.query(Event).options(
        joinedload(Event.user),
        joinedload(Event.project)
    ).filter(
        Event.id == event_id, 
        Event.user_id == current_user.id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Build detailed response
    resp = EventResponse.from_orm(event).dict()
    
    # Project info langsung dari relationship
    resp["project_name"] = event.project.name if event.project else None
    resp["project_color"] = event.project.color if event.project else None
    resp["project_id"] = event.project_id
    
    # Tambahkan informasi user/organizer
    resp["organizer_id"] = event.user.id
    resp["organizer_name"] = event.user.full_name or event.user.email
    resp["organizer_email"] = event.user.email
    
    # Parse guest list untuk detail view
    if event.guest:
        guest_raw = event.guest or ""
        resp["guest_list"] = [g.strip() for g in guest_raw.split(",") if g.strip()]
        resp["participants"] = len(resp["guest_list"])
    else:
        resp["guest_list"] = []
        resp["participants"] = 0
    
    # Format waktu untuk display
    if event.start_time and event.end_time:
        resp["time_display"] = f"{event.start_time} - {event.end_time}"
    elif event.all_day:
        resp["time_display"] = "All day"
    else:
        resp["time_display"] = "No time specified"
    
    return resp

# Get events by date range (optional enhancement)
@app.get("/events/range")
def get_events_by_date_range(
    start_date: str,
    end_date: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get events within a date range for the current user.
    Useful for calendar views.
    """
    events = db.query(Event).options(
    joinedload(Event.user),
    joinedload(Event.project)
).filter(Event.user_id == current_user.id).all()

    
    out = []
    for e in events:
        d = EventResponse.from_orm(e).dict()
        # project info
        proj = None
        proj = e.project

        d["project_name"] = proj.name if proj else None
        d["project_color"] = proj.color if proj else None

        # participants
        if e.guest:
            d["participants"] = len([x for x in (e.guest or "").split(",") if x.strip()])
        else:
            d["participants"] = 0

        # Tambahkan organizer info
        d["organizer_id"] = e.user.id
        d["organizer_name"] = e.user.full_name or e.user.email
        d["organizer_email"] = e.user.email

        out.append(d)
    return out


@app.get("/projects", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    projects = db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.created_at.desc()).all()
    results = []
    for p in projects:
        meeting_count = db.query(Event).filter(Event.project_id == p.id).count()
        resp = ProjectResponse.from_orm(p)
        resp.meetings = meeting_count
        results.append(resp)
    return results

# Create project
@app.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        body_json = await request.json()
    except Exception:
        body_json = None


    if body_json is None:
        raise HTTPException(status_code=400, detail="No JSON body received")

    if isinstance(body_json, dict) and "payload" in body_json and isinstance(body_json["payload"], dict):
        data = body_json["payload"]
    else:
        data = body_json

 
    try:
        payload = ProjectCreate.parse_obj(data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid body for ProjectCreate: {str(e)}")

    existing = db.query(Project).filter(Project.user_id == current_user.id, Project.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project name already exists")

    new_project = Project(
        name=payload.name,
        color=payload.color,
        meetings=0,
        user_id=current_user.id
    )
    db.add(new_project)
    try:
        db.commit()
        db.refresh(new_project)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    resp = ProjectResponse.from_orm(new_project)
    resp.meetings = 0
    return resp
    

@app.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, include_events: Optional[bool] = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Gunakan joinedload untuk mengambil project dengan events dan relations
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Jika include_events True, ambil events dengan semua relations
    events = []
    if include_events:
        events = db.query(Event).options(
            joinedload(Event.user),
            joinedload(Event.project)
        ).filter(Event.project_id == project.id).order_by(Event.start_date).all()

    # Build response
    resp = ProjectResponse.from_orm(project)
    resp.meetings = len(events)
    
    if include_events:
        event_responses = []
        for event in events:
            event_data = EventResponse.from_orm(event).dict()
            
            # Tambahkan project info dari relationship yang sudah di-join
            event_data["project_name"] = project.name  # Langsung dari project yang sudah diambil
            event_data["project_color"] = project.color  # Langsung dari project yang sudah diambil
            
            # Participants count
            if event.guest:
                event_data["participants"] = len([g.strip() for g in (event.guest or "").split(",") if g.strip()])
            else:
                event_data["participants"] = 0
            
            # Organizer info
            event_data["organizer_id"] = event.user.id
            event_data["organizer_name"] = event.user.full_name or event.user.email
            event_data["organizer_email"] = event.user.email
            
            # Guest list
            if event.guest:
                event_data["guest_list"] = [g.strip() for g in (event.guest or "").split(",") if g.strip()]
            else:
                event_data["guest_list"] = []
            
            # Time display
            if event.start_time and event.end_time:
                event_data["time_display"] = f"{event.start_time} - {event.end_time}"
            elif event.all_day:
                event_data["time_display"] = "All day"
            else:
                event_data["time_display"] = "No time specified"
            
            event_responses.append(EventResponse(**event_data))
        
        resp.events = event_responses
    
    return resp

@app.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        body_json = await request.json()
    except Exception:
        body_json = None

    if body_json is None:
        raise HTTPException(status_code=400, detail="No JSON body received")

    if isinstance(body_json, dict) and "payload" in body_json and isinstance(body_json["payload"], dict):
        data = body_json["payload"]
    else:
        data = body_json

    try:
        payload = ProjectUpdate.parse_obj(data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid body for ProjectUpdate: {str(e)}")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.name and payload.name != project.name:
        exists = db.query(Project).filter(Project.user_id == current_user.id, Project.name == payload.name).first()
        if exists:
            raise HTTPException(status_code=400, detail="Project name already exists")

    updated = False
    if payload.name is not None:
        project.name = payload.name
        updated = True
    if payload.color is not None:
        project.color = payload.color
        updated = True

    if not updated:
        db.refresh(project)
        resp = ProjectResponse.from_orm(project)
        resp.meetings = db.query(Event).filter(Event.project_id == project.id).count()
        return resp

    try:
        db.commit()
        db.refresh(project)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")


    resp = ProjectResponse.from_orm(project)
    resp.meetings = db.query(Event).filter(Event.project_id == project.id).count()
    return resp

@app.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        db.delete(project)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    return


@app.get("/projects/{project_id}/events", response_model=List[EventResponse])
def get_project_events(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    events = db.query(Event).filter(Event.project_id == project.id).order_by(Event.start_date).all()
    return [EventResponse.from_orm(e) for e in events]


@app.get("/users", response_model=List[UserResponse])
def list_users_for_suggestions(
    query: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    q = db.query(User)
    if query:
        q = q.filter(
            (User.email.ilike(f"%{query}%")) |
            (User.full_name.ilike(f"%{query}%"))
        )
    users = q.order_by(User.full_name).limit(limit).all()
    return [UserResponse.from_orm(u) for u in users]