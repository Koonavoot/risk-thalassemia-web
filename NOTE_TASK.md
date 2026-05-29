# 📋 Update Log — 31 มีนาคม 2025

บันทึกการอัปเดตระบบ Thalassemia Prediction System

**วันที่:** 31 มีนาคม 2025  
**ผู้ดำเนินการ:** Antigravity AI Assistant  
**ประเภทการอัปเดต:** Feature Addition + Model Upgrade + Security

---

## 🎯 สรุปการอัปเดต 3 ส่วนหลัก

| ส่วน | รายละเอียด | สถานะ |
|------|-----------|-------|
| 1. ระบบ Login | JWT Auth + หน้า Login UI + Middleware ป้องกัน routes | ✅ เสร็จ |
| 2. เปลี่ยนโมเดล | XGBoost → Meta-Tabular Transformer | ✅ เสร็จ |
| 3. Database | เพิ่มตาราง `users` + default users | ✅ เสร็จ |

---

## ส่วนที่ 1 — ระบบ Login (JWT Authentication)

### 1.1 Backend — สร้างระบบ Auth

#### ไฟล์ใหม่: `backend/app/security.py`

```python
# ฟังก์ชันหลัก:
# - verify_password(plain, hashed) → bool        # ตรวจ bcrypt hash
# - get_password_hash(password) → str             # สร้าง bcrypt hash
# - create_access_token(data, expires_delta) → str # สร้าง JWT
# - decode_token(token) → dict                    # ถอดรหัส JWT
# - get_current_user(credentials, db) → User      # FastAPI Dependency
```

**Library ที่ใช้:** `python-jose[cryptography]` (JWT), `bcrypt` (password hashing)  
> หมายเหตุ: passlibมีปัญหากับ Python 3.12 จึงใช้ `bcrypt` module โดยตรงแทน

#### ไฟล์ใหม่: `backend/app/routes/auth.py`

```
Endpoints:
  POST /auth/login  → รับ username/password, คืน JWT access_token
  GET  /auth/me     → คืนข้อมูล user ที่ login อยู่ (ต้องมี token)
```

**ผลลัพธ์:**
```json
POST /auth/login → {"access_token": "eyJhbGciOiJIUzI1...", "token_type": "bearer"}
```

#### แก้ไข: `backend/app/models.py`

เพิ่ม SQLAlchemy model ใหม่:
```python
class User(Base):
    __tablename__ = "users"
    id: int (PK, autoincrement)
    username: str (unique)
    hashed_password: str
    is_active: bool (default True)
    created_at: datetime
```

#### แก้ไข: `backend/app/schemas.py`

เพิ่ม Pydantic schemas:
```python
class LoginRequest   # username + password
class TokenResponse  # access_token + token_type
class UserResponse   # id + username + is_active
```

#### แก้ไข: `backend/app/main.py`

```python
# เพิ่ม:
from app.routes import auth
app.include_router(auth.router)  # register /auth/* routes
```

#### แก้ไข: `backend/app/routes/predict.py` และ `history.py`

เพิ่ม JWT protection ทุก endpoint:
```python
# ก่อน (ไม่มี auth):
async def make_prediction(request: PredictionRequest): ...

# หลัง (มี JWT guard):
async def make_prediction(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user)   # ← เพิ่มบรรทัดนี้
): ...
```

**ผลลัพธ์:** เรียก `/predict` หรือ `/history` โดยไม่มี token → HTTP 401 Unauthorized

---

### 1.2 Frontend — หน้า Login + Middleware

#### ไฟล์ใหม่: `frontend/lib/auth.ts`

```typescript
getToken()          // อ่าน JWT จาก localStorage
setToken(token)     // บันทึก JWT ลง localStorage + cookie
removeToken()       // ลบ JWT (logout)
isLoggedIn()        // เช็คว่า login อยู่ไหม
authHeaders()       // คืน { Authorization: "Bearer <token>" }
```

> **ทำไมต้องมี cookie ด้วย?** Next.js Middleware อ่าน localStorage ไม่ได้ ต้องอ่านจาก cookie แทน

#### ไฟล์ใหม่: `frontend/middleware.ts`

