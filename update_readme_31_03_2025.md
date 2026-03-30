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

## ⚠️ สิ่งที่ต้องทำหลัง Deploy

- [ ] เปลี่ยน `SECRET_KEY` ใน `docker-compose.yml` เป็นค่า random จริงๆ ก่อน go-live
- [ ] ทดสอบ login ด้วย user ทั้ง 3 คน
- [ ] ทดสอบ `/predict` endpoint ว่าผล Transformer ถูกต้อง
- [ ] ทดสอบว่าเข้า `/predict` โดยไม่ login → redirect ไป `/login`
- [ ] ตรวจสอบว่า Nginx ยัง proxy ถูกต้อง (port 80 → 3000, /api/ → 8000)
