# ThalassemiaAI — Skill Guide (Step-by-Step Playbooks)

> เอกสารนี้เป็น **actionable playbook** สำหรับ AI ที่ต้องทำงานพัฒนาฟีเจอร์ใหม่
> ทุก step อ้างอิงจากไฟล์และ pattern จริงในโปรเจกต์นี้เท่านั้น

---

## SKILL 1 — เพิ่ม API Endpoint ใหม่

> **Trigger:** เมื่อได้รับคำสั่งเช่น "เพิ่ม endpoint สำหรับ...", "สร้าง API ที่...", "ทำให้ backend รองรับ..."

### ภาพรวมไฟล์ที่ต้องแก้ไข

```
backend/
├── app/
│   ├── routes/           ← [1] สร้างหรือแก้ไข route file
│   │   └── my_feature.py ← สร้างใหม่ถ้าเป็น feature ใหม่
│   ├── schemas.py        ← [2] เพิ่ม Request/Response Pydantic schema
│   ├── models.py         ← [3] แก้ถ้าต้องการ DB column ใหม่ (ดู SKILL 2)
│   └── main.py           ← [4] register router ใหม่
frontend/
└── app/
    └── [feature]/
        └── page.tsx      ← [5] เพิ่ม axios call ฝั่ง client (ดู SKILL 3)
```

---

### STEP 1 — สร้างไฟล์ Route ใหม่

สร้าง `backend/app/routes/my_feature.py` โดย copy structure จาก `predict.py` หรือ `history.py`:

```python
# backend/app/routes/my_feature.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import MyFeatureRequest, MyFeatureResponse, ErrorResponse
from app.security import get_current_user

router = APIRouter(prefix="/my-feature", tags=["my-feature"])
# ↑ prefix ต้องขึ้นต้นด้วย "/" และเป็น kebab-case เสมอ
# ↑ tags ต้องตรงกับ prefix (ไม่มี "/")


@router.get(
    "",                                    # หรือ "/{id}" สำหรับ detail
    response_model=MyFeatureResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def get_my_feature(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← ต้องมีทุก protected endpoint
):
    """Docstring สั้น ๆ อธิบาย endpoint นี้ทำอะไร."""
    try:
        # ... business logic ...
        pass
    except HTTPException:
        raise  # ← ต้องมีบรรทัดนี้เสมอ
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get feature: {str(e)}")
```

> **หมายเหตุ:** ถ้า endpoint ไม่ต้องการ DB (pure logic) ให้ลบ `db: Session = Depends(get_db)` ออก
> ถ้า endpoint ไม่ต้อง auth ให้ลบ `current_user: User = Depends(get_current_user)` ออก

---

### STEP 2 — เพิ่ม Pydantic Schema ใน `schemas.py`

เปิดไฟล์ `backend/app/schemas.py` แล้วเพิ่ม schema ใหม่ตาม pattern นี้:

```python
# backend/app/schemas.py — เพิ่มต่อท้ายไฟล์ (ก่อน class ที่ไม่เกี่ยวกัน)

class MyFeatureRequest(BaseModel):
    """Schema for my feature request."""
    some_field: str = Field(..., max_length=100, description="...")
    optional_field: Optional[str] = Field(None, description="...")
    numeric_field: float = Field(..., gt=0, description="...")


class MyFeatureResponse(BaseModel):
    """Schema for my feature response."""
    id: UUID
    some_field: str
    created_at: datetime

    class Config:
        from_attributes = True  # ← ต้องมีถ้า response มาจาก SQLAlchemy model
```

**กฎการตั้งชื่อ schema:**
| ประเภท | Pattern | ตัวอย่าง |
|--------|---------|---------|
| Request body | `XxxRequest` | `MyFeatureRequest` |
| Response body | `XxxResponse` | `MyFeatureResponse` |
| List item | `XxxItem` | `HistoryItem` |
| Paginated list | `PaginatedXxx` | `PaginatedHistory` |

---

### STEP 3 — Register Router ใน `main.py`

เปิด `backend/app/main.py` แล้วเพิ่ม 2 บรรทัด:

```python
# backend/app/main.py

# บรรทัดที่ 9 — เพิ่ม import
from app.routes import predict, history, auth, my_feature  # ← เพิ่ม my_feature

# บรรทัดที่ 44-46 — เพิ่ม include_router
app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(history.router)
app.include_router(my_feature.router)  # ← เพิ่มบรรทัดนี้
```

> **ตรวจสอบ:** หลัง register แล้ว endpoint จะ available ที่ `/my-feature/...` (ตาม prefix ที่ตั้งไว้)
> สามารถดูได้ที่ `http://localhost:8000/docs` (Swagger UI)

---

### STEP 4 — เพิ่ม Next.js Proxy Rewrite (ถ้าจำเป็น)

ตรวจสอบว่า frontend proxy ครอบคลุม path ใหม่แล้วหรือยัง (`/api/*` → backend)
ถ้า proxy config ใช้ wildcard `*` อยู่แล้ว ไม่ต้องแก้อะไร

```typescript
// frontend/next.config.js หรือ proxy.ts — ตรวจสอบ rewrite rule
// ถ้ามี { source: "/api/:path*", destination: "http://backend:8000/:path*" }
// → ครอบคลุมทุก endpoint แล้ว ไม่ต้องแก้
```

---

### STEP 5 — ทดสอบ

```bash
# 1. รัน backend local (ไม่ rebuild Docker)
cd backend
uvicorn app.main:app --reload --port 8000

# 2. ตรวจสอบ docs
open http://localhost:8000/docs

# 3. ทดสอบด้วย curl
curl -X GET http://localhost:8000/my-feature \
  -H "Authorization: Bearer <token>"

# 4. ถ้าทำงานถูกต้อง deploy ด้วย
docker compose up -d --build backend
```

---

## SKILL 2 — อัปเดต Schema ของฐานข้อมูล

> **Trigger:** เมื่อได้รับคำสั่งเช่น "เพิ่มคอลัมน์...", "แก้ไข table...", "เก็บข้อมูลใหม่..."

> ⚠️ **WARNING:** ฐานข้อมูล production ต้อง migrate ด้วย `ALTER TABLE` ด้วยตนเอง
> `Base.metadata.create_all()` ใน `startup_event` **ไม่** alter existing tables

### ภาพรวมไฟล์ที่ต้องแก้ไข

```
backend/
├── app/
│   ├── models.py    ← [1] เพิ่ม/แก้ SQLAlchemy column
│   └── schemas.py   ← [2] เพิ่ม/แก้ Pydantic field ให้ตรงกัน
├── init.sql         ← [3] เพิ่ม migration SQL (สำหรับ fresh deploy)
```

---

### STEP 1 — แก้ SQLAlchemy Model ใน `models.py`

เปิด `backend/app/models.py` แล้วเพิ่ม column ใน class ที่เกี่ยวข้อง:

```python
# backend/app/models.py

class Prediction(Base):
    """Database model for thalassemia predictions."""
    __tablename__ = "predictions"

    # ... existing columns ...

    # ← เพิ่ม column ใหม่ตรงนี้
    # กฎ: nullable=True เสมอสำหรับ column ใหม่ (backward compatible)
    # กฎ: อย่าเพิ่ม NOT NULL constraint ถ้าไม่มี default value
    new_column = Column(String(200), nullable=True)          # Text
    new_flag = Column(Boolean, nullable=True, default=False) # Boolean
    new_count = Column(Integer, nullable=True)               # Integer
    new_score = Column(Float, nullable=True)                 # Float
    new_data = Column(Text, nullable=True)                   # JSON string
    new_timestamp = Column(DateTime, nullable=True)          # Timestamp
```

**Type mapping — SQLAlchemy → PostgreSQL:**
| SQLAlchemy | PostgreSQL | ใช้เมื่อ |
|-----------|-----------|---------|
| `String(n)` | `VARCHAR(n)` | text สั้น |
| `Text` | `TEXT` | text ยาว / JSON string |
| `Float` | `DOUBLE PRECISION` | decimal number |
| `Integer` | `INTEGER` | whole number |
| `Boolean` | `BOOLEAN` | true/false |
| `DateTime` | `TIMESTAMP` | date+time |
| `UUID(as_uuid=True)` | `UUID` | unique ID |

---

### STEP 2 — อัปเดต Pydantic Schemas ใน `schemas.py`

ทุก schema ที่ map กับ model ที่เปลี่ยน **ต้องอัปเดต** ด้วย:

```python
# backend/app/schemas.py

# ค้นหา schemas ที่ใช้ class Config: from_attributes = True
# และเกี่ยวข้องกับ model ที่แก้ → เพิ่ม field ใหม่

class PredictionResponse(BaseModel):
    """Schema for prediction response from database."""
    # ... existing fields ...
    new_column: Optional[str] = None   # ← เพิ่มตรงนี้ (Optional เสมอสำหรับ column ใหม่)
    new_flag: Optional[bool] = None
    new_count: Optional[int] = None

    class Config:
        from_attributes = True
```

> **กฎสำคัญ:** column ที่เพิ่มใหม่ใน DB ต้องเป็น `Optional[Type] = None` ใน Pydantic เสมอ
> เพราะ record เก่าใน DB จะมีค่า `NULL` สำหรับ column ใหม่

---

### STEP 3 — เพิ่ม Migration SQL ใน `init.sql`

เปิด `backend/init.sql` แล้วเพิ่ม migration statement **ที่ปลอดภัย** (idempotent):

```sql
-- backend/init.sql
-- เพิ่มต่อท้าย section ที่เกี่ยวข้อง

-- เพิ่ม column ใหม่ (ปลอดภัยสำหรับ fresh DB และ existing DB)
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS new_column VARCHAR(200);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS new_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS new_count INTEGER;

-- แก้ constraint เดิม (เช่น ทำให้ nullable)
ALTER TABLE predictions ALTER COLUMN existing_column DROP NOT NULL;
```

> **หมายเหตุ:** `init.sql` ใช้ตอน `docker compose up` ครั้งแรกเท่านั้น
> สำหรับ production database ที่รันอยู่แล้ว ต้อง run SQL ด้วยตนเอง (ดู STEP 4)

---

### STEP 4 — Run Migration บน Production Database

```bash
# SSH เข้า VPS แล้วรัน:

# 1. เข้า psql ของ container
docker exec -it thalassemia_db psql -U postgres -d thalassemia_db

# 2. Run migration (copy จาก init.sql ที่เพิ่งแก้)
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS new_column VARCHAR(200);
ALTER TABLE predictions ALTER COLUMN existing_column DROP NOT NULL;

# 3. ตรวจสอบ
\d predictions    -- ดู table structure

# 4. ออก
\q

# 5. Rebuild backend เพื่อ load schema ใหม่
docker compose up -d --build backend
```

---

### STEP 5 — อัปเดต Route Handler (ถ้าจำเป็น)

ถ้า column ใหม่ต้องถูก save ใน route handler:

```python
# backend/app/routes/predict.py — ใน save_prediction()

prediction = Prediction(
    # ... existing fields ...
    new_column=request.new_column,          # ← เพิ่มตรงนี้
    new_flag=request.new_flag or False,     # ← ใส่ default ถ้า Optional
)
```

---

### STEP 6 — อัปเดต Frontend Interface (ถ้า column ใหม่ถูก return)

```typescript
// frontend/app/history/page.tsx หรือ predict/page.tsx
// ค้นหา interface ที่ map กับ schema ที่แก้ แล้วเพิ่ม field

interface HistoryItem {
    // ... existing fields ...
    new_column: string | null;   // ← เพิ่มตรงนี้ (| null เพราะ nullable)
    new_flag: boolean | null;
}
```

---

## SKILL 3 — เพิ่มหน้า UI ใหม่ใน Frontend

> **Trigger:** เมื่อได้รับคำสั่งเช่น "สร้างหน้า...", "เพิ่มหน้า UI...", "ทำ page ใหม่..."

### ภาพรวมไฟล์ที่ต้องแก้ไข

```
frontend/
├── app/
│   └── my-page/         ← [1] สร้าง directory ใหม่
│       └── page.tsx     ← [2] สร้าง page component
├── components/
│   └── MyComponent.tsx  ← [3] สร้าง component ถ้าต้องการ (optional)
└── app/
    └── layout.tsx       ← [4] ไม่ต้องแก้ (Navbar/Footer อยู่ที่นี่แล้ว)
                               แก้เฉพาะถ้าต้องการเปลี่ยน metadata
```

**ตรวจสอบเพิ่มเติม (กรณีหน้าใหม่ต้องการ nav link):**
```
frontend/
└── components/
    └── Navbar.tsx       ← [5] เพิ่ม navItems entry
```

---

### STEP 1 — สร้าง Directory และ `page.tsx`

Next.js App Router: ชื่อ folder = URL path

```bash
# สร้าง directory ใหม่
mkdir frontend/app/my-page
touch frontend/app/my-page/page.tsx
```

---

### STEP 2 — เขียน `page.tsx` ตาม Template มาตรฐาน

Copy template นี้แล้วปรับตาม feature:

```tsx
// frontend/app/my-page/page.tsx
"use client";  // ← บังคับสำหรับหน้าที่มี state หรือ event handler

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { authHeaders } from "@/lib/auth";

// ─── 1. Interface Declarations ────────────────────────────────────────────────
interface MyData {
    id: string;
    some_field: string;
    // ... ตรงกับ Pydantic Response schema
}

// ─── 2. Page Component ────────────────────────────────────────────────────────
export default function MyPage() {  // ← ชื่อลงท้ายด้วย "Page"

    // ─── 3. State ─────────────────────────────────────────────────────────────
    const [data, setData] = useState<MyData | null>(null);
    const [isLoading, setIsLoading] = useState(true);   // true = fetch on mount
    const [error, setError] = useState<string | null>(null);
    // เพิ่ม state ตามความต้องการ เช่น:
    // const [isSubmitting, setIsSubmitting] = useState(false);
    // const [selectedId, setSelectedId] = useState<string | null>(null);

    // ─── 4. Fetch Function (ถ้าหน้านี้ต้อง load ข้อมูล) ─────────────────────
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get<MyData>("/api/my-feature", {
                headers: authHeaders(),
            });
            setData(response.data);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.detail || err.response?.data?.error || "Failed to load data");
            } else {
                setError("An unexpected error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    }, []); // ← ใส่ dependencies ที่เปลี่ยนแปลงได้ (page, search, filter)

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── 5. Handler Functions ─────────────────────────────────────────────────
    const handleAction = async () => {
        // ตั้งชื่อ handleXxx เสมอ
    };

    // ─── 6. JSX ───────────────────────────────────────────────────────────────
    return (
        // กรอบนอกสุดต้องเป็น pattern นี้ (ดู predict/page.tsx และ history/page.tsx)
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="container mx-auto px-6 py-12">

                {/* Page Header — บังคับทุกหน้า */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-navy-800 mb-3">
                        My Page Title
                    </h1>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Short description of this page.
                    </p>
                </div>

                {/* Error Banner — บังคับทุกหน้าที่มี API call */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Loading Spinner — บังคับทุกหน้าที่มี async data */}
                {isLoading && (
                    <div className="flex justify-center items-center py-12">
                        <svg className="animate-spin h-8 w-8 text-navy-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                )}

                {/* Main Content */}
                {!isLoading && data && (
                    <div className="card border border-slate-200">
                        {/* content here */}
                    </div>
                )}

                {/* Empty State — ถ้าหน้านี้แสดง list */}
                {!isLoading && !data && !error && (
                    <div className="card text-center py-16 border border-slate-200">
                        <h3 className="text-sm font-semibold text-navy-800">No data found</h3>
                        <p className="mt-2 text-sm text-slate-500">Description of empty state.</p>
                    </div>
                )}

            </div>
        </div>
    );
}
```

---

### STEP 3 — สร้าง Component แยก (ถ้าจำเป็น)

สร้าง component ใหม่ใน `frontend/components/` เฉพาะเมื่อ:
- UI block นั้นซับซ้อน (> ~50 lines JSX)
- หรือต้องใช้ซ้ำในหลายหน้า

```tsx
// frontend/components/MyComponent.tsx
// ไม่มี "use client" ถ้า component ไม่มี state หรือ event handler

interface MyComponentProps {
    title: string;
    data: MyData;
    onAction?: () => void;  // ← callback เป็น optional prop
}

export default function MyComponent({ title, data, onAction }: MyComponentProps) {
    return (
        <div className="card border border-slate-200">
            {/* ... */}
        </div>
    );
}
```

---

### STEP 4 — เพิ่ม Nav Link (ถ้าหน้าใหม่ควรอยู่ใน Navbar)

เปิด `frontend/components/Navbar.tsx` แล้วเพิ่มใน `navItems` array:

```typescript
// frontend/components/Navbar.tsx — บรรทัดที่ 9-14

const navItems = [
    { href: "/",        label: "Home" },
    { href: "/predict", label: "Assess" },
    { href: "/history", label: "History" },
    { href: "/contact", label: "Contact" },
    { href: "/my-page", label: "My Page" },  // ← เพิ่มตรงนี้
];
```

---

### STEP 5 — กำหนด Page Metadata (SEO)

ถ้าหน้าใหม่ต้องการ title/description เฉพาะ (ไม่ใช้ค่า default จาก `layout.tsx`):

```tsx
// frontend/app/my-page/page.tsx
// เพิ่มก่อน export default function (ต้องลบ "use client" ออก แล้วแยก client component)

// ถ้าหน้าไม่มี "use client" สามารถ export metadata ได้โดยตรง:
export const metadata = {
    title: "My Page | ThalassemiaAI",
    description: "Description for SEO",
};
```

> **หมายเหตุ:** หน้าที่มี `"use client"` ไม่สามารถ export `metadata` ได้โดยตรง
> ต้อง wrap ด้วย Server Component หรือใช้ `useEffect` + `document.title` แทน

---

### STEP 6 — ตรวจสอบ Auth Guard (Middleware)

ถ้าหน้าใหม่ต้อง login ก่อนเข้า ตรวจสอบว่า path ถูก protect แล้วหรือยังใน middleware:

```typescript
// frontend/middleware.ts — ตรวจสอบว่า matcher ครอบคลุม path ใหม่
export const config = {
    matcher: ["/predict/:path*", "/history/:path*", "/my-page/:path*"]
    // ← เพิ่ม "/my-page/:path*" ถ้าต้องการ auth
};
```

---

### STEP 7 — ทดสอบ

```bash
# รัน dev server
cd frontend
npm run dev

# เปิดหน้าใหม่
open http://localhost:3000/my-page

# ตรวจสอบ:
# ✅ หน้าแสดงผลถูกต้อง
# ✅ Loading state ทำงาน
# ✅ Error state แสดงถูกต้อง
# ✅ Navbar link ถูก highlight เมื่ออยู่ที่ path นั้น
# ✅ Mobile responsive
```

---

## Quick Reference — ไฟล์ที่แก้ตาม Task

| Task | ไฟล์ที่ต้องแก้ |
|------|--------------|
| เพิ่ม API endpoint ใหม่ | `routes/my_feature.py` (ใหม่) + `schemas.py` + `main.py` |
| เพิ่ม endpoint ใน route เดิม | `routes/predict.py` หรือ `routes/history.py` + `schemas.py` |
| เพิ่ม DB column | `models.py` + `schemas.py` + `init.sql` + run `ALTER TABLE` บน VPS |
| เพิ่มหน้า UI ใหม่ | `app/my-page/page.tsx` (ใหม่) + `Navbar.tsx` (ถ้าต้อง nav link) |
| เพิ่ม reusable component | `components/MyComponent.tsx` (ใหม่) |
| เพิ่ม form field | `predict/page.tsx` (schema + JSX) + `schemas.py` + `models.py` + `routes/predict.py` |

---

*อ้างอิงจากโค้ดจริง: `routes/predict.py`, `routes/history.py`, `app/main.py`, `app/models.py`, `app/schemas.py`, `frontend/app/predict/page.tsx`, `frontend/app/history/page.tsx`, `frontend/components/Navbar.tsx`*
*อัปเดตล่าสุด: August 2026*

---

## SKILL 4 — Session Log & Lessons Learned

> บันทึกสิ่งที่ทำจริงในแต่ละ session พร้อมผลลัพธ์และบทเรียน
> ใช้เป็น reference เพื่อไม่ทำซ้ำสิ่งที่ไม่ได้ผล

---

### Session: August 2026 — Debugging & Production Verification

#### สรุปสิ่งที่ทำในเซสชันนี้

| # | สิ่งที่ทำ | ผลลัพธ์ |
|---|-----------|---------|
| 1 | ตรวจสอบ SSL Certificate ว่า expire หรือไม่ | ✅ Valid อีก 76 วัน (ถึง Oct 2026) |
| 2 | ตรวจสอบ RAM usage บน VPS | ✅ ใช้ 1714MB / 3665MB, swap 313MB — ปกติดี |
| 3 | ทดสอบ login API ตรงไปที่ backend (port 8000) | ✅ HTTP 200 + JWT token ทำงานปกติ |
| 4 | ทดสอบ login ผ่าน frontend proxy (port 3000) | ✅ HTTP 200 + JWT token ทำงานปกติ |
| 5 | ทดสอบ login ผ่าน Nginx HTTPS | ✅ HTTP 200 ทำงานปกติ |
| 6 | ตรวจสอบ Nginx config | ✅ `/api/*` → port 8000, `/` → port 3000 ถูกต้อง |
| 7 | พยายาม `psql -U postgres` ผ่าน `docker exec` | ❌ FATAL: role "postgres" is not permitted to log in |
| 8 | อ่าน `pg_hba.conf` และ `postgresql.conf` | ✅ Config ถูกต้อง — local socket = trust |

---

#### ✅ สิ่งที่ทำแล้วได้ผลดี (Good Practices)

**1. ทดสอบแบบ Layer-by-Layer (Bottom-Up)**

```bash
# Layer 1: Backend โดยตรง
curl -X POST http://localhost:8000/auth/login ...

# Layer 2: Frontend Proxy
curl -X POST http://localhost:3000/api/auth/login ...

# Layer 3: Nginx (HTTPS)
curl -k -X POST https://thalassemiaai.com/api/auth/login ...
```

> ✅ วิธีนี้ช่วยแยกปัญหาได้ชัดเจนว่าอยู่ที่ layer ไหน
> ถ้า Layer 1 ใช้ได้แต่ Layer 2 ไม่ได้ → ปัญหาที่ Next.js proxy
> ถ้า Layer 2 ใช้ได้แต่ Layer 3 ไม่ได้ → ปัญหาที่ Nginx หรือ SSL

**2. ตรวจสอบ RAM ก่อน Debug Application**

```bash
free -m
# ดู "available" column — ถ้า < 200MB แสดงว่า RAM เป็นปัญหา
```

> ✅ ช่วยตัด RAM เป็นสาเหตุออกได้อย่างรวดเร็ว ก่อนไป debug อื่น

**3. ใช้ `certbot certificates` เช็คสถานะ SSL แบบตรง**

```bash
certbot certificates
# ดู "Expiry Date" — ไม่ต้องรอ browser error
```

> ✅ เร็วกว่าการ debug ผ่าน browser certificate viewer มาก

**4. ทดสอบ API ด้วย `curl -sv` (verbose) เสมอ เพื่อดู HTTP headers**

```bash
curl -sv -X POST http://... 2>&1 | tail -20
# -s = silent progress, -v = verbose headers
```

> ✅ เห็น HTTP status code, server header, content-type — ช่วยวินิจฉัยได้ครบ

---

#### ❌ สิ่งที่ทำแล้วไม่ได้ผล / ข้อระวัง (Anti-Patterns / Gotchas)

**1. ❌ `docker exec psql -U postgres` ล้มเหลวเสมอ บน container นี้**

```bash
# ❌ ไม่ใช้ — จะ error "role postgres is not permitted to log in"
docker exec -it thalassemia_db psql -U postgres -d thalassemia_db
```

**สาเหตุ:** PostgreSQL image ถูก configure ให้ user `postgres` เป็น superuser แต่ถูก lock ไม่ให้ login ผ่าน socket

**วิธีที่ถูกต้อง:**
```bash
# ✅ ใช้ตัวแปร POSTGRES_USER จาก docker-compose.yml แทน
docker exec -it thalassemia_db psql -U thal_user -d thalassemia_db

# หรือดูชื่อ user จริงจาก .env
grep POSTGRES_USER /root/risk-thalassemia-web/backend/.env
```

**2. ❌ อย่าสับสนระหว่าง HTTP (IP) กับ HTTPS (domain)**

```bash
# ❌ จะได้ 404 — Nginx config ไม่รองรับ HTTP ผ่าน IP
curl http://119.59.103.14/api/...

# ✅ ต้องใช้ HTTPS + domain เสมอ
curl https://thalassemiaai.com/api/...
```

> Nginx config ตั้ง `return 404` สำหรับ HTTP (port 80) ทุก case
> user ต้องเข้าผ่าน `https://thalassemiaai.com` เท่านั้น

**3. ❌ อย่า assume ว่า login ไม่ได้เพราะ backend — ตรวจสอบให้ครบก่อน**

ครั้งนี้เราคิดว่าปัญหาคือ RAM หรือ backend crash แต่ที่จริง:
- Backend ทำงานปกติ 100%
- Frontend proxy ทำงานปกติ 100%
- HTTPS ทำงานปกติ 100%

> ปัญหาที่แท้จริงอาจเป็น browser-side: cache เก่า, cookie ค้าง, หรือ user เข้าผ่าน HTTP แทน HTTPS

**Checklist ก่อน escalate ว่า "backend ล่ม":**

```
□ ทดสอบ curl ตรงไปที่ port 8000 ก่อน
□ ตรวจ RAM: free -m (available > 200MB = ปกติ)
□ ตรวจ container status: docker compose ps
□ ตรวจ logs: docker compose logs backend --tail 50
□ ทดสอบผ่าน HTTPS domain (ไม่ใช่ HTTP IP)
□ ลอง Incognito mode บน browser
```

**4. ❌ `pg_hba.conf` local socket = trust ไม่ได้แปลว่า `postgres` user login ได้เสมอ**

> บางครั้ง PostgreSQL image ล็อค role `postgres` ไว้ แม้ pg_hba.conf จะ trust
> ต้องตรวจสอบ `POSTGRES_USER` จาก docker-compose env แทน

---

#### 📝 Credentials & Accounts (สำหรับ Debug)

| Account | Username | Password |
|---------|----------|----------|
| Admin | `admin` | `ThalAdmin@2026` |
| Doctor sample | `doctor_01` | `ThallasAI01.` |

> ⚠️ เปลี่ยน credentials ใน `.env` และ init.sql หลัง production deploy

---

#### 🔧 Debug Commands ที่มีประโยชน์ (Copy-Paste Ready)

```bash
# --- System Health Check ---
free -m                                           # RAM usage
docker compose ps                                 # container status
docker compose logs backend --tail 50            # backend logs

# --- API Testing ---
# Login (backend direct)
curl -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"ThalAdmin@2026"}'

# Login (via HTTPS)
curl -k -X POST https://thalassemiaai.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"ThalAdmin@2026"}'

# --- SSL Check ---
certbot certificates                              # ดู expiry date
nginx -t                                          # ตรวจ nginx config syntax

# --- Database ---
# ดูชื่อ user จริงก่อน psql
grep POSTGRES_USER /root/risk-thalassemia-web/backend/.env
docker exec -it thalassemia_db psql -U <user_from_env> -d thalassemia_db

# --- Deploy ---
docker compose up -d --build backend             # rebuild backend only
docker compose up -d --build                     # rebuild all
```

---

*Session log เพิ่มเมื่อ: August 2026*

---

### Session: August 2026 (2) — PostgreSQL "role postgres is not permitted to log in" — Root Cause & Permanent Fix

#### สรุปปัญหา

Login ไม่ได้บน production — Frontend แสดง "Incorrect username or password" แต่สาเหตุจริงคือ **Database ใช้ไม่ได้** (role `postgres` ถูก lock ไม่ให้ login)

#### Root Cause

**ภาค 1: การ mount ไฟล์ `pg_hba.conf` และ `postgresql.conf` เข้า container ขัดแย้งกับ Docker entrypoint script ของ `postgres:15-alpine`**

เมื่อ container restart:
1. Entrypoint script ตรวจสอบ PGDATA → เห็นว่ามีข้อมูลแล้ว → ข้าม initdb
2. แต่การ mount ไฟล์ custom ทับทำให้เกิด permission issues หรือการอ่านค่าผิดพลาด
3. ส่งผลให้การเชื่อมต่อ Local Socket ภายในล้มเหลว หรือถูกปฏิเสธ

**ภาค 2: Docker Volume จำประวัติเก่าที่ผิดปกติ (สาเหตุที่แก้โค้ดแล้วทีแรกยังพัง)**

1. ในอดีต Database ถูกสร้างและเข้ารหัส Password แบบ `scram-sha-256` (ตาม Default ของ PostgreSQL 15)
2. เมื่อเราแก้ `docker-compose.yml` ใหม่ บังคับใช้ `POSTGRES_HOST_AUTH_METHOD: md5` และ `password_encryption=md5`
3. พอ Restart Container ตัว Entrypoint พยายามเชื่อมต่อและตรวจสอบ Password 
4. แต่รหัสผ่านใน Volume ดั้งเดิมเป็นแบบเก่า (SCRAM) ทำให้การเชื่อมต่อภายในล้มเหลว (Authentication failed)
5. ส่งผลให้ระบบป้องกันตัวเองด้วยการ Lock Role `postgres` (ตั้งค่า `rolcanlogin = false` หรือ NOLOGIN) ทุกครั้งที่ถูก Restart

#### สิ่งที่แก้ไข

| ไฟล์ | สิ่งที่ทำ |
|------|----------|
| `docker-compose.yml` | เอา mounted pg_hba.conf/postgresql.conf ออก, ใช้ `-c` parameters แทน |
| `docker-compose.yml` | เพิ่ม `POSTGRES_HOST_AUTH_METHOD: md5` และ `POSTGRES_INITDB_ARGS` |
| `docker-compose.yml` | แก้ healthcheck ให้เช็ค `psql -c 'SELECT 1'` ด้วย (ไม่ใช่แค่ `pg_isready`) |
| `docker-compose.yml` | เพิ่ม `max_connections=20` (เดิม 10 ต่ำเกินไป) |
| `backend/app/database.py` | เพิ่ม connection pool limits (pool_size=3, max_overflow=5) |
| `frontend/app/login/page.tsx` | แก้ error handling ให้แยก 500/503 ออกจาก 401 |
| `deployment.md` | เพิ่มคำเตือนและ troubleshooting steps |

#### บทสรุป: อันไหนทำแล้ว Work / ไม่ Work

❌ **สิ่งที่ทำแล้วไม่ Work (แก้ไม่ขาด):**
- **การเข้าไปใช้สคริปต์แก้สิทธิ์ (Emergency Fix):** รัน `ALTER ROLE postgres WITH LOGIN;` ใน Container ด้วย `su-exec` ช่วยให้ใช้งานได้ชั่วคราว **แต่มันจะกลับมาพัง (ถูก Lock) อีกครั้ง** ทันทีที่มีการ Restart Container หรือ Container หยุดทำงานกะทันหัน
- **การแก้แค่ `docker-compose.yml` เพียงอย่างเดียว:** การอัปเดต Config โค้ดเพียงอย่างเดียว **ยังไม่พอ** เพราะข้อมูลและ Config เก่าที่ถูกจำไว้ใน Docker Volume (`postgres_data`) ยังเป็นของเดิมที่มีปัญหา

✅ **สิ่งที่ทำแล้ว Work (แก้ถาวร 100%):**
การแก้แบบถอนรากถอนโคน ต้องประกอบไปด้วย **การแก้โค้ด + การล้าง Volume**:
1. ลบ Container และ **ล้าง Volume เก่าทิ้ง** ทั้งหมด (`docker compose down -v`)
2. เริ่มรันใหม่ด้วย Config ตัวล่าสุด (`docker compose up -d`)
3. ตอนนี้ PostgreSQL จะสร้างฐานข้อมูลใหม่ตั้งแต่ศูนย์ (InitDB) ด้วยกฎ MD5 ล้วนๆ ทำให้รหัสผ่านและการตรวจสอบสิทธิ์ตรงกัน 100% ไม่มีปัญหา NOLOGIN อีกต่อไปแม้จะโดน Restart เป็นสิบๆ รอบ

#### ❌ Anti-Pattern: อย่า mount custom pg_hba.conf/postgresql.conf เข้า PostgreSQL Docker container

```yaml
# ❌ อย่าทำ — ชนกับ entrypoint script, ทำให้ role ถูก lock เมื่อ restart
volumes:
  - ./backend/pg_hba.conf:/etc/postgresql/pg_hba.conf
  - ./backend/postgresql.conf:/etc/postgresql/postgresql.conf
command: postgres -c hba_file=/etc/postgresql/pg_hba.conf -c config_file=/etc/postgresql/postgresql.conf

# ✅ ใช้ -c parameters แทน
command: >
  postgres
  -c shared_buffers=64MB
  -c max_connections=20
  -c listen_addresses='*'
  -c password_encryption=md5
```

#### ❌ Anti-Pattern: อย่าใช้ `pg_isready` เป็น healthcheck ตัวเดียว

```yaml
# ❌ pg_isready แค่เช็คว่า server รับ connection ได้ ไม่ได้เช็คว่า login สำเร็จ
healthcheck:
  test: [ "CMD-SHELL", "pg_isready -U postgres" ]

# ✅ เช็คว่า login + query ได้จริง
healthcheck:
  test: [ "CMD-SHELL", "pg_isready -U postgres && psql -U postgres -d thalassemia_db -c 'SELECT 1'" ]
```

#### ❌ Anti-Pattern: Frontend แสดง error ผิด (500 แต่บอกว่า password ผิด)

```typescript
// ❌ ถ้า server ตอบ { error: "Internal Server Error" } (ไม่มี detail key)
// typeof detail === "string" จะเป็น false → แสดง fallback "Incorrect username or password"
const detail = err.response?.data?.detail;
setError(typeof detail === "string" ? detail : "Incorrect username or password");

// ✅ เช็ค HTTP status ก่อน
const status = err.response?.status;
if (status === 500 || status === 503) {
    setError("Server error — กรุณาลองใหม่อีกครั้ง");
} else if (typeof detail === "string") {
    setError(detail);
}
```

#### 🔧 Emergency Fix (ถ้าเกิดซ้ำ)

```bash
# Unlock postgres role
docker exec -it thalassemia_db sh -c 'psql -c "ALTER ROLE postgres WITH LOGIN;"'
docker compose restart backend

# Verify
curl http://localhost:8000/db-health
```

---

*Session log เพิ่มเมื่อ: August 2026*

---

### Session: August 2026 (3) — Contact Form Integration & Rate Limiting

#### สรุปสิ่งที่ทำในเซสชันนี้

- สร้างตาราง `feedbacks` สำหรับเก็บข้อมูลคำติชมที่ส่งมาจากหน้า Contact
- ติดตั้งและตั้งค่า **Resend API** ส่งอีเมลหาผู้ดูแลระบบ (Admin) ทุกครั้งที่มีคนส่ง Feedback
- ติดตั้ง **SlowAPI** เพื่อทำ Rate Limit ให้กับระบบ (1 IP ส่งได้ 5 ครั้ง / 10 นาที) เพื่อป้องกัน Spam
- สร้าง UI ในหน้า Frontend รองรับ Loading State และ Error State กรณีโดน Rate Limit

#### 💡 บทเรียนที่ได้ (Lessons Learned)

**1. ✅ การแยกสถานะอีเมล (Email Status) ใน Database**
การเพิ่ม `email_status` (pending, sent, failed) ลงใน `Feedback` model ถือเป็น Best Practice ทำให้เราทราบได้ว่าข้อมูลไหนส่งเมลสำเร็จ และข้อมูลไหนล้มเหลว (ช่วยในการทำ Retry ในอนาคต)

**2. ✅ การรับมือกับ Spam ด้วย Rate Limit**
การใช้ `slowapi` ช่วยปกป้อง Endpoint สาธารณะ (Public Endpoint) อย่างหน้า Contact ไม่ให้ถูกบอทสแปมข้อความใส่ได้ง่าย ๆ:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
@limiter.limit("5/10minutes")
def submit_contact_form(request: Request, ...):
```

**3. ✅ การจัดการ Environment Variable สำหรับ API Key**
การจัดการ API Key อย่าง `RESEND_API_KEY` ควรฝังไว้ใน `.env` ของ Server / VPS เสมอ และไม่ฝังลงไปใน Code โดยตรง เพื่อป้องกันความเสี่ยงที่ GitHub จะตรวจเจอ Secret Scanning และถูก Block Push
---

*Session log เพิ่มเมื่อ: August 2026*

---

### Session: August 2026 (4) — VPS SSH Security & Rate Limiting (Fail2Ban)

#### สรุปปัญหา
พยายามยิงสคริปต์ SSH เข้า VPS แบบรัวๆ เพื่อรีโมทเข้าไป Execute SQL แบบอัตโนมัติ ผลปรากฏว่าคำสั่ง SSH แรกๆ ทะลุผ่านเข้าไปทำงานได้ (ข้อมูล User ใหม่เข้า Database สำเร็จ) แต่คำสั่งถัดๆ มาเกิดอาการค้าง (Hanging) และเจอ Error `Operation timed out` ทำให้ต้อง Kill Task ทิ้งทั้งหมด

#### Root Cause
ระบบรักษาความปลอดภัยของ VPS (เช่น `Fail2Ban` หรือ Firewall) จับพฤติกรรมการเรียก SSH ถี่ผิดปกติภายในเวลาไม่กี่วินาที (คล้ายพฤติกรรม Brute-force Attack) จึงทำการแบน/บล็อค IP นั้นชั่วคราวบน Port 22 ส่งผลให้การเชื่อมต่อ SSH ครั้งถัดๆ ไปไม่สามารถทำได้

#### บทสรุป: อันไหนทำแล้ว Work / ไม่ Work

❌ **สิ่งที่ทำแล้วไม่ Work (ควรระวัง):**
- **การยิงคำสั่ง `sshpass -p ... ssh ...` ซ้ำๆ แบบรัวๆ ในระยะเวลาสั้น:** จะทำให้ IP โดนบล็อคชั่วคราวอย่างรวดเร็ว (Connection Timed Out)
- **การใช้ Pipe โยนไฟล์เข้า Docker Container ผ่าน SSH:** แม้ว่าจะทำได้ (เช่น `cat ... | ssh ... "docker exec ..."` ) แต่อาจเกิดปัญหาจังหวะการอ่าน/เขียน (I/O) ค้าง ทำให้ระบบแขวน (Hang)

✅ **สิ่งที่ทำแล้ว Work (Best Practice สำหรับ Remote Execution):**
1. **การแก้โค้ดลงไฟล์แล้ว Commit & Push ขึ้น Git:** หากข้อมูลนั้นเป็นแบบ Permanent (เช่น Seed Data อย่าง User เริ่มต้น) การเขียนลง `init.sql` แล้ว Push ขึ้น Git จากนั้นค่อยทำ `git pull` บน VPS จะสะอาด สเถียร และลดปัญหา Connection ได้ดีที่สุด
2. **รวมคำสั่งไว้ใน Session เดียว:** หากจำเป็นต้องรีโมทผ่าน SSH ควรเขียนทุกคำสั่งรวมกันในสคริปต์เดียว หรือเชื่อมด้วย `&&` แล้วยิง SSH แค่ **ครั้งเดียว** เพื่อลดจำนวน Connection Logs และป้องกันการโดนแบนจาก Fail2Ban

> **ข้อสังเกต:** การที่ระบบแบนเฉพาะ Port 22 ถือว่าถูกต้องตามหลัก Security เพราะหน้าเว็บไซต์ (HTTPS / Port 443) จะยังคงสามารถให้บริการผู้ใช้ได้ตามปกติ 100% 

---

*Session log เพิ่มเมื่อ: August 2026*