```typescript
// ป้องกัน /predict และ /history
// ถ้าไม่มี JWT cookie → redirect ไป /login?from=<path เดิม>
export const config = {
  matcher: ["/predict/:path*", "/history/:path*"],
}
```

#### ไฟล์ใหม่: `frontend/app/login/page.tsx`

- UI ตาม Navy theme เดิม (bg-navy-600, slate-50)
- Form: username + password + show/hide password toggle
- POST `/api/auth/login` → เก็บ token → redirect ไป `/predict`
- แสดง error message ถ้า login ไม่สำเร็จ

#### แก้ไข: `frontend/components/Navbar.tsx`

```typescript
// เพิ่ม Login/Logout button ที่มุมขวา:
// - ถ้ายังไม่ได้ login → แสดงปุ่ม "Login" (navy blue)
// - ถ้า login แล้ว     → แสดงปุ่ม "Logout" (red)
// - กด Logout → removeToken() + redirect /login
```

#### แก้ไข: `frontend/app/predict/page.tsx`

```typescript
// เพิ่ม Authorization header ใน axios:
await axios.post("/api/predict", data, {
  headers: authHeaders(),   // ← { Authorization: "Bearer <token>" }
})
```

---

## ส่วนที่ 2 — เปลี่ยนโมเดล XGBoost → Meta-Tabular Transformer

### Model Files (ใน `model_selected/`)

| ไฟล์ | ขนาด | หน้าที่ |
|------|------|---------|
| `Meta_Tabular_final.pt` | 3.4 MB | PyTorch model weights |
| `transformer_configs.pkl` | 374 B | Model config (threshold=0.1, input_dim=10, etc.) |
| `transformer_scaler.pkl` | 1.16 KB | StandardScaler สำหรับ 8 numeric features |
| `transformer_label_encoders.pkl` | 794 B | LabelEncoder สำหรับ DCIP mother/father |
| `transformer_y_encoder.pkl` | 520 B | LabelEncoder สำหรับ output label |

**คำสั่ง copy ไฟล์:**
```bash
cp model_selected/* backend/model/
```

**ผลลัพธ์:** `Done` — ไฟล์ครบทั้ง 5 ใน `backend/model/`

### ตรวจสอบ Model Config

```python
# ผลจากการ inspect transformer_configs.pkl:
{
  'meta_config': {'d_block': 192, 'n_blocks': 2, 'attention_n_heads': 8, 'dropout': 0.1},
  'meta_input_dim': 10,
  'cat_cols': ['Dichrolophenol Indolephenol M', 'Dichrolophenol Indolephenol F'],
  'num_cols': ['Hb mother', 'Hct mother', 'MCH mother', 'MCV mother',
               'Hb father', 'Hct father', 'MCH father', 'MCV father'],
  'threshold': 0.1
}
```

### Rewrite: `backend/app/predictor.py`

เขียนใหม่ทั้งหมด — ประกอบด้วย:

1. **Architecture classes** (ต้องตรงกับตอน training):
   - `MultiHeadSelfAttention`
   - `TransformerBlock`
   - `MetaTabularTransformer`

2. **Preprocessing pipeline:**
   ```
   Input → StandardScaler (8 numeric) + LabelEncoder (2 DCIP) → Tensor → Model → Sigmoid → Threshold 0.1 → "Risk" / "No Risk"
   ```

3. **Feature order (สำคัญมาก ต้องตรงกับ training):**
   ```
   Numeric: Hb mother, Hct mother, MCH mother, MCV mother, Hb father, Hct father, MCH father, MCV father
   Categorical: Dichrolophenol Indolephenol M (mother), Dichrolophenol Indolephenol F (father)
   ```

**เปรียบเทียบ threshold:**
| โมเดล | Threshold |
|-------|-----------|
| XGBoost (เดิม) | 0.35 |
| Meta-Tabular Transformer (ใหม่) | **0.1** |

---

## ส่วนที่ 3 — Database: เพิ่มตาราง `users`

### แก้ไข: `backend/init.sql`

```sql
-- ตารางใหม่:
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Default users (bcrypt 12 rounds):
INSERT INTO users (username, hashed_password) VALUES
    ('admin',     '$2b$12$APsnTGopfS2VTwsvw6aZ8e2Zl76dvEGZ3NP2oILt1i6qFqHUnjP0G'),  -- ThalAdmin@2026
    ('doctor',    '$2b$12$gXFR3XhhRR34rSXCzONJBOdF2L8mOpysdTuCdNRYxcyfh8w6grXj2'),  -- ThalDoc@2026
    ('doctor_01', '$2b$12$KVLv5.4dL12u7JopAMAdU.kqd5huOHAsjgt2cCuTO66MtxqDyIV5y')   -- ThallasAI01.
ON CONFLICT (username) DO NOTHING;
```

**คำสั่ง generate hash (ใช้เมื่อต้องการเพิ่ม user ใหม่):**
```bash
cd backend
.venv/bin/python -c "import bcrypt; print(bcrypt.hashpw('รหัสของคุณ'.encode(), bcrypt.gensalt(12)).decode())"
```

### ไฟล์ใหม่: `backend/manage_users.py`

Script สำหรับจัดการ users (ต้องเชื่อมต่อ DB):
```bash
.venv/bin/python manage_users.py add <username> <password>
.venv/bin/python manage_users.py list
.venv/bin/python manage_users.py deactivate <username>
.venv/bin/python manage_users.py hash <password>
```

---

## ส่วนที่ 4 — Config Files ที่อัปเดต

### `backend/.env`

```env
# ก่อน:
DATABASE_URL=postgresql://postgres:czjsX1CYaalyyAXP@db.qvbuauikdtqlvgbauorl.supabase.co:5432/postgres
MODEL_PATH=model/model.pkl

# หลัง:
DATABASE_URL=postgresql://postgres:postgres@db:5432/thalassemia_db
MODEL_PATH=model/Meta_Tabular_final.pt
MODEL_ARTIFACTS_PATH=model
SECRET_KEY=change-me-in-production-use-a-random-32char-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### `backend/requirements.txt`

```diff
+ python-jose[cryptography]>=3.3.0
+ passlib[bcrypt]>=1.7.4
+ bcrypt>=4.0.0
+ numpy>=1.24.0
- xgboost>=3.2.0
- torch>=2.0.0   # ย้ายไปติดตั้งใน Dockerfile แทน
```

### `backend/Dockerfile`

```dockerfile
# เพิ่ม stage ติดตั้ง torch CPU-only (260MB แทน 2GB):
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt
```

### `docker-compose.yml`

```diff
  backend:
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/thalassemia_db
+     MODEL_PATH: model/Meta_Tabular_final.pt
+     MODEL_ARTIFACTS_PATH: model
+     SECRET_KEY: "change-this-to-a-random-secret-key-on-production"
+     ALGORITHM: HS256
+     ACCESS_TOKEN_EXPIRE_MINUTES: 480
    volumes:
-     - ./backend:/app         # ลบออก (security risk)
      - ./backend/model:/app/model

  frontend:
    build:
+     args:
+       - NEXT_PUBLIC_API_URL=http://119.59.103.14:8000   # VPS IP
    environment:
+     - NEXT_PUBLIC_API_URL=http://119.59.103.14:8000
```

---

## ✅ ตรวจสอบ Path ทั้งหมด

| จุด | Path | สถานะ |
|-----|------|-------|
| `predictor.py` โหลด model dir | `Path(__file__).parent.parent / "model"` → `/app/model/` ใน Docker | ✅ |
| `docker-compose.yml` volume | `./backend/model:/app/model` | ✅ |
| `DATABASE_URL` ใน `.env` | `postgresql://postgres:postgres@db:5432/thalassemia_db` | ✅ |
| `DATABASE_URL` ใน `docker-compose.yml` | ตรงกัน | ✅ |
| Model files ใน `backend/model/` | ครบ 5 ไฟล์ | ✅ |
| `init.sql` mount ใน docker-compose | `./backend/init.sql:/docker-entrypoint-initdb.d/init.sql` | ✅ |

---

## 🔑 Credentials

| Username | Password | Hash (bcrypt 12 rounds) |
|----------|----------|------------------------|
| `admin` | `ThalAdmin@2026` | `$2b$12$APsnTGopfS2VT...` |
| `doctor` | `ThalDoc@2026` | `$2b$12$gXFR3XhhRR34r...` |
| `doctor_01` | `ThallasAI01.` | `$2b$12$KVLv5.4dL12u7...` |

---

## 🚀 วิธี Deploy บน VPS (HostingLotus, IP: 119.59.103.14)

```bash
# SSH เข้า VPS
ssh root@119.59.103.14

# Pull code ใหม่
cd /path/to/Thalassemia_predict_project
git pull

# Deploy (ครั้งแรกช้า ~10-15 นาที เพราะ download torch CPU)
docker compose up -d --build

# ตรวจสอบสถานะ
docker compose ps

# เพิ่ม user doctor_01 (ถ้า DB มีข้อมูลเดิมอยู่ ไม่อยาก reset):
docker exec -it thalassemia_db psql -U postgres -d thalassemia_db -c \
"INSERT INTO users (username, hashed_password) VALUES
('doctor_01', '\$2b\$12\$KVLv5.4dL12u7JopAMAdU.kqd5huOHAsjgt2cCuTO66MtxqDyIV5y')
ON CONFLICT (username) DO NOTHING;"
```

**URLs หลัง Deploy:**
- เว็บหลัก: http://thalassemiaai.com (ผ่าน Nginx)
- Frontend: http://119.59.103.14:3000
- Backend API Docs: http://119.59.103.14:8000/docs

---

## ส่วนที่ 5 — การติดตั้ง HTTPS (SSL Certificate)

การเชื่อมต่อทั้งหมดถูกเข้ารหัสผ่าน HTTPS เพื่อความปลอดภัยของข้อมูล (รหัสผ่าน และ ข้อมูลสุขภาพ) โดยใช้ Let's Encrypt (Certbot) บน Nginx ของ AlmaLinux VPS.

### คำสั่งที่ใช้และความหมาย:

1. **ติดตั้ง EPEL Repository**
   ```bash
   dnf install -y epel-release
   ```
   **ความหมาย:** ติดตั้ง Extra Packages for Enterprise Linux (EPEL) repo เพราะแพ็กเกจอย่าง `certbot` ไม่มีใน repository มาตรฐานของ AlmaLinux
   **ผลลัพธ์:** ติดตั้งสำเร็จ ทำให้ OS รู้จักแพ็กเกจ certbot

2. **ติดตั้ง Certbot และ Nginx Plugin**
   ```bash
   dnf install -y certbot python3-certbot-nginx
   ```
   **ความหมาย:** ติดตั้งตัวจัดการ Certificate (Certbot) และ Plugin สำหรับให้ Certbot เข้าไปแก้ไขไฟล์คอนฟิกของ Nginx ให้รองรับ HTTPS อัตโนมัติ
   **ผลลัพธ์:** ติดตั้งเครื่องมือเสร็จสิ้น พร้อมออก SSL

3. **ขอและติดตั้ง SSL Certificate**
   ```bash
   certbot --nginx -d thalassemiaai.com -d www.thalassemiaai.com
   ```
   **ความหมาย:** 
   - `--nginx`: บอก Certbot ให้ตรวจสอบและแก้ไข Nginx config โดยอัตโนมัติ
   - `-d ...`: ระบุชื่อโดเมนที่ต้องการขอ SSL (ทั้งแบบไม่มี www และมี www)
   - *หมายเหตุ: ต้องกรอกอีเมลเพื่อรับการแจ้งเตือนจาก Let's Encrypt และกดยอมรับ Terms of Service (Y)*

   **ผลลัพธ์ที่ได้จากการรันคำสั่ง:**
   - ได้รับ Certificate บันทึกไว้ที่ `/etc/letsencrypt/live/thalassemiaai.com/fullchain.pem`
   - ได้รับ Private Key บันทึกไว้ที่ `/etc/letsencrypt/live/thalassemiaai.com/privkey.pem`
   - Certificate จะหมดอายุในวันที่ **28 มิถุนายน 2026** (90 วันหล้งจากออก)
   - Certbot បានสร้างระบบต่ออายุอัตโนมัติ (auto-renewal) ไว้ให้เป็นเบื้องหลังแล้ว
   - Certbot เข้าไปแก้ `/etc/nginx/conf.d/thalassemia.conf` ให้รองรับ port 443 (HTTPS) สำเร็จ
   - เว็บไซต์เข้าใช้งานผ่าน **https://thalassemiaai.com** ได้แล้ว

