# 🧠 Remindly — Authentication & Task Management System

---

## 📖 Deskripsi Proyek

**Remindly** adalah sistem berbasis web yang dirancang untuk membantu civitas akademika dalam:
- **Autentikasi dan Otorisasi** pengguna dengan JWT
- Mengatur dan memonitor kegiatan (Task Management)
- Mendapatkan pengingat otomatis berbasis **Artificial Intelligence (AI)**
- Mencegah jadwal bentrok antar kegiatan akademik
- **Role-Based Access Control** (User & Admin)

---

## 🎯 Tujuan Pengembangan

1. Menyediakan sistem autentikasi yang aman dengan JWT tokens
2. Implementasi role-based access 
3. Menyediakan platform web untuk pengingat kegiatan akademik
4. Meningkatkan efisiensi manajemen waktu dan tugas
5. Memanfaatkan AI untuk otomatisasi reminder
6. Mengintegrasikan seluruh aktivitas akademik dalam satu sistem terpusat

---

## 🚀 Fitur Utama

### 🔐 Authentication & Authorization
- ✅ User Registration dengan validasi
- ✅ Login dengan JWT (Access & Refresh Token)
- ✅ Password hashing menggunakan bcrypt
- ✅ Role-based access control (User/Admin)
- ✅ Password reset dengan secure token
- ✅ Logout dengan token invalidation
- ✅ Protected routes

### 📋 Task Management (Coming Soon)
- 📌 Create, Read, Update, Delete tasks
- 🔔 AI-powered reminders
- 📅 Schedule conflict detection
- 🏷️ Task categorization

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

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/register` | Register user baru | ❌ |
| `POST` | `/login` | Login dan dapatkan tokens | ❌ |
| `POST` | `/logout` | Logout user | ✅ |
| `POST` | `/refresh` | Refresh access token | ✅ |


### 🛡️ Protected Routes

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/user-dashoard` | User dashboard | User |
| `GET` | `/admin-dashboard` | Admin dashboard | Admin |

### 🏥 Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |

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
│   │   └── schemas.py           # Pydantic schemas
│   ├── .env                     # Environment variables (NOT in git)
│   ├── .env.example             # Template for .env
│   ├── .gitignore               # Git ignore rules
│   ├── requirements.txt         # Python dependencies
│   └── remindly.db              # SQLite database (auto-generated)
│
├── frontend/ (Coming Soon)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
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

- **Your Name** - Initial work - [@yourusername](https://github.com/yourusername)

Lihat juga daftar [contributors](https://github.com/yourusername/remindly/contributors) yang berpartisipasi dalam project ini.

---

## 🙏 Acknowledgments

- FastAPI Documentation
- SQLAlchemy Guide
- JWT Best Practices
- Python Security Guidelines

---

## 📞 Support & Contact

Untuk pertanyaan atau masalah:
- **Issues**: [GitHub Issues](https://github.com/yourusername/remindly/issues)
- **Email**: your.email@example.com
- **Discord**: Your Discord Server (optional)

---

## 📊 Project Status

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

**⭐ Jangan lupa beri star jika project ini bermanfaat!**