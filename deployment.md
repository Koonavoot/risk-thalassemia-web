# ThalassemiaAI — Production Deployment Guide

> เอกสารนี้ครอบคลุมขั้นตอนการ deploy ระบบขึ้น VPS จนถึงพร้อมให้บริการ
> อ้างอิงจาก `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, และ config จริงในโปรเจกต์

---

## PART 1 — Prerequisites (สิ่งที่ต้องเตรียม)

### 1.1 VPS Requirements

| รายการ | ขั้นต่ำที่ใช้งานได้ | แนะนำ |
|--------|-------------------|-------|
| RAM | **4 GB** | 4–8 GB |
| CPU | 2 vCPU | 4 vCPU |
| Storage | 20 GB | 40 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04/24.04 LTS |

> **สำคัญ:** backend ถูก configure ไว้ที่ `--workers 1` และ memory limit `2560M` เพราะ ML models
> (5 models รวม ~7.7 MB weights + PyTorch) ต้องโหลดพร้อมกัน การเพิ่ม worker จะทำให้ RAM ล้นและ OOM

### 1.2 Software ที่ต้องติดตั้งบน VPS

```bash
# 1. Docker Engine (ไม่ใช่ Docker Desktop)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER    # เพิ่ม user เข้า docker group
newgrp docker                    # ใช้งาน group ทันทีโดยไม่ต้อง logout

# 2. Docker Compose v2 (มาพร้อม Docker Engine แล้ว ตรวจสอบด้วย)
docker compose version           # ต้องได้ v2.x ขึ้นไป

# 3. Git
sudo apt-get install -y git

# 4. Nginx (สำหรับ reverse proxy + SSL)
sudo apt-get install -y nginx

# 5. Certbot (สำหรับ Let's Encrypt SSL)
sudo apt-get install -y certbot python3-certbot-nginx
```

### 1.3 ML Model Files ที่ต้องเตรียม

ไฟล์ model ไม่ได้อยู่ใน Git repository ต้อง copy ขึ้น VPS แยก:

```
backend/model/
├── model_treebase/
│   ├── RandomForest_full.pkl      (~1.8 MB)
│   ├── XGBoost_full.pkl           (~385 KB)
│   ├── NGBoost_full.pkl           (~707 KB)
│   ├── scaler.pkl
│   ├── label_encoders.pkl
│   └── y_encoder.pkl
└── model_transformer/
    ├── FT_Transformer_full.pt     (~2.4 MB)
    ├── Meta_Tabular_full.pt       (~2.4 MB)
    ├── transformer_configs.pkl
    ├── transformer_scaler.pkl
    ├── transformer_label_encoders.pkl
    └── transformer_y_encoder.pkl
```

**วิธี copy จาก local ไป VPS:**
```bash
# จาก machine local ของคุณ
scp -r ./backend/model user@YOUR_VPS_IP:~/Thalassemia_predict_project/backend/
```

### 1.4 Domain และ DNS

- ชี้ DNS A record ของ domain ไปที่ IP ของ VPS ก่อน
- รอ DNS propagate (~5-30 นาที) ก่อน issue SSL certificate

---

## PART 2 — Environment Variables

### 2.1 Backend — `backend/.env`

สร้างจาก `.env.example` และแก้ค่าดังนี้:

```bash
# ใน VPS
cd ~/Thalassemia_predict_project/backend
cp .env.example .env
nano .env
```

**เนื้อหาใน `.env` (production):**

```dotenv
# ─── Database ────────────────────────────────────────────────────────────────
# ตรงกับ POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB ใน docker-compose.yml
DATABASE_URL=postgresql://postgres:YOUR_STRONG_DB_PASSWORD@db:5432/thalassemia_db

# ─── ML Model Paths ──────────────────────────────────────────────────────────
# relative ต่อ /app ภายใน container (mount จาก ./backend/model:/app/model)
MODEL_PATH=model/Meta_Tabular_full.pt
MODEL_ARTIFACTS_PATH=model

# ─── JWT Authentication ───────────────────────────────────────────────────────
# สร้างด้วย: python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-64-char-random-hex-string-replace-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480    # 8 ชั่วโมง