---

## ⚠️ สิ่งที่ต้องทำหลัง Deploy

- [x] ติดตั้ง HTTPS ด้วย Certbot (เสร็จแล้ว 31 มี.ค. 2026)
- [ ] เปลี่ยน `SECRET_KEY` ใน `docker-compose.yml` เป็นค่า random จริงๆ ก่อน go-live
- [x] ทดสอบ login ด้วย user ทั้ง 3 คน (เสร็จแล้ว)
- [x] ทดสอบ `/predict` endpoint (เสร็จแล้ว — แก้ architecture แล้ว)
- [x] ทดสอบว่าเข้า `/predict` โดยไม่ login → redirect ไป `/login` (proxy.ts ทำงานได้)
- [x] ตรวจสอบว่า Nginx ยัง proxy ถูกต้อง (port 80/443 → 3000, /api/ → 8000)

---

## 📋 Session 2 — 5 เมษายน 2026

อัปเดตและแก้ไขปัญหาหลัง deploy ครั้งแรก

### ปัญหาและวิธีแก้

| # | ปัญหา | ไฟล์ที่แก้ | วิธีแก้ |
|---|-------|-----------|--------|
| 1 | Frontend build error: `destination` does not start with `/` | `frontend/Dockerfile` | เพิ่ม `ARG NEXT_PUBLIC_API_URL` + `ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL` ก่อน `RUN npm run build` |
| 2 | Build error: middleware.ts กับ proxy.ts ขัดแย้งกัน | `frontend/middleware.ts` | ลบ `middleware.ts` เก็บไว้แค่ `proxy.ts` |
| 3 | Build error: `proxy.ts` ต้อง export function ชื่อ `proxy` | `frontend/proxy.ts` | เขียนใหม่ให้ export `function proxy()` แทน `function middleware()` |
| 4 | Login ขึ้น `{"error":"Internal Server Error"}` แทน 401 | `backend/app/main.py` | แยก `@app.exception_handler(HTTPException)` ออกมาก่อน global handler ทำให้ 401/403 ผ่านได้ถูกต้อง |
| 5 | Login ไม่ redirect หลังกด Sign In | `frontend/app/login/page.tsx` | เปลี่ยน `router.push(from)` เป็น `window.location.href = from` เพื่อ hard navigate |
| 6 | DB password ไม่ตรง (`FATAL: password authentication failed`) | VPS (ไม่มีไฟล์) | รัน `ALTER USER postgres WITH PASSWORD 'postgres'` ใน postgres container แล้ว `docker compose down -v` + `up --build` เพื่อแก้ถาวร |
| 7 | `Assess Risk` ขึ้น `Failed to load model` (architecture mismatch) | `backend/app/predictor.py` | เขียน `MetaTabularTransformer` ใหม่ให้ตรงกับ checkpoint: `input_proj` Linear(10→192), `nn.TransformerEncoder` (nhead=8, dim_ff=768), `LayerNorm+Linear(192,1)` |
| 8 | `Save to History` ขึ้น `THRESHOLD is not defined` | `backend/app/routes/predict.py` | แก้ `threshold_used=THRESHOLD` → `threshold_used=predictor.threshold` |
| 9 | History ขึ้น "Not authenticated" | `frontend/app/history/page.tsx` | เพิ่ม `Authorization: Bearer <token>` header ในทุก axios call |
| 10 | ไม่มีปุ่ม Delete ใน History | `frontend/app/history/page.tsx` | เพิ่มปุ่ม **Delete** (admin ลบจริงผ่าน `DELETE /api/history/:id`) และ **Hide** (user อื่นซ่อนใน session เท่านั้น) |
| 11 | ต้องแก้ DB password ซ้ำๆ เมื่อ restart | `backend/pg_hba.conf` | สร้างไฟล์ config เพื่อใช้ `trust` auth สำหรับ Docker Network (`172.16.0.0/12`) ถาวร โดยแก้ `docker-compose.yml` ให้ mount ค่านี้ไปใช้ |
| 12 | เปลี่ยน Patient ID ให้ไม่บังคับกรอก (Privacy) | `backend/app/schemas.py`, `models.py` | แก้ schema ให้รองรับ `Optional[str]`, เพิ่ม `nullable=True`, และแก้ frontend (Zod form validation) เป็น optional |
| 13 | ลบ Origin HTTP | `backend/app/main.py` | ลบ `http://thalassemiaai.com` ออกจาก CORS ป้องกัน traffic ที่ไม่เข้ารหัส |


