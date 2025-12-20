# 🧠 Remindly 

---

## 📖 Deskripsi Proyek

**Remindly** adalah sistem manajemen jadwal dan kegiatan berbasis web yang dirancang untuk membantu civitas akademika dalam mengelola waktu secara efektif. Sistem ini mengintegrasikan **autentikasi aman berbasis JWT**, **manajemen event & project**, serta **Artificial Intelligence (Mistral LLM)** untuk:
- ✨ Smart reminder generation dalam Bahasa Indonesia
- 🤖 Schedule assistant dengan natural language processing
- 🔍 Conflict detection & alternative time suggestions
- 📧 Automated invitation email generation

---

## 🎯 Tujuan Pengembangan

1. ✅ Menyediakan sistem autentikasi yang aman dan scalable menggunakan JWT  
2. ✅ Mengimplementasikan role-based access control (User & Admin)
3. ✅ Menyediakan platform terpusat untuk manajemen jadwal dan kegiatan  
4. ✅ Meningkatkan efisiensi manajemen waktu dengan AI-powered features
5. ✅ Memanfaatkan Mistral AI untuk reminder, conflict detection, dan scheduling  
6. ✅ Mendukung kolaborasi melalui event invitation berbasis email  

---

## 🚀 Fitur Utama

### 🔐 Authentication & Authorization
- ✅ User Registration & Login dengan email validation
- ✅ JWT Access Token & Refresh Token
- ✅ Password hashing (bcrypt) dengan max 72 chars
- ✅ Role-based access control (User & Admin)
- ✅ Secure logout dengan token invalidation
- ✅ Password reset dengan secure token & expiry
- ✅ Failed login attempt tracking
---
### 👤 Profile Management
- ✅ View user profile (`GET /me`)
- ✅ Update profile information (name, DOB, phone, country, city)
- ✅ Upload profile picture dengan validasi format
- ✅ Support image formats: JPEG, PNG, GIF, WebP
- ✅ Unique filename generation untuk setiap upload
---
### 📅 Event, Calendar & Project
- ✅ **CRUD Event** dengan validasi lengkap
- ✅ **Event fields**: title, description, date range, time, all-day toggle
- ✅ **Guest management**: CSV-based guest list dengan participant count
- ✅ **Meeting type**: Online atau Onsite dengan location/link
- ✅ **Project linking**: Associate events dengan project
- ✅ **Date range queries** untuk calendar view
- ✅ **Event detail view** dengan complete information
- ✅ **Auto-set end_date** jika tidak diisi (single-day event)
- ✅ **All-day event handling** dengan default times
---
### 📂 Project Management
- ✅ **CRUD Project** dengan ownership validation
- ✅ **Project fields**: name, color, meeting count
- ✅ **Duplicate name prevention** per user
- ✅ **Project detail** dengan optional event list
- ✅ **Cascade delete** - events menjadi orphaned (project_id = NULL)
- ✅ **Meeting counter** - automatic count dari linked events
---
### 🔔 Notification System
- ✅ Get all notifications dengan pagination
- ✅ Get upcoming tasks **dengan AI-generated reminders**
- ✅ Unread notification counter
- ✅ Mark as read (single/bulk)
- ✅ Delete notification
- ✅ Notification types: reminder, urgent, summary, invitation
- ✅ **AI Summary** untuk today's schedule
---
### 🧠 AI-Powered Features (Mistral LLM)

#### 1. **AI Schedule Assistant** 🤖
```python
POST /ai/chat
```
- Natural language conversation dalam Bahasa Indonesia
- Understand user intent: lihat jadwal, buat jadwal, sapaan
- Generate structured schedule proposals dengan JSON
- Context-aware dengan user's existing events
- Clarifying questions ketika details kurang
- **Special feature**: Dapat memberikan alamat Yasir (Easter egg)