# ─── PyTorch Thread Limiting (ประหยัด RAM บน 4GB VPS) ───────────────────────
OMP_NUM_THREADS=1
MKL_NUM_THREADS=1
```

**สร้าง SECRET_KEY ที่ปลอดภัย:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2.2 Docker Compose — ค่าที่ต้องแก้ใน `docker-compose.yml`

แก้ 3 จุดสำคัญก่อน deploy:

```yaml
# 1. PostgreSQL password (ต้องตรงกับ DATABASE_URL ใน .env)
db:
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: YOUR_STRONG_DB_PASSWORD    # ← แก้ตรงนี้
    POSTGRES_DB: thalassemia_db

# 2. Backend SECRET_KEY (ต้องตรงกับ .env)
backend:
  environment:
    DATABASE_URL: postgresql://postgres:YOUR_STRONG_DB_PASSWORD@db:5432/thalassemia_db
    SECRET_KEY: "your-64-char-random-hex-string"  # ← แก้ตรงนี้

# 3. Frontend API URL (ใช้ internal docker network ไม่ใช่ public domain)
frontend:
  build:
    args:
      - NEXT_PUBLIC_API_URL=http://backend:8000   # ← ปกติไม่ต้องแก้
```

> **ข้อควรระวัง:** `NEXT_PUBLIC_API_URL` ถูก bake เข้าไปใน Next.js bundle ตอน build
> ถ้าแก้ค่านี้ต้อง rebuild frontend image ใหม่ทุกครั้ง

### 2.3 ตาราง Environment Variables ทั้งหมด

| Variable | Service | จำเป็น | ค่าเริ่มต้น | หมายเหตุ |
|----------|---------|--------|------------|---------|
| `DATABASE_URL` | backend | ✅ | - | ต้องตรงกับ POSTGRES_* ของ db service |
| `SECRET_KEY` | backend | ✅ | (placeholder) | **ต้องเปลี่ยนก่อน production** |
| `ALGORITHM` | backend | ✅ | `HS256` | ไม่ต้องแก้ |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | backend | ✅ | `480` | 8 ชั่วโมง |
| `MODEL_PATH` | backend | ✅ | `model/Meta_Tabular_full.pt` | ไม่ต้องแก้ |
| `MODEL_ARTIFACTS_PATH` | backend | ✅ | `model` | ไม่ต้องแก้ |
| `OMP_NUM_THREADS` | backend | ✅ | `1` | ห้ามเพิ่ม (OOM risk) |
| `MKL_NUM_THREADS` | backend | ✅ | `1` | ห้ามเพิ่ม (OOM risk) |
| `POSTGRES_USER` | db | ✅ | `postgres` | ตรงกับ DATABASE_URL |
| `POSTGRES_PASSWORD` | db | ✅ | `postgres` | **ต้องเปลี่ยนก่อน production** |
| `POSTGRES_DB` | db | ✅ | `thalassemia_db` | ไม่ต้องแก้ |
| `NEXT_PUBLIC_API_URL` | frontend | ✅ | `http://backend:8000` | internal docker network |

---

## PART 3 — Build และ Run ระบบ

### 3.1 Clone Repository และ Setup

```bash
# 1. Clone repo
git clone <YOUR_REPO_URL> ~/Thalassemia_predict_project
cd ~/Thalassemia_predict_project

# 2. Copy model files (ถ้ายังไม่ได้ทำ — ดู PART 1.3)
# scp จาก local machine หรือ rsync

# 3. ตรวจสอบว่า model files ครบ
ls backend/model/model_treebase/
ls backend/model/model_transformer/

# 4. สร้างและแก้ .env
cp backend/.env.example backend/.env
nano backend/.env    # ← ใส่ค่าจริงทั้งหมด
```

### 3.2 Build Docker Images

```bash
cd ~/Thalassemia_predict_project

# Build ทุก service พร้อมกัน
docker compose build

# หรือ build แยก service (ถ้าแก้ code เฉพาะ service นั้น)
docker compose build backend
docker compose build frontend
```

> **หมายเหตุ:** backend build จะดาวน์โหลด PyTorch CPU-only (~260 MB) และ dependencies อื่นๆ
> ครั้งแรกอาจใช้เวลา 10-15 นาที ครั้งถัดไปเร็วขึ้นเพราะ Docker layer cache

### 3.3 Start All Services

```bash
# รันทุก service ใน background
docker compose up -d

# ดู logs ขณะ start
docker compose logs -f

# ตรวจสอบว่าทุก container รันได้
docker compose ps
```