### คำสั่งสำคัญที่ใช้วันนี้

```bash
# ตรวจสอบ model architecture จริงจาก checkpoint
docker exec thalassemia_backend python -c "
import torch
sd = torch.load('model/Meta_Tabular_final.pt', map_location='cpu')
for k, v in sd.items():
    print(f'{k}: {tuple(v.shape)}')"

# แก้ DB password รอบแรก (ชั่วคราว)
docker exec -it thalassemia_db bash -c "psql -U postgres -c \"ALTER USER postgres WITH PASSWORD 'postgres';\""
docker compose restart backend

# แก้ DB password ถาวร — ลบ volume แล้วสร้างใหม่
docker compose down -v
docker compose up -d --build

# Re-insert users หลังลบ volume (init.sql จะ seed อัตโนมัติ)
# ตรวจสอบ
docker exec -it thalassemia_db psql -U postgres -d thalassemia_db -c \
"SELECT id, username, is_active FROM users;"
```

### CORS อัปเดต (`backend/app/main.py`)

เพิ่ม HTTPS origins:
```python
allow_origins=[
    "http://localhost:3000",
    "http://thalassemiaai.com",
    "https://thalassemiaai.com",      # ← เพิ่ม
    "http://www.thalassemiaai.com",
    "https://www.thalassemiaai.com",   # ← เพิ่ม
    "http://119.59.103.14:3000"
]
```

### NEXT_PUBLIC_API_URL อัปเดต (`docker-compose.yml`)

```diff
- NEXT_PUBLIC_API_URL=http://119.59.103.14:8000
+ NEXT_PUBLIC_API_URL=http://backend:8000   # Docker internal hostname
```

Next.js server-side rewrite ใช้ internal URL ได้ ส่วน client-side axios ใช้ relative URL ผ่าน Nginx

### สรุปสถานะหลัง Session 2

| Feature | สถานะ |
|---------|-------|
| HTTPS (thalassemiaai.com) | ✅ ทำงาน |
| Login / Logout | ✅ ทำงาน |
| Assess Risk (Transformer Model) | ✅ ทำงาน |
| Save to History | ✅ ทำงาน |
| View History | ✅ ทำงาน |
| Delete (admin) / Hide (user) | ✅ ทำงาน |
| Auto-renew SSL | ✅ Certbot ตั้งไว้แล้ว |

## Session (29 May 2026) - Model Serialization & Next.js Race Condition

### 1. แก้ปัญหา Model Serialization & Compatibility (Scikit-Learn & PyTorch)
พบปัญหาโหลด Model ไม่ได้ในฝั่ง Backend (Production) เนื่องจาก 2 สาเหตุหลัก:

- **ปัญหา Scikit-Learn 1.8.0 vs 1.7.x:**
  การอัปเกรด `scikit-learn` เป็น 1.8.0 ทำให้ C-structure ของ Decision Tree เปลี่ยนแปลง ส่งผลให้ไฟล์ `.pkl` (Tree-based models) จากเวอร์ชันเก่า (1.7.2) ใช้งานไม่ได้
  *แนวทาง:* ต้องนำสคริปต์ `model_selected.py` ไปรันใหม่บนสภาพแวดล้อมที่เป็น `scikit-learn 1.8.0` เพื่อสร้างไฟล์ `.pkl` ออกมาใหม่

