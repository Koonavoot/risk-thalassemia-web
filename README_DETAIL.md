# Thalassemia Prediction System - Technical Documentation

เอกสารรายละเอียดทางเทคนิคของระบบทำนายความเสี่ยงโรคธาลัสซีเมีย

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                           │
│                           http://localhost:3000                         │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 14)                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  App Router                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │   Home   │  │ Predict  │  │ History  │  │ Contact  │        │   │
│  │  │ page.tsx │  │ page.tsx │  │ page.tsx │  │ page.tsx │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Components: Navbar.tsx │ FormInput.tsx │ ResultCard.tsx        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Styling: TailwindCSS + globals.css (Navy Theme)                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ HTTP Requests (axios)
                                  │ /api/* → Proxy to Backend
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI)                               │
│                        http://localhost:8000                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  main.py - FastAPI Application                                   │   │
│  │  ├── CORS Middleware                                             │   │
│  │  ├── Routes: /predict, /history                                  │   │
│  │  └── Health Check: /                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  routes/                                                         │   │
│  │  ├── predict.py  →  POST /predict, POST /predict/save           │   │
│  │  └── history.py  →  GET /history, GET /history/{id}             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  predictor.py - XGBoost Model Inference                         │   │
│  │  ├── Load model.pkl                                              │   │
│  │  ├── Feature engineering                                         │   │
│  │  └── Threshold: 0.35 → Risk/No Risk                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ SQLAlchemy ORM
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (PostgreSQL 15)                        │
│                          localhost:5432                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Database: thalassemia_db                                        │   │
│  │  Table: predictions                                              │   │
│  │  ├── id (UUID, PK)                                               │   │
│  │  ├── father_* (patient info + blood values)                     │   │
│  │  ├── mother_* (patient info + blood values)                     │   │
│  │  ├── result (Risk/No Risk)                                       │   │
│  │  ├── probability (float)                                         │   │
│  │  └── visit_datetime, created_at                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure (Detailed)

```
Thalassemia_predict_project/
│
├── backend/                          # 🐍 FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app entry point
│   │   ├── database.py               # SQLAlchemy connection & session
│   │   ├── models.py                 # SQLAlchemy ORM models
│   │   ├── schemas.py                # Pydantic validation schemas
│   │   ├── predictor.py              # ML model loading & inference
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── predict.py            # /predict endpoints
│   │       └── history.py            # /history endpoints
│   │
│   ├── model/
│   │   └── model.pkl                 # Trained XGBoost model
│   │
│   ├── .env                          # Environment variables
│   ├── .env.example                  # Environment template
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Docker build instructions
│   └── init.sql                      # Database schema
│
├── frontend/                         # ⚛️ Next.js Frontend
│   ├── app/                          # App Router (Next.js 14)
│   │   ├── layout.tsx                # Root layout with Navbar
│   │   ├── page.tsx                  # Home page (/)
│   │   ├── globals.css               # Global styles + Tailwind
│   │   ├── predict/
│   │   │   └── page.tsx              # Prediction form (/predict)
│   │   ├── history/
│   │   │   └── page.tsx              # History table (/history)
│   │   └── contact/
│   │       └── page.tsx              # Contact page (/contact)
│   │
│   ├── components/
│   │   ├── Navbar.tsx                # Navigation bar + Logo
│   │   ├── FormInput.tsx             # Reusable form input
│   │   └── ResultCard.tsx            # Prediction result display
│   │
│   ├── public/                       # Static assets
│   │   ├── doctor.png                # Doctor illustration
│   │   └── logo.png                  # Logo image
│   │
│   ├── next.config.js                # Next.js configuration
│   ├── tailwind.config.ts            # Tailwind CSS configuration
│   ├── package.json                  # Node.js dependencies
│   ├── tsconfig.json                 # TypeScript configuration
│   └── Dockerfile                    # Docker build instructions
│
├── docker-compose.yml                # 🐳 Docker orchestration
└── README.md                         # Quick start guide
```

---

## 🔧 Configuration Files

### 1. Backend Environment (`.env`)

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/thalassemia_db

# Model Configuration  
MODEL_PATH=model/model.pkl
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/thalassemia_db` |
| `MODEL_PATH` | Path to XGBoost model file | `model/model.pkl` |

### 2. Next.js Configuration (`next.config.js`)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

**สิ่งที่ config ทำ:**
- Proxy requests จาก `/api/*` ไปยัง Backend `http://localhost:8000/*`
- เช่น Frontend เรียก `/api/predict` → Backend รับที่ `/predict`

### 3. Tailwind Configuration (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#1e3a8a',  // Primary navy blue
          700: '#1e2952',
          800: '#0f172a',  // Dark navy
          900: '#020617',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### 4. Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: thalassemia_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: thalassemia_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql

  backend:
    build: ./backend
    container_name: thalassemia_backend
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/thalassemia_db
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./frontend
    container_name: thalassemia_frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

volumes:
  postgres_data:
```

---

## 🔄 Data Flow

### Prediction Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. USER fills form on /predict page                                  │
│    - Father's blood values (Hb, Hct, MCV, MCH, DCIP)                │
│    - Mother's blood values (Hb, Hct, MCV, MCH, DCIP)                │
│    - Patient info (ID, name, age, DOB)                               │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ Form Submit
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND validates with Zod schema                                │
│    - Required fields check                                           │
│    - Numeric range validation (Hb > 0, Hct 0-100)                   │
│    - Date validation (DOB must be in past)                          │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ POST /api/predict/save
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 3. BACKEND receives request                                          │
│    routes/predict.py:                                                │
│    - Pydantic validates request body                                 │
│    - Calls predictor.predict()                                       │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 4. PREDICTOR runs inference                                          │
│    predictor.py:                                                     │
│    - Prepares feature array in correct order:                        │
│      [Hb_m, Hb_f, Hct_m, Hct_f, MCV_m, MCV_f,                       │
│       MCH_m, MCH_f, DCIP_m, DCIP_f]                                  │
│    - Encodes DCIP: "Positive"=1, "Negative"=0                       │
│    - model.predict_proba() → probability                             │
│    - threshold 0.35: prob >= 0.35 → "Risk"                          │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 5. DATABASE saves prediction                                         │
│    - Insert into predictions table                                   │
│    - Returns UUID for the record                                     │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 6. RESPONSE sent back to frontend                                    │
│    {                                                                 │
│      "result": "Risk" | "No Risk",                                  │
│      "probability": 0.42,                                            │
│      "threshold": 0.35,                                              │
│      "id": "uuid-..."                                                │
│    }                                                                 │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 7. FRONTEND displays ResultCard                                      │
│    - Shows Risk level with color coding                              │
│    - Green for No Risk, Red for Risk                                │
│    - Displays probability percentage                                 │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 ML Model Details

### Feature Engineering

```python
FEATURE_ORDER = [
    'Hb mother',                    # Hemoglobin (g/dL)
    'Hb father',
    'Hct mother',                   # Hematocrit (%)
    'Hct father',
    'MCV mother',                   # Mean Corpuscular Volume (fL)
    'MCV father',
    'MCH mother',                   # Mean Corpuscular Hemoglobin (pg)
    'MCH father',
    'Dichrolophenol Indolephenol M',  # DCIP result (0/1)
    'Dichrolophenol Indolephenol F'
]
```

### Prediction Logic

```python
def predict(features: dict) -> dict:
    # 1. Prepare feature array
    X = np.array([[
        features['hb_mother'],
        features['hb_father'],
        features['hct_mother'],
        features['hct_father'],
        features['mcv_mother'],
        features['mcv_father'],
        features['mch_mother'],
        features['mch_father'],
        1 if features['dcip_mother'] == 'Positive' else 0,
        1 if features['dcip_father'] == 'Positive' else 0,
    ]])
    
    # 2. Get probability
    probability = model.predict_proba(X)[0][1]
    
    # 3. Apply threshold
    THRESHOLD = 0.35
    result = "Risk" if probability >= THRESHOLD else "No Risk"
    
    return {
        "result": result,
        "probability": float(probability),
        "threshold": THRESHOLD
    }
```

### Threshold Logic

| Probability | Result | Meaning |
|-------------|--------|---------|
| `>= 0.35` | **Risk** | ความเสี่ยงสูงที่บุตรจะเป็นโรคธาลัสซีเมีย |
| `< 0.35` | **No Risk** | ความเสี่ยงต่ำ |

---

## 🗄️ Database Schema

### Table: `predictions`

```sql
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Father Information
    father_patient_id VARCHAR(50) NOT NULL,
    father_first_name VARCHAR(100),
    father_last_name VARCHAR(100),
    father_date_of_birth DATE,
    father_age INTEGER NOT NULL,
    father_hb FLOAT NOT NULL,
    father_hct FLOAT NOT NULL,
    father_mcv FLOAT NOT NULL,
    father_mch FLOAT NOT NULL,
    father_dcip VARCHAR(10) NOT NULL,
    
    -- Mother Information
    mother_patient_id VARCHAR(50) NOT NULL,
    mother_first_name VARCHAR(100),
    mother_last_name VARCHAR(100),
    mother_date_of_birth DATE,
    mother_age INTEGER NOT NULL,
    mother_hb FLOAT NOT NULL,
    mother_hct FLOAT NOT NULL,
    mother_mcv FLOAT NOT NULL,
    mother_mch FLOAT NOT NULL,
    mother_dcip VARCHAR(10) NOT NULL,
    
    -- Prediction Results
    result VARCHAR(20) NOT NULL,
    probability FLOAT NOT NULL,
    
    -- Metadata
    visit_datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for search
CREATE INDEX idx_predictions_father_patient_id ON predictions(father_patient_id);
CREATE INDEX idx_predictions_mother_patient_id ON predictions(mother_patient_id);
CREATE INDEX idx_predictions_visit_datetime ON predictions(visit_datetime);
```

---

## 🌐 API Endpoints

### POST `/predict`
ทำนายผลโดยไม่บันทึก

**Request:**
```json
{
  "father": {
    "patient_id": "P001",
    "hb": 14.5,
    "hct": 42.0,
    "mcv": 85.0,
    "mch": 28.0,
    "dcip": "Negative"
  },
  "mother": {
    "patient_id": "P002",
    "hb": 12.0,
    "hct": 38.0,
    "mcv": 78.0,
    "mch": 25.0,
    "dcip": "Positive"
  }
}
```

**Response:**
```json
{
  "result": "Risk",
  "probability": 0.42,
  "threshold": 0.35
}
```

### POST `/predict/save`
ทำนายผลและบันทึกลงฐานข้อมูล

### GET `/history`
ดึงประวัติการทำนาย (พร้อม pagination)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | หน้าที่ต้องการ |
| `page_size` | int | 10 | จำนวนรายการต่อหน้า |
| `search` | string | - | ค้นหาด้วย Patient ID |
| `sort_order` | string | desc | เรียงตามวันที่ (asc/desc) |

**Response:**
```json
{
  "items": [...],
  "total": 50,
  "page": 1,
  "page_size": 10,
  "total_pages": 5
}
```

### GET `/history/{id}`
ดึงรายละเอียดการทำนายตาม ID

### DELETE `/history/{id}`
ลบประวัติการทำนาย

---

## 🎨 UI Components

### Navbar (`components/Navbar.tsx`)
- Logo แสดงที่ซ้าย
- Menu links: Home, Predict, History, Contact
- Responsive design สำหรับ mobile

### FormInput (`components/FormInput.tsx`)
- Reusable input component
- รองรับ validation error display
- Styles ตาม Navy theme

### ResultCard (`components/ResultCard.tsx`)
- แสดงผลการทำนาย
- สีเขียว: No Risk
- สีแดง: Risk
- แสดง probability เป็น %

---

## 🎨 Styling (Navy Theme)

### Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| `navy-600` | `#1e3a8a` | Primary buttons, links |
| `navy-700` | `#1e2952` | Hover states |
| `navy-800` | `#0f172a` | Headings, dark elements |
| `slate-50` | `#f8fafc` | Background |
| `slate-600` | `#475569` | Body text |

### CSS Classes (globals.css)

```css
.btn-primary {
  @apply bg-navy-600 text-white rounded-lg px-6 py-3
         hover:bg-navy-700 transition-all;
}

.btn-secondary {
  @apply bg-white text-navy-700 ring-1 ring-slate-200
         hover:bg-slate-50;
}

.card {
  @apply bg-white rounded-2xl shadow-sm border border-slate-100 p-8
         transition-all duration-300 hover:shadow-md;
}

.form-input {
  @apply w-full rounded-lg border-slate-200 px-4 py-3
         focus:border-navy-500 focus:ring-navy-500;
}
```

---

## 🚀 Deployment Notes

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
npm start  # Runs on port 3000
```

**Backend:**
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Environment Variables for Production

```env
# Backend
DATABASE_URL=postgresql://user:password@host:5432/dbname
MODEL_PATH=model/model.pkl

# Frontend (build time)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## ⚠️ Medical Disclaimer

> ⚠️ **ข้อจำกัดความรับผิดชอบ**
> 
> ระบบนี้ออกแบบมาเพื่อเป็นเครื่องมือช่วยในการคัดกรองเบื้องต้นเท่านั้น 
> ไม่สามารถใช้แทนการวินิจฉัยของแพทย์หรือการตรวจทางห้องปฏิบัติการได้
> ผลการทำนายควรได้รับการยืนยันจากผู้เชี่ยวชาญทางการแพทย์เสมอ