#### 2. **AI Reminder Generator** 📢
```python
GET /notifications/upcoming
```
- Generate personalized reminder untuk today's events
- Contextual messages berdasarkan: title, time, project, description
- Motivational tone dalam Bahasa Indonesia
- Emoji integration untuk engagement
- **Parallel processing** untuk performance
- **In-memory caching** (1 hour TTL)

#### 3. **AI Conflict Detection & Alternative Times** ⚡
```python
POST /ai/suggest-alternative-times
```
- Detect schedule conflicts otomatis
- Generate 2-3 alternative time slots
- Consider existing events pada hari yang sama
- **Current time awareness** - tidak suggest waktu yang sudah lewat
- Smart scheduling dalam jam kerja (07:00-22:00)
- Fallback algorithm jika AI unavailable

#### 4. **AI Invitation Email Generator** 📧
```python
POST /events/{event_id}/invite
```
- Generate formal invitation email dalam Bahasa Indonesia
- Different templates untuk Online vs Onsite meetings
- Include event details: date, time, location/link
- Professional formatting tanpa emoji
- RSVP confirmation request
- SMTP integration untuk actual sending
- Track sent/failed invitations

#### 5. **Natural Language Task Parser** 🗣️
```python
POST /ai/parse-task
```
- Parse user input menjadi structured event data
- Extract date, time, duration, recurrence patterns
- Ask clarifying questions ketika info kurang
- Support RRULE format untuk recurring events

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** — Modern Python web framework
- **SQLAlchemy** — ORM untuk database
- **JWT** — Token-based authentication
- **Bcrypt** — Password hashing
- **Pydantic** — Data validation
- **SQLite** — Database (development)

### AI & External Services
- **Mistral AI** (`mistral-small-latest`) — LLM untuk smart features
- **SMTP Server** — Email invitation delivery

### Frontend (Coming Soon)
- **Next.js** / **React** — Frontend framework
- **TailwindCSS** — Styling
- **Axios** — HTTP client
- **Lucide React** — Icon library

---

## 🧰 Cara Menjalankan Project

### 🔹 1. Clone Repository
```bash
git clone https://github.com/<USERNAME>/remindly.git
cd remindly
```

---

### 🔹 2. Setup Backend

#### Masuk ke folder backend:
```bash
cd backend
```

#### Buat virtual environment:
```bash
python -m venv venv
```

#### Aktifkan environment:

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

#### Install dependencies:
```bash
pip install -r requirements.txt
```

#### Setup Environment Variables:

Buat file `.env` di folder `backend/`:
```bash
cp .env.example .env
```

