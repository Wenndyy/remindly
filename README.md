# 🧠 Remindly 

---

## 📖 Deskripsi Proyek

**Remindly** adalah sistem manajemen jadwal dan kegiatan berbasis web yang dirancang untuk membantu civitas akademika dalam mengelola waktu secara efektif. Sistem ini mengintegrasikan **autentikasi aman**, **manajemen event & project**, serta **Artificial Intelligence (AI)** untuk reminder, deteksi konflik jadwal, dan asisten penjadwalan.

---

## 🎯 Tujuan Pengembangan

1. Menyediakan sistem autentikasi yang aman dan scalable menggunakan JWT  
2. Mengimplementasikan role-based access control  
3. Menyediakan platform terpusat untuk manajemen jadwal dan kegiatan  
4. Meningkatkan efisiensi manajemen waktu pengguna  
5. Memanfaatkan AI untuk reminder, conflict detection, dan scheduling  
6. Mendukung kolaborasi melalui event invitation berbasis email  


---

## 🚀 Fitur Utama

### 🔐 Authentication & Authorization
- User Registration & Login
- JWT Access Token & Refresh Token
- Password hashing (bcrypt)
- Role-based access (User & Admin)
- Logout & token invalidation
- Password reset dengan secure token

---

### 📅 Event, Calendar & Project
- CRUD Event (Calendar)
- CRUD Project
- Event berdasarkan tanggal & rentang waktu
- Guest list & event invitation
- Upload foto profil user

---

### 🔔 Notification
- Notifikasi event
- AI-generated reminder
- Read / unread notification
- Notification counter

---

### 🧠 Artificial Intelligence (AI)
- AI Schedule Assistant (Chat)
- AI Schedule Conflict Detection
- AI Alternative Time Suggestions
- AI Reminder Generator
- Natural Language Task Parsing
- AI-generated Email Invitation

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** — Modern Python web framework
- **SQLAlchemy** — ORM untuk database
- **JWT** — Token-based authentication
- **Bcrypt** — Password hashing
- **Pydantic** — Data validation
- **SQLite** — Database (development)

### Frontend (Coming Soon)
- **Next.js** / **React** — Frontend framework
- **TailwindCSS** — Styling
- **Axios** — HTTP client

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
DATABASE_URL=sqlite:///./remindly.db
SECRET_KEY=paste-generated-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

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

### 🔹 3. Setup Frontend (Coming Soon)

Frontend sedang dalam tahap pengembangan.

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

| Method | Endpoint    | Description   |
| ------ | ----------- | ------------- |
| POST   | `/register` | Register user |
| POST   | `/login`    | Login         |
| POST   | `/logout`   | Logout        |
| POST   | `/refresh`  | Refresh token |



### 📅 Event & Calendar

| Method | Endpoint              |
| ------ | --------------------- |
| GET    | `/events`             |
| POST   | `/events`             |
| PUT    | `/events/{id}`        |
| DELETE | `/events/{id}`        |
| POST   | `/events/{id}/invite` |


### 🔔 Notification

| Method | Endpoint                   |
| ------ | -------------------------- |
| GET    | `/notifications`           |
| GET    | `/notifications/upcoming`  |
| PATCH  | `/notifications/{id}/read` |
| PATCH  | `/notifications/read-all`  |

### 🧠 AI

| Method | Endpoint                        |
| ------ | ------------------------------- |
| POST   | `/ai/chat`                      |
| POST   | `/ai/suggest-alternative-times` |
| POST   | `/ai/parse-task`                |


---


## 📁 Struktur Project
```
remindly/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app & routes
│   │   ├── config.py            # Settings from .env
│   │   ├── auth_utils.py        # JWT & password utilities
│   │   ├── database.py          # Database configuration
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── ai_service.py
│   │   ├── email_service.py
│   │   └── schemas.py           # Pydantic schemas
│   ├── .env                     # Environment variables (NOT in git)
│   ├── .env.example             # Template for .env
│   ├── .gitignore               # Git ignore rules
│   ├── requirements.txt         # Python dependencies
│   └── remindly.db              # SQLite database (auto-generated)
│
├── frontend/
│   ├── app/
│   ├── contexts/
│   ├── public/
│   ├── package.json
│   └── tailwind.config.ts
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

---

## 🔒 Security Features

- ✅ JWT token-based authentication
- ✅ Password hashing dengan bcrypt
- ✅ Secure token generation untuk password reset
- ✅ Role-based access control (RBAC)
- ✅ Refresh token rotation
- ✅ Failed login attempt tracking
- ✅ Token expiration & validation
- ✅ Environment-based secrets (tidak hardcoded)

---


## 🗺️ Roadmap

### ✅ Phase 1: Authentication (Current)
- [x] User registration & login
- [x] JWT authentication
- [x] Role-based access control
- [x] Password reset functionality
- [x] API documentation

### 🚧 Phase 2: Task Management (In Progress)
- [ ] CRUD operations untuk tasks
- [ ] Task categories & tags
- [ ] Due date & priority
- [ ] Task assignment

### 📅 Phase 3: AI Integration (Planned)
- [ ] AI-powered reminder suggestions
- [ ] Schedule conflict detection
- [ ] Smart notifications
- [ ] Natural language task creation

### 🎨 Phase 4: Frontend (Planned)
- [ ] Next.js/React frontend
- [ ] Responsive design
- [ ] Dashboard & analytics
- [ ] Real-time notifications

---



## 📄 License

Project ini menggunakan **MIT License**.

---

## 👨‍💻 Author & Contributors

- **Wendy Noer Isnaeni** - Initial work - [@yourusername](https://github.com/Wenndyy)

Lihat juga daftar [contributors](https://github.com/Wenndyy/remindly/contributors) yang berpartisipasi dalam project ini.

---

## 🙏 Acknowledgments

- FastAPI Documentation
- SQLAlchemy Guide
- JWT Best Practices
- Python Security Guidelines

---



## 📊 Project Status

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

**⭐ Jangan lupa beri star jika project ini bermanfaat!**