**ลำดับการ Start (ตาม depends_on):**
```
db (PostgreSQL)
  └─→ backend (FastAPI + ML models)
        └─→ frontend (Next.js)
```

**Expected healthy state:**
```
NAME                    STATUS          PORTS
thalassemia_db          Up (healthy)    0.0.0.0:5432->5432/tcp
thalassemia_backend     Up (healthy)    0.0.0.0:8000->8000/tcp
thalassemia_frontend    Up              0.0.0.0:3000->3000/tcp
```

### 3.4 ตรวจสอบ Health

```bash
# Health check endpoints
curl http://localhost:8000/health        # {"status": "healthy"}
curl http://localhost:8000/db-health     # {"status": "healthy", "database": "connected"}

# Swagger API docs (เปิดใน browser)
open http://YOUR_VPS_IP:8000/docs
```

### 3.5 Setup User Accounts

หลัง DB container พร้อมแล้ว เพิ่ม/ตรวจสอบ users:

```bash
# ดู users ที่มีใน DB (จาก init.sql จะมี admin, doctor, doctor_01)
docker exec -it thalassemia_backend python manage_users.py list

# เพิ่ม user ใหม่
docker exec -it thalassemia_backend python manage_users.py add newdoctor SecurePass123

# เปลี่ยน password (ผ่าน hash + manual update)
docker exec -it thalassemia_backend python manage_users.py hash NewPassword123
# แล้ว copy hash ไปรัน SQL ใน database:
docker exec -it thalassemia_db psql -U postgres -d thalassemia_db \
  -c "UPDATE users SET hashed_password='\$2b\$12\$...' WHERE username='admin';"

# Deactivate user
docker exec -it thalassemia_backend python manage_users.py deactivate username
```

> **หมายเหตุ:** default passwords ใน `init.sql` ต้องเปลี่ยนก่อนใช้งาน production

---

## PART 4 — Nginx Reverse Proxy + SSL

### 4.1 Nginx Config

สร้างไฟล์ `/etc/nginx/sites-available/thalassemiaai`:

```nginx
server {
    listen 80;
    server_name thalassemiaai.com www.thalassemiaai.com;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API (FastAPI) — ถ้าต้องการ expose โดยตรง
    # location /api/ {
    #     proxy_pass http://localhost:8000/;
    # }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/thalassemiaai /etc/nginx/sites-enabled/
sudo nginx -t        # ตรวจสอบ syntax
sudo systemctl reload nginx
```

### 4.2 Issue SSL Certificate

```bash
# Issue certificate (ครั้งแรก)
sudo certbot --nginx -d thalassemiaai.com -d www.thalassemiaai.com

# ตรวจสอบ auto-renewal
sudo certbot renew --dry-run

# ถ้า certificate หมดอายุ (ต้อง renew ทุก 90 วัน)
sudo certbot renew
sudo systemctl reload nginx
```

---

## PART 5 — Update และ Maintenance

### 5.1 Deploy Code Update ใหม่

```bash
cd ~/Thalassemia_predict_project

# Pull latest code
git pull origin main

# Rebuild และ restart เฉพาะ service ที่เปลี่ยน
docker compose up -d --build backend    # ถ้าแก้ backend
docker compose up -d --build frontend   # ถ้าแก้ frontend
docker compose up -d --build           # ถ้าแก้ทั้งคู่
```

### 5.2 Database Migration (เพิ่ม column ใหม่)

```bash
# เข้า psql ของ container
docker exec -it thalassemia_db psql -U postgres -d thalassemia_db

# รัน ALTER TABLE (ตัวอย่าง)
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS new_column VARCHAR(200);
\d predictions   -- ตรวจสอบ structure
\q
```

### 5.3 ดู Logs

```bash
# ดู logs ทุก service
docker compose logs -f

# ดู logs เฉพาะ service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# ดู logs ย้อนหลัง 100 บรรทัด
docker compose logs --tail=100 backend
```

### 5.4 Restart Services

```bash
# Restart เฉพาะ service ที่มีปัญหา
docker compose restart backend

# Restart ทั้งหมด
docker compose restart

# Stop และ Start ใหม่ (แรงกว่า restart)
docker compose down && docker compose up -d
```

### 5.5 Monitor Memory (สำคัญมากบน 4GB VPS)

