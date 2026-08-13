# ThalassemiaAI — System Architecture

> **เวอร์ชันเอกสาร:** July 2026  
> **ระบบ:** AI-powered Thalassemia Risk Screening System  
> **URL:** https://thalassemiaai.com

---

## 1. Tech Stack

### 🖥️ Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | ^16.1.6 |
| Language | TypeScript | ^5.3.3 |
| Styling | Tailwind CSS | ^3.4.1 |
| Form Validation | react-hook-form + Zod | ^7.49.3 / ^3.22.4 |
| HTTP Client | Axios | ^1.6.5 |
| Date Utility | date-fns | ^3.2.0 |
| Runtime | Node.js | 20-alpine (Docker) |

### ⚙️ Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | FastAPI | >=0.129.0 |
| Language | Python | 3.12 |
| ASGI Server | Uvicorn | >=0.40.0 |
| ORM | SQLAlchemy | >=2.0.46 |
| Data Validation | Pydantic v2 | >=2.12.5 |
| Auth | JWT (python-jose) + bcrypt | >=3.3.0 |
| DB Driver | psycopg2-binary | >=2.9.11 |

### 🤖 ML Models (5 Models)
| Model | Type | File |
|-------|------|------|
| FT-Transformer | Deep Learning (PyTorch) | `model_transformer/FT_Transformer_full.pt` |
| Meta-Tabular Transformer | Deep Learning (PyTorch) | `model_transformer/Meta_Tabular_full.pt` |
| XGBoost | Tree-based (Gradient Boosting) | `model_treebase/XGBoost_full.pkl` |
| Random Forest | Tree-based (Ensemble) | `model_treebase/RandomForest_full.pkl` |
| NGBoost | Tree-based (Probabilistic) | `model_treebase/NGBoost_full.pkl` |

**ML Libraries:** PyTorch >=2.0.0 · scikit-learn ==1.7.2 · XGBoost >=2.0.0 · NGBoost >=0.5.1 · NumPy >=1.24.0 · pandas >=2.0.0

### 🗄️ Database
| Component | Technology |
|-----------|-----------|
| Database | PostgreSQL 15 (Alpine) |
| Extension | pgcrypto (UUID generation) |
| Auth | pg_hba.conf (trust for internal Docker network) |

### 🐳 Infrastructure
| Component | Technology |
|-----------|-----------|
| Containerization | Docker + Docker Compose |
| Reverse Proxy / SSL | Nginx + Certbot (Let's Encrypt) |
| Hosting | HostingLotus Cloud VPS (4 GB RAM) |

---

## 2. Folder Structure

```
Thalassemia_predict_project/
│
├── docker-compose.yml          # Orchestrates 3 services: db, backend, frontend
│
├── backend/
│   ├── Dockerfile              # Multi-stage build: python:3.12-slim-bookworm
│   ├── requirements.txt        # Python dependencies
│   ├── init.sql                # Database schema initialization (tables + default users)
│   ├── pg_hba.conf             # PostgreSQL host-based auth config
│   ├── postgresql.conf         # PostgreSQL server config (memory tuning)
│   ├── manage_users.py         # CLI utility for managing user accounts
│   │
│   ├── model/
│   │   ├── model_transformer/  # PyTorch model files + scalers/encoders (pkl)
│   │   │   ├── FT_Transformer_full.pt
│   │   │   ├── Meta_Tabular_full.pt
│   │   │   ├── transformer_configs.pkl
│   │   │   ├── transformer_scaler.pkl
│   │   │   ├── transformer_label_encoders.pkl
│   │   │   └── transformer_y_encoder.pkl
│   │   └── model_treebase/     # Sklearn-compatible model files + scalers (pkl)
│   │       ├── XGBoost_full.pkl
│   │       ├── RandomForest_full.pkl
│   │       ├── NGBoost_full.pkl
│   │       ├── scaler.pkl
│   │       ├── label_encoders.pkl
│   │       └── y_encoder.pkl
│   │
│   └── app/
│       ├── main.py             # FastAPI app, CORS config, router registration
│       ├── database.py         # SQLAlchemy engine + session factory
│       ├── models.py           # ORM models: User, Prediction (SQLAlchemy)
│       ├── schemas.py          # Pydantic schemas: request/response validation
│       ├── security.py         # JWT creation/verification, bcrypt password hashing
│       ├── multi_predictor.py  # Loads all 5 models, runs ensemble prediction
│       ├── predictor.py        # (Legacy) single-model predictor
│       └── routes/
│           ├── auth.py         # POST /auth/login, GET /auth/me
│           ├── predict.py      # POST /predict, POST /predict/save
│           └── history.py      # GET /history, GET /history/{id}, DELETE /history/{id}
│
├── frontend/
│   ├── Dockerfile              # Multi-stage build: node:20-alpine
│   ├── package.json            # Node.js dependencies
│   ├── next.config.js          # Next.js config
│   ├── tailwind.config.ts      # Tailwind theme config
│   │
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout (Navbar + font setup)
│   │   ├── page.tsx            # Home / Landing page
│   │   ├── login/              # Login page
│   │   ├── predict/            # Risk assessment form page
│   │   ├── history/            # Shared prediction history page
│   │   └── contact/            # Contact information page
│   │
│   ├── components/
│   │   ├── Navbar.tsx          # Responsive navigation bar (desktop + mobile hamburger)
│   │   ├── FormInput.tsx       # Reusable form input component
│   │   ├── ResultCard.tsx      # Single-model result display card
│   │   └── MultiResultCard.tsx # Multi-model result display (5 models + summary)
│   │
│   ├── lib/
│   │   └── auth.ts             # Auth helpers (token storage, API client config)
│   │
│   └── public/
│       └── logo.png            # Application logo
│
└── scripts/                    # Development/research scripts (model training etc.)
```

---

## 3. การเชื่อมต่อระหว่าง Frontend, Backend และ Database

### 3.1 ภาพรวมการสื่อสาร

```
[User Browser]
      │  HTTPS (port 443)
      ▼
[Nginx + Certbot]          ← SSL termination, reverse proxy
      │
      ├──► Frontend (port 3000)   Next.js standalone server
      │
      └──► Backend  (port 8000)   FastAPI / Uvicorn
                │
                └──► Database (port 5432)  PostgreSQL 15
```

> **หมายเหตุ:** Nginx ไม่ได้อยู่ใน `docker-compose.yml` — รันบน VPS host โดยตรงเพื่อทำ SSL termination แล้ว proxy ต่อไปยัง container ที่ expose บน host port

---

### 3.2 Network ภายใน Docker Compose

Docker Compose สร้าง **internal bridge network** อัตโนมัติ ทำให้ container สื่อสารกันได้ผ่านชื่อ service:

```
docker-compose internal network
┌─────────────────────────────────────────────┐
│  thalassemia_frontend  :3000                │
│        │  NEXT_PUBLIC_API_URL=              │
│        │  http://backend:8000               │
│        ▼                                    │
│  thalassemia_backend   :8000                │
│        │  DATABASE_URL=                     │
│        │  postgresql://postgres@db:5432/... │
│        ▼                                    │
│  thalassemia_db        :5432                │
└─────────────────────────────────────────────┘
```

**dependency chain:** `frontend` depends_on `backend` → `backend` depends_on `db` (healthcheck: `pg_isready`)

---

### 3.3 Authentication Flow

```
Frontend                    Backend                    Database
   │                           │                           │
   │── POST /auth/login ───────►│                           │
   │   {username, password}     │── SELECT users WHERE ────►│
   │                           │   username = ?             │
   │                           │◄── User record ────────────│
   │                           │ verify_password (bcrypt)   │
   │◄── {access_token} ────────│                           │
   │    (JWT, 8 hour TTL)       │                           │
   │                           │                           │
   │── API request ────────────►│                           │
   │   Authorization: Bearer   │ decode_token()             │
   │   <jwt_token>             │ get_current_user()         │
   │                           │── SELECT users ───────────►│
   │                           │◄── User object ────────────│
   │◄── Response ──────────────│                           │
```

**JWT Config:** HS256 algorithm · 480 minutes (8 hours) TTL · `SECRET_KEY` จาก environment variable

---

### 3.4 Prediction Flow

```
Frontend (predict/page.tsx)
    │
    │ 1. กรอกข้อมูล parents (HB, HCT, MCV, MCH, DCIP) + ข้อมูลส่วนตัว (optional)
    │    Zod validation → reject ถ้า DOB เป็น Buddhist Era หรือ future date
    │
    │── POST /predict ──────────────────────────────────► Backend
    │   {father: ParentData, mother: ParentData}          │
    │                                                      │ multi_predictor.predict_all()
    │                                                      │ ├── FT-Transformer (PyTorch)
    │                                                      │ ├── Meta-Tabular (PyTorch)
    │                                                      │ ├── XGBoost
    │                                                      │ ├── Random Forest
    │                                                      │ └── NGBoost
    │◄── {models: [5 results], model_version} ────────────│
    │
    │ 2. แสดงผล MultiResultCard (5 model results + summary)
    │
    │── POST /predict/save ──────────────────────────────► Backend
    │   {father, mother, models: [results]}                │
    │                                                      │── INSERT INTO predictions ──► DB
    │                                                      │   (DOB, age nullable)
    │◄── PredictionResponse ───────────────────────────────│
```

**Ensemble Logic (ใน `/predict/save`):**
- **Summary result:** Majority vote (Risk ถ้า > 2.5 จาก 5 models โหวต Risk)
- **Summary probability:** Average ของ probability ทุก model
- **`models_json`:** เก็บผล raw JSON ของทุก model ไว้ใน DB column เดียว

---

### 3.5 History & Role-Based Access Control (RBAC)

```
GET /history
    │
    ├── is_admin = (username == "admin")
    ├── Query: SELECT ALL predictions (shared — ทุก user เห็น DB เดียวกัน)
    └── Response: PaginatedHistory { items, is_admin }

Frontend (history/page.tsx)
    ├── is_admin = true  → แสดงปุ่มลบ (permanent delete) + แสดง hidden rows (opacity 40%)
    └── is_admin = false → ปุ่มลบ = "hide locally" (client-side state เท่านั้น, ไม่ลบ DB)

DELETE /history/{id}
    ├── is admin  → db.delete(prediction) — ลบถาวร
    └── not admin → 403 Forbidden
```

---

### 3.6 Database Schema

#### Table: `users`
| Column | Type | Constraint |
|--------|------|-----------|
| id | SERIAL | PRIMARY KEY |
| username | VARCHAR(50) | UNIQUE, NOT NULL |
| hashed_password | VARCHAR(255) | NOT NULL (bcrypt 12 rounds) |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**Default accounts:** `admin`, `doctor`, `doctor_01`

#### Table: `predictions`
| Column | Type | Constraint |
|--------|------|-----------|
| id | UUID | PRIMARY KEY (gen_random_uuid()) |
| father_patient_id | VARCHAR(50) | nullable |
| father_first_name | VARCHAR(100) | nullable |
| father_last_name | VARCHAR(100) | nullable |
| father_dob | DATE | **nullable** (optional, privacy) |
| father_age | INT | **nullable**, CHECK >= 0 |
| father_hb | FLOAT | NOT NULL, CHECK > 0 |
| father_hct | FLOAT | NOT NULL, CHECK 0-100 |
| father_mcv | FLOAT | NOT NULL |
| father_mch | FLOAT | NOT NULL |
| father_dcip | BOOLEAN | NOT NULL |
| *(mother_* columns)* | *(same pattern)* | *(same constraints)* |
| model_version | VARCHAR(50) | NOT NULL |
| threshold_used | FLOAT | NOT NULL |
| probability | FLOAT | NOT NULL, CHECK 0-1 |
| result | VARCHAR(20) | NOT NULL, CHECK IN ('Risk','No Risk') |
| models_json | TEXT | nullable (JSON array of all 5 model results) |
| visit_datetime | TIMESTAMPTZ | DEFAULT NOW() |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**Indexes:** `father_patient_id`, `mother_patient_id`, `visit_datetime DESC`, `result`

---

### 3.7 API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | ❌ | Login, รับ JWT token |
| GET | `/auth/me` | ✅ | ข้อมูล user ที่ login อยู่ |
| POST | `/predict` | ✅ | ทำนายความเสี่ยง (5 models, ไม่บันทึก DB) |
| POST | `/predict/save` | ✅ | บันทึกผลการทำนายลง DB |
| GET | `/history` | ✅ | ดู history (shared, paginated, searchable) |
| GET | `/history/{id}` | ✅ | ดูรายละเอียด prediction (รวม blood values) |
| DELETE | `/history/{id}` | ✅ Admin only | ลบ record ถาวร |
| GET | `/health` | ❌ | Backend health check |
| GET | `/db-health` | ❌ | Database connection health check |
| GET | `/docs` | ❌ | Swagger UI (FastAPI auto-generated) |

---

## 4. Memory & Resource Management

เนื่องจาก VPS มี RAM เพียง **4 GB** ระบบมีการจำกัด resource ดังนี้:

| Service | Memory Limit | Memory Reserved |
|---------|-------------|-----------------|
| `db` (PostgreSQL) | 256 MB | 64 MB |
| `backend` (FastAPI + 5 ML models) | 2,560 MB | 512 MB |
| `frontend` (Next.js) | 256 MB | 64 MB |

**Backend optimizations:**
- ใช้ PyTorch **CPU-only** build (ลด image size ~1.8 GB)
- รัน Uvicorn **1 worker** เท่านั้น (หลาย worker = โหลด model ซ้ำทุก process)
- ตั้ง `OMP_NUM_THREADS=1`, `MKL_NUM_THREADS=1`, `TORCH_NUM_THREADS=1`

---

## 5. Deployment Workflow

```bash
# บน VPS (SSH เข้าแล้ว)
cd /root/risk-thalassemia-web   # หรือ path ที่ clone ไว้

# Pull latest changes
git pull origin main

# Build และ restart containers
docker compose up -d --build

# ตรวจสอบ logs
docker compose logs backend --tail=50
docker compose logs frontend --tail=20

# ต่ออายุ SSL (ทำทุก 2-3 เดือน หรือตั้ง cron job)
certbot renew --force-renewal
nginx -s reload
```

---

*เอกสารนี้สร้างโดย Antigravity — อิงจากการสแกนโค้ดจริงในโปรเจกต์ (July 2026)*