- **ปัญหา PyTorch Transformer Architecture Mismatch:**
  เกิดข้อผิดพลาด `Missing key(s) in state_dict: "cont_weight", "cont_bias"` ในโมเดล `FTTransformer`
  - *สาเหตุ:* โมเดลปัจจุบันบน Production (ไฟล์ `multi_predictor.py`) ใช้ `nn.Linear` ธรรมดาสำหรับ Continuous features แต่โมเดลชุดใหม่ที่เทรนด้วย `rtdl-revisiting-models` มีการใช้ **Numerical Embeddings** (`num_emb`) ทำให้โครงสร้างเลเยอร์และ state_dict ไม่ตรงกัน
  - *สิ่งที่ปรับปรุงแล้ว:* Refactor โค้ดใน `multi_predictor.py` ให้รองรับ Activation Function ที่เป็น Dynamic (GELU/ReGLU), แก้การตั้งค่า Dimension ของ FFN, และทำ State Dict Mapping
  - *งานถัดไป (Next Steps):* 
    1. ต้องแก้ไข `FTTransformer` ใน `multi_predictor.py` ให้รองรับ Numerical Embeddings อย่างสมบูรณ์ เพื่อให้โหลด state_dict ได้
    2. หรืออีกทางเลือกคือเพิ่ม `rtdl-revisiting-models` ลงใน `requirements.txt` ของ Backend เพื่อใช้ไลบรารีต้นฉบับไปเลยหากจำเป็น

### 2. วิเคราะห์และอธิบายปัญหา Next.js Middleware อ่าน Cookie ไม่เจอ
พบ Bug การเกิด **Race Condition** ฝั่ง Frontend ในจังหวะเปลี่ยนหน้าเว็บ:
- *ปัญหาที่เกิด:* การเซ็ตค่า URL ด้วย `window.location.href` ทำงานเร็วเกินไป และทำงานไปก่อนที่เบราว์เซอร์จะเขียน (Commit) คุกกี้ลง Storage เสร็จสมบูรณ์ ส่งผลให้ Request ที่ยิงไปยังเซิร์ฟเวอร์ไม่มี Header Cookie แนบไปด้วย
- *ผลกระทบ:* Middleware ของ Next.js ที่ทำงานอยู่ฝั่ง Server จึงอ่าน Cookie ไม่เจอ (มองว่าเป็น Unauthorized)
- *แนวทางแก้ไข:* ใช้ `setTimeout` หน่วงเวลาเล็กน้อย (ประมาณ 50-100ms) ก่อนที่จะสั่งเปลี่ยนหน้า เพื่อให้ Browser ทำการ commit cookie ให้เสร็จ หรือเปลี่ยนไปใช้ Next.js Router (`useRouter().push`) เพื่อจัดการ State/Navigation ได้ดีและปลอดภัยกว่า

### 3. แก้ปัญหา Login ไม่ได้ — Database Container หยุดทำงาน (29 พฤษภาคม 2026)

**ปัญหาที่พบ:** ไม่สามารถ Login ได้ผ่าน https://thalassemiaai.com/login โดยแสดงข้อผิดพลาด "Incorrect username or password"

**สาเหตุ:** Container ฐานข้อมูล PostgreSQL (`thalassemia_db`) หยุดทำงาน (Exited code 137 — ถูก Kill หรือ OOM) เมื่อ 3 วันก่อน
- Backend ไม่สามารถ Query ตาราง `users` ได้ ส่งผลให้ทุก Login Request ล้มเหลว
- Backend ยังทำงานอยู่แต่ถูก restart ซ้ำเมื่อ DB Connection timeout

**ขั้นตอนการแก้ไข:**
1. ตรวจสอบ `docker ps -a` พบว่า `thalassemia_db` อยู่ในสถานะ `Exited (137)`
2. ลอง start DB container เพียง container เดียว → Docker Network เสีย (containers อยู่คนละ network)
3. แก้ไขด้วยคำสั่ง:
   ```bash
   cd /root/risk-thalassemia-web
   docker compose down
   docker compose up -d
   ```
   เพื่อ recreate ทุก container พร้อม Network ใหม่
4. ตรวจสอบว่า DB healthy, Backend startup สำเร็จ (`Database tables created successfully`)
5. ทดสอบ Login ผ่าน API → สำเร็จ
6. ทดสอบ Login ผ่าน Website → redirect ไปหน้า `/predict` สำเร็จ

**User ใหม่ที่สร้าง:**
| Username    | Password       | Status |
|------------|----------------|--------|
| doctor_02  | ThalDoc@2026   | ✅ Active |

**รายชื่อ Users ทั้งหมดในระบบ:**
| ID | Username    | Active |
|----|------------|--------|
| 1  | admin       | ✅     |
| 2  | doctor      | ✅     |
| 3  | doctor_01   | ✅     |
| 4  | doctor_02   | ✅     |