```bash
# ดู memory usage ทุก container
docker stats --no-stream

# ดู memory สรุป
free -h

# ถ้า backend ใช้ RAM เกิน 2.5GB → อาจมี memory leak
# ให้ restart: docker compose restart backend
```

**Expected memory usage (under normal load):**
| Container | Expected RAM |
|-----------|-------------|
| `thalassemia_db` | ~100–256 MB |
| `thalassemia_backend` | ~1.5–2.5 GB (หลัง models โหลด) |
| `thalassemia_frontend` | ~100–256 MB |
| OS + other | ~500 MB |
| **รวม** | **~2.2–3.5 GB** |

---

## PART 6 — Troubleshooting

### 6.1 Backend ไม่ Start (OOM / Model Loading Error)

```bash
# ดู error logs
docker compose logs backend

# สาเหตุที่พบบ่อย:
# 1. Model files หายไป → ตรวจสอบ backend/model/ ว่าไฟล์ครบ
ls backend/model/model_treebase/
ls backend/model/model_transformer/

# 2. RAM ไม่พอ → ดู memory
free -h
docker stats --no-stream

# 3. DATABASE_URL ผิด → ตรวจสอบ .env
cat backend/.env | grep DATABASE_URL
```

### 6.2 Database Connection Failed (500 Error)

```bash
# ตรวจสอบ DB health
docker exec -it thalassemia_db pg_isready -U postgres

# ดู DB logs
docker compose logs db

# ถ้า DB container crash (OOM) ให้ restart
docker compose restart db
# รอ ~10 วินาที แล้ว restart backend ด้วย
docker compose restart backend
```

### 6.3 Frontend ขึ้น SSL Error

```bash
# ตรวจสอบ certificate ยังไม่หมดอายุ
sudo certbot certificates

# Renew ถ้าหมดหรือใกล้หมด
sudo certbot renew
sudo systemctl reload nginx

# ตรวจสอบ nginx config
sudo nginx -t
sudo systemctl status nginx
```

### 6.4 Login ไม่ได้ (401 Error)

```bash
# ตรวจสอบว่า user มีอยู่
docker exec -it thalassemia_backend python manage_users.py list

# Reset password
docker exec -it thalassemia_backend python manage_users.py hash NewPassword123
# แล้ว copy hash ไปรัน SQL

# ตรวจสอบ SECRET_KEY ใน .env ตรงกัน
grep SECRET_KEY backend/.env
```

### 6.5 Model Prediction ช้ามาก (> 30 วินาที)

- ปกติ: ML model load ครั้งแรกหลัง backend start ใช้เวลา ~10-30 วินาที (lazy loading)
- request แรกช้า, request ถัดไปจะเร็วขึ้นเพราะ models cache อยู่ใน memory แล้ว
- ถ้าช้าทุก request → เช็ค `OMP_NUM_THREADS=1` ใน environment

---

## PART 7 — Checklist ก่อน Go-Live

```
PRE-DEPLOYMENT
[ ] ตรวจสอบ model files ครบทั้ง 12 ไฟล์
[ ] สร้าง SECRET_KEY ใหม่ (python3 -c "import secrets; print(secrets.token_hex(32))")
[ ] เปลี่ยน POSTGRES_PASSWORD เป็น strong password
[ ] ชี้ DNS A record ไปที่ VPS IP แล้ว

DEPLOYMENT
[ ] docker compose build สำเร็จ (no errors)
[ ] docker compose up -d สำเร็จ
[ ] docker compose ps แสดงทุก container เป็น Up (healthy)
[ ] curl http://localhost:8000/health ตอบ {"status": "healthy"}
[ ] curl http://localhost:8000/db-health ตอบ {"database": "connected"}

POST-DEPLOYMENT
[ ] Issue SSL certificate สำเร็จ (certbot)
[ ] https://thalassemiaai.com โหลดได้
[ ] Login ด้วย admin account สำเร็จ
[ ] ทำ prediction test ตัวอย่างแล้ว response ถูกต้อง
[ ] History page แสดงข้อมูลถูกต้อง
[ ] ตรวจสอบ memory: docker stats ไม่เกิน 3.5 GB รวม
```

---

*อ้างอิงไฟล์: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `backend/postgresql.conf`, `backend/pg_hba.conf`, `backend/init.sql`, `backend/manage_users.py`, `backend/app/multi_predictor.py`*
*อัปเดตล่าสุด: July 2026*