**Generate SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Edit file `.env` dan isi dengan konfigurasi:
```env
# Database
DATABASE_URL=sqlite:///./remindly.db

# JWT Configuration
SECRET_KEY=paste-generated-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Mistral AI Configuration
MISTRAL_API_KEY=your-mistral-api-key-here

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

#### Dapatkan Mistral API Key:
1. Daftar di [https://console.mistral.ai/](https://console.mistral.ai/)
2. Generate API key
3. Copy ke `.env` file

#### Setup Gmail SMTP (Opsional):
1. Enable 2-factor authentication di Google Account
2. Generate App Password di Google Security Settings
3. Gunakan App Password sebagai `SMTP_PASSWORD`


#### Jalankan server backend:
```bash
uvicorn app.main:app --reload
```

Backend aktif di:  
👉 **http://127.0.0.1:8000**

#### API Documentation:
- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

---

### 🔹 3. Setup Frontend

#### Persiapan (untuk development):
```bash
cd frontend
npm install
npm run dev
```

Frontend akan aktif di:  
👉 **http://localhost:3000**

---

## 📚 API Endpoints

### 🔐 Authentication

| Method | Endpoint           | Description                      | Auth Required |
| ------ | ------------------ | -------------------------------- | -------------- |
| POST   | `/register`        | Register new user                | ❌             |
| POST   | `/login`           | Login & get tokens               | ❌             |
| POST   | `/logout`          | Invalidate refresh token         | ❌             |
| POST   | `/refresh`         | Get new access token             | ❌             |
| POST   | `/request-reset`   | Request password reset token     | ❌             |

### 👤 Profile Management

| Method | Endpoint                    | Description           | Auth Required |
| ------ | --------------------------- | --------------------- | ------------- |
| GET    | `/me`                       | Get current user info | ✅             |
| PUT    | `/profile`                  | Update profile        | ✅             |
| POST   | `/upload-profile-picture`   | Upload profile photo  | ✅             |

### 📅 Event & Calendar

| Method | Endpoint               | Description                   | Auth Required |
| ------ | ---------------------- | ----------------------------- | ------------- |
| GET    | `/events`              | Get all user events           | ✅             |
| POST   | `/events`              | Create new event              | ✅             |
| GET    | `/events/{id}`         | Get event detail              | ✅             |
| PUT    | `/events/{id}`         | Update event                  | ✅             |
| DELETE | `/events/{id}`         | Delete event                  | ✅             |
| GET    | `/events/range`        | Get events by date range      | ✅             |
| POST   | `/events/{id}/invite`  | Send AI-generated invitations | ✅             |

### 📂 Project Management

| Method | Endpoint                 | Description                  | Auth Required |
| ------ | ------------------------ | ---------------------------- | ------------- |
| GET    | `/projects`              | Get all user projects        | ✅             |
| POST   | `/projects`              | Create new project           | ✅             |
| GET    | `/projects/{id}`         | Get project detail           | ✅             |
| PUT    | `/projects/{id}`         | Update project               | ✅             |
| DELETE | `/projects/{id}`         | Delete project               | ✅             |
| GET    | `/projects/{id}/events`  | Get all events in project    | ✅             |

### 🔔 Notification

| Method | Endpoint                     | Description                      | Auth Required |
| ------ | ---------------------------- | -------------------------------- | ------------- |
| GET    | `/notifications`             | Get all notifications            | ✅             |
| GET    | `/notifications/upcoming`    | Get today's AI-powered reminders | ✅             |
| GET    | `/notifications/count`       | Get unread count                 | ✅             |
| POST   | `/notifications`             | Create notification              | ✅             |
| PATCH  | `/notifications/{id}/read`   | Mark as read                     | ✅             |
| PATCH  | `/notifications/read-all`    | Mark all as read                 | ✅             |
| DELETE | `/notifications/{id}`        | Delete notification              | ✅             |

### 🧠 AI Features

| Method | Endpoint                         | Description                           | Auth Required |
| ------ | -------------------------------- | ------------------------------------- | ------------- |
| POST   | `/ai/chat`                       | Chat with schedule assistant          | ✅             |
| POST   | `/ai/suggest-alternative-times`  | Get alternative time suggestions      | ✅             |
| POST   | `/ai/parse-task`                 | Parse natural language to task        | ✅             |


---


## 📁 Struktur Project
```
remindly/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app & all endpoints
│   │   ├── config.py            # Settings from .env
│   │   ├── auth_utils.py        # JWT & password utilities
│   │   ├── database.py          # Database configuration
│   │   ├── models.py            # SQLAlchemy models (User, Event, Project, Notification)
│   │   ├── schemas.py           # Pydantic schemas & validation
│   │   ├── ai_service.py        # Mistral AI integration
│   │   └── email_service.py     # SMTP email sending
│   ├── uploads/                 # Profile pictures storage
│   ├── .env                     # Environment variables (NOT in git)
│   ├── .env.example             # Template for .env
│   ├── .gitignore               # Git ignore rules
│   ├── requirements.txt         # Python dependencies
│   └── remindly.db              # SQLite database (auto-generated)
│
├── frontend/                    # Coming soon
│   ├── app/
│   ├── components/
│   ├── contexts/
│   ├── public/
│   ├── package.json
│   └── tailwind.config.ts
│
├── docs/
│   └── sequence-diagrams/       # System flow diagrams
│
└── README.md
```

---

## ⚙️ Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | Database connection string | `sqlite:///./remindly.db` | ✅ |
| `SECRET_KEY` | JWT signing secret | - | ✅ |
| `ALGORITHM` | JWT algorithm | `HS256` | ✅ |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime (minutes) | `30` | ✅ |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime (days) | `7` | ✅ |



| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `MISTRAL_API_KEY` | Mistral AI API key | `sk-...` | ⚠️ AI features |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` | ⚠️ Email features |
| `SMTP_PORT` | SMTP port | `587` | ⚠️ Email features |
| `SMTP_USER` | SMTP username | `user@gmail.com` | ⚠️ Email features |
| `SMTP_PASSWORD` | SMTP password/app password | `****` | ⚠️ Email features |
| `EMAIL_FROM` | Sender email | `user@gmail.com` | ⚠️ Email features |
---

## 🔒 Security Features

- ✅ **JWT Authentication** dengan access & refresh tokens
- ✅ **Password hashing** dengan bcrypt (max 72 chars)
- ✅ **Secure token generation** untuk password reset
- ✅ **Role-based access control** (User & Admin)
- ✅ **Refresh token rotation** pada logout
- ✅ **Failed login tracking** dengan counter
- ✅ **Token expiration** dengan automatic validation
- ✅ **Environment-based secrets** (tidak hardcoded)
- ✅ **Bearer token validation** di setiap protected endpoint
- ✅ **User ownership validation** untuk CRUD operations
- ✅ **File upload validation** (type & size)
- ✅ **SQL injection prevention** via ORM

---


## 🗺️ Roadmap

### ✅ Phase 1: Core Authentication & Backend (COMPLETED)
- [x] User registration & login dengan JWT
- [x] Role-based access control (User & Admin)
- [x] Password reset functionality
- [x] Profile management dengan photo upload
- [x] API documentation (Swagger & ReDoc)

### ✅ Phase 2: Event & Project Management (COMPLETED)
- [x] CRUD operations untuk events
- [x] CRUD operations untuk projects
- [x] Event-Project linking
- [x] Guest list management
- [x] Date range queries
- [x] Meeting type (Online/Onsite)

### ✅ Phase 3: AI Integration (COMPLETED)
- [x] Mistral AI integration
- [x] AI-powered reminder generation
- [x] Schedule conflict detection
- [x] Alternative time suggestions
- [x] Natural language processing
- [x] AI chat assistant
- [x] Email invitation generation
- [x] In-memory caching system
- [x] Parallel AI processing

### ✅ Phase 4: Notification System (COMPLETED)
- [x] Notification CRUD
- [x] Upcoming tasks dengan AI
- [x] Unread counter
- [x] Bulk operations

### 🚧 Phase 5: Frontend Development (IN PROGRESS)
- [x] Next.js setup dengan TypeScript
- [x] Authentication pages (login, register, reset)
- [x] Dashboard dengan statistics
- [x] Calendar view (month, week, day)
- [x] Event & Project management UI
- [x] AI chat interface
- [x] Notification panel
- [x] Profile settings
- [x] Responsive design

---

## 📄 License

Project ini menggunakan **MIT License**.

---

## 👨‍💻 Author & Contributors

Lihat juga daftar [contributors](https://github.com/Wenndyy/remindly/contributors) yang berpartisipasi dalam project ini.

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- [Mistral AI](https://mistral.ai/) - LLM provider
- [SQLAlchemy](https://www.sqlalchemy.org/) - ORM framework
- [Pydantic](https://pydantic-docs.helpmanual.io/) - Data validation
- JWT Best Practices & Python Security Guidelines
- OpenAPI/Swagger Documentation

---

## 📊 Project Status

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---
**🚀 Happy Coding!**
