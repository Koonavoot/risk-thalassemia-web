# ThalassemiaAI — Agent Rules & Code Style Guide

> เอกสารนี้สร้างจากการวิเคราะห์โค้ดจริงทั้งหมดในโปรเจกต์ (July 2026)
> **ใช้เป็น directive สำหรับ AI ที่พัฒนาฟีเจอร์ใหม่ในโปรเจกต์นี้**

---

## SECTION 1 — รูปแบบการตั้งชื่อ (Naming Conventions)

### 1.1 Python (Backend)

- **Classes:** `PascalCase` — `MultiModelPredictor`, `FTTransformer`, `MetaTabularTransformer`, `PredictionRequest`
- **Functions/Methods:** `snake_case` — `make_prediction`, `get_history`, `calculate_age`, `_load_tree_models`
- **Private helpers:** prefix `_` (single underscore) — `_prepare_tree_features`, `_resolve_label`, `_load_transformer_models`
- **Constants:** `UPPER_SNAKE_CASE` — `MODEL_VERSION`, `RF_THRESHOLD`, `TOKEN_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`
- **Variables:** `snake_case` — `father_age`, `models_json`, `avg_probability`, `tree_scaler`
- **Pydantic schemas:** ชื่อลงท้ายด้วย `Request`, `Response`, `Item` — `PredictionRequest`, `PredictionResponse`, `HistoryItem`, `TokenResponse`
- **SQLAlchemy models:** ชื่อเป็น singular noun, `PascalCase` — `User`, `Prediction`
- **Route functions:** ชื่อ verb + noun — `make_prediction`, `save_prediction`, `get_history`, `delete_prediction`, `get_me`
- **Module-level singleton:** lowercase — `multi_predictor = MultiModelPredictor()`

### 1.2 TypeScript / React (Frontend)

- **Components:** `PascalCase`, `export default function ComponentName()` — `Navbar`, `FormInput`, `MultiResultCard`
- **Pages:** `export default function XxxPage()` ชื่อลงท้ายด้วย `Page` — `PredictPage`, `HistoryPage`
- **Local interfaces:** `PascalCase` ประกาศในไฟล์ที่ใช้เอง อย่า export ถ้าไม่จำเป็น — `HistoryItem`, `PredictionDetail`, `PaginatedHistory`
- **State variables:** `camelCase` คู่กับ setter `setXxx` — `isLoading / setIsLoading`, `predictionResult / setPredictionResult`, `hiddenIds / setHiddenIds`
- **Boolean states:** ขึ้นต้นด้วย `is` หรือ `has` — `isLoading`, `isSaving`, `isSaved`, `isAdmin`, `loggedIn`
- **Handler functions:** ขึ้นต้นด้วย `handle` — `handleSubmit`, `handleSave`, `handleReset`, `handleDelete`, `handleViewDetail`
- **Toggle/utility functions:** ขึ้นต้นด้วย `toggle` — `toggleSortOrder`
- **Constants (static data):** `UPPER_SNAKE_CASE` — `MODEL_ICONS`, `TOKEN_KEY`
- **Config arrays:** `camelCase` — `navItems`, `dcipOptions`
- **Form schema:** `camelCase + Schema` — `parentSchema`, `formSchema`
- **Inferred type:** `type FormData = z.infer<typeof formSchema>` — ใช้ `z.infer` แทนการเขียน type ซ้ำ

### 1.3 CSS Classes (Tailwind)

- **Custom utility classes:** กำหนดใน globals.css ใช้ชื่อ `kebab-case` — `card`, `btn-primary`, `btn-secondary`, `form-input`, `form-label`, `form-error`
- ใช้ class สำเร็จรูปแทนการ inline Tailwind ซ้ำ ๆ: ต้องสร้าง utility class ก่อน ไม่ inline ทุกครั้ง

---

## SECTION 2 — Error Handling

### 2.1 Backend (FastAPI/Python)

**Rule: ทุก route handler ต้องใช้ `try/except` แยก HTTPException ออกจาก Exception ทั่วไป**

```python
# แบบที่ถูกต้อง — ตาม pattern ในโปรเจกต์
@router.delete("/{prediction_id}")
async def delete_prediction(...):
    try:
        # Check permission FIRST before DB query
        if current_user.username != "admin":
            raise HTTPException(status_code=403, detail="Only admin can permanently delete records.")

        prediction = db.query(Prediction).filter(...).first()
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")

        db.delete(prediction)
        db.commit()
        return {"message": "Prediction deleted successfully"}

    except HTTPException:
        raise  # ← ต้อง re-raise HTTPException แยกเสมอ
    except Exception as e:
        db.rollback()  # ← rollback ถ้ามี DB write
        raise HTTPException(status_code=500, detail=f"Failed to delete prediction: {str(e)}")
```

**Directives:**
1. **ALWAYS** `except HTTPException: raise` ก่อน `except Exception` เสมอ — อย่าให้ HTTPException ถูกดักโดย `Exception`
2. **ALWAYS** call `db.rollback()` ใน except ก่อน raise HTTPException ทุกครั้งที่มี `db.add()` หรือ `db.delete()`
3. ข้อความ error ให้เป็น `f"Failed to {action}: {str(e)}"` — เช่น `"Failed to fetch history: ..."`, `"Failed to save prediction: ..."`
4. ใช้ `logging.error(f"...", exc_info=True)` สำหรับ unexpected error เท่านั้น — ไม่ log ทุก HTTPException
5. Validation error ที่คาดเดาได้ (เช่น admin check, not found) ให้ throw `HTTPException` โดยตรง ไม่ใช้ generic Exception
6. ใช้ `responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}` ใน route decorator ทุก endpoint ที่มีโอกาส error

### 2.2 Frontend (React/TypeScript)

**Rule: แยก Axios error ออกจาก unexpected error เสมอ โดยใช้ `axios.isAxiosError(err)`**

```typescript
// แบบที่ถูกต้อง — ตาม pattern ในโปรเจกต์
try {
    const response = await axios.post<MultiPredictionResult>("/api/predict", payload, {
        headers: authHeaders(),
    });
    setPredictionResult(response.data);
} catch (err) {
    if (axios.isAxiosError(err)) {
        // ดึง detail จาก FastAPI format ก่อน แล้วค่อย fallback
        setError(err.response?.data?.detail || err.response?.data?.error || "Prediction failed");
    } else {
        setError("An unexpected error occurred");
    }
} finally {
    setIsLoading(false);  // ← ต้องอยู่ใน finally เสมอ
}
```

**Directives:**
1. **ALWAYS** put loading state reset (`setIsLoading(false)`) ใน `finally` block — ไม่ใส่ใน `catch`
2. **ALWAYS** check `axios.isAxiosError(err)` ก่อน access `err.response`
3. Error message chain: `err.response?.data?.detail || err.response?.data?.error || "Fallback message"` — ต้องมี fallback ทุกครั้ง
4. แสดง error ด้วย `{error && (<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700">{error}</p></div>)}` — ใช้ pattern นี้ทุกหน้า
5. **NEVER** ใช้ `alert()` สำหรับ API errors — ใช้ `setError(...)` แล้วแสดงใน JSX เท่านั้น
6. ยกเว้น: action destructive เล็กน้อย (delete confirm, detail load fail) ยังยอมใช้ `alert()` ได้ตาม pattern เดิม

### 2.3 Pydantic Validation (Backend)

**Rule: ใช้ `@field_validator` พร้อม `@classmethod` สำหรับ business logic validation**

```python
@field_validator('dob')
@classmethod
def dob_must_be_past(cls, v: Optional[date]) -> Optional[date]:
    if v is None:
        return v  # ← check None ก่อนเสมอสำหรับ Optional fields
    if v >= date.today():
        raise ValueError('Date of birth must be in the past')
    if v.year < 1900:
        raise ValueError('...Please use CE (Gregorian) year, not Buddhist Era (BE).')
    return v
```

---

## SECTION 3 — ข้อควรระวังเฉพาะของโปรเจกต์ (Project-Specific Rules)

### 3.1 การจัดการ State ใน Frontend

**Rule: ใช้ `useState` + `useCallback` + `useEffect` ตาม pattern นี้เสมอสำหรับ data fetching**

```typescript
// Pattern มาตรฐาน — ดู history/page.tsx เป็น reference
const [data, setData] = useState<PaginatedHistory | null>(null);
const [isLoading, setIsLoading] = useState(true);  // ← default true สำหรับ initial load
const [error, setError] = useState<string | null>(null);

const fetchHistory = useCallback(async () => {
    setIsLoading(true); setError(null);  // ← reset ทั้งคู่ทุกครั้งก่อน fetch
    try {
        const response = await axios.get<PaginatedHistory>(`/api/history?${params}`, { headers: authHeader() });
        setData(response.data);
    } catch (err) { /* ... */ }
    finally { setIsLoading(false); }
}, [page, search, sortOrder]);  // ← ใส่ dependencies ครบ

useEffect(() => { fetchHistory(); }, [fetchHistory]);  // ← depends on callback เท่านั้น
```

**Directives:**
1. ใช้ `useCallback` wrap fetch functions เสมอ เพื่อ memoize และใช้เป็น `useEffect` dependency
2. **NEVER** call fetch function โดยตรงใน `useEffect` body — ให้ wrap ด้วย `useCallback` ก่อน
3. State เริ่มต้น: `data = null`, `isLoading = true`, `error = null` — ไม่ใช้ `undefined`
4. `hiddenIds` state ใช้ `Set<string>` — ใช้ `new Set([...prev, id])` สำหรับ immutable update
5. Derived values (เช่น `isAdmin`, `visibleItems`) คำนวณนอก JSX ก่อน render — ไม่คำนวณซ้ำใน JSX

### 3.2 Authentication Pattern

**Rule: ทุก API call ต้องแนบ auth header ผ่าน `authHeaders()` เสมอ**

```typescript
// ใน predict/page.tsx — ใช้ authHeaders() จาก lib/auth.ts
import { authHeaders } from "@/lib/auth";
await axios.post("/api/predict", payload, { headers: authHeaders() });

// ใน history/page.tsx — inline helper (ยอมรับ pattern นี้ในหน้าที่ซับซ้อน)
const authHeader = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};
```

**Directives:**
1. **PREFER** `import { authHeaders } from "@/lib/auth"` ใน component ใหม่ — ไม่เขียน inline
2. Token เก็บใน `localStorage` key `"thal_access_token"` และ cookie `thal_access_token` คู่กัน — ห้ามเปลี่ยน key name
3. ใช้ `setTokenAndNavigate(token, "/predict")` หลัง login — ไม่ใช้ `router.push` โดยตรง (race condition กับ cookie)
4. ตรวจ SSR: `if (typeof window === "undefined") return null/false` ก่อน access `localStorage` ทุกครั้ง

### 3.3 Database Query Pattern (SQLAlchemy)

**Rule: ใช้ `db.query(Model).filter(...).first()` หรือ `.all()` — ไม่ใช้ raw SQL**

```python
# Pattern ที่ใช้ในโปรเจกต์
query = db.query(Prediction)
if search:
    query = query.filter(
        or_(
            Prediction.father_patient_id.ilike(f"%{search}%"),
            Prediction.mother_patient_id.ilike(f"%{search}%")
        )
    )
query = query.order_by(desc(Prediction.visit_datetime))
total = query.count()
predictions = query.offset(offset).limit(page_size).all()
```

**Directives:**
1. ใช้ `ilike` (case-insensitive) สำหรับ search text — ไม่ใช้ `like`
2. ใช้ `or_()` จาก `sqlalchemy` สำหรับ multi-field search
3. ใช้ `desc()` / `asc()` จาก `sqlalchemy` สำหรับ sorting — ไม่ string literal
4. **ALWAYS** `db.rollback()` ใน except สำหรับ write operations (`add`, `delete`, `commit`)
5. การ paginate: `offset = (page - 1) * page_size`, `total_pages = (total + page_size - 1) // page_size` — ใช้ formula นี้เสมอ

### 3.4 Optional Fields (DOB / Age) — Critical Rule

**DOB และ Age เป็น nullable ทั้งใน DB schema และ Python models — ห้ามทำให้เป็น required**

```python
# Backend — ตรวจสอบ None ก่อนคำนวณเสมอ
father_age = calculate_age(request.father.dob) if request.father.dob else None
father_dob = datetime.combine(request.father.dob, datetime.min.time()) if request.father.dob else None

# Pydantic — ใช้ Optional ทุก field ที่เกี่ยวกับ DOB/Age
father_age: Optional[int]
mother_dob: Optional[date]
```

```typescript
// Frontend — clean ก่อน submit เสมอ
const cleanParent = (parent: FormData["father"]) => ({
    ...parent,
    dob: parent.dob?.trim() || undefined,  // ← empty string → undefined
});
```

**Directives:**
1. **NEVER** เพิ่ม `NOT NULL` constraint ให้ `father_dob`, `mother_dob`, `father_age`, `mother_age` ใน SQL หรือ SQLAlchemy model
2. **ALWAYS** `?.trim() || undefined` สำหรับ DOB string ก่อนส่ง API — ป้องกัน `""` ทำให้ backend validate error
3. Pydantic schema: `Optional[int]`, `Optional[date]` — ไม่ใช้ `int` หรือ `date` ล้วน ๆ สำหรับ field เหล่านี้
4. แสดง DOB label ว่า `"Date of Birth — CE"` และ placeholder `"Optional — use CE / ค.ศ. year"` เสมอ

### 3.5 Role-Based Access Control (RBAC)

**Rule: RBAC ทำที่ backend เท่านั้น — frontend ทำแค่ UI toggle ไม่ใช่ security**

```python
# Backend — ตรวจ admin FIRST ก่อน DB operation ทุกครั้ง
if current_user.username != "admin":
    raise HTTPException(status_code=403, detail="Only admin can permanently delete records.")
```

```typescript
// Frontend — isAdmin มาจาก API response เท่านั้น (is_admin field)
const isAdmin = data?.is_admin ?? false;

// Admin: call DELETE API (permanent)
// Non-admin: setHiddenIds (client-side hide เท่านั้น)
const handleDelete = async (id: string) => {
    if (isAdmin) {
        await axios.delete(`/api/history/${id}`, { headers: authHeader() });
    } else {
        setHiddenIds((prev) => new Set([...prev, id]));
    }
};
```

**Directives:**
1. Admin check ที่ backend: `current_user.username == "admin"` — ใช้ string comparison กับ `"admin"` เสมอ
2. `is_admin` flag ส่งกลับใน `PaginatedHistory` response — ไม่เก็บ role ใน localStorage หรือ cookie
3. Hidden rows (admin view): ใช้ `opacity-40` class — ไม่ `display: none`
4. Non-admin delete = client-side hide ใน `Set<string>` state — ไม่ persist ข้าม session (by design)

### 3.6 ML Model Integration

**Rule: ทุก model inference ต้องอยู่ใน `with torch.no_grad():` block และใช้ `map_location=torch.device("cpu")`**

```python
# Pattern มาตรฐาน
ft_state = torch.load(path, map_location=torch.device("cpu"), weights_only=True)
self.ft_model.eval()

with torch.no_grad():
    ft_logits = self.ft_model(x_cont, x_cat)
    ft_proba = float(torch.sigmoid(ft_logits).item())
```

**Directives:**
1. **ALWAYS** `weights_only=True` ใน `torch.load()` — security + performance
2. **ALWAYS** `map_location=torch.device("cpu")` — VPS ไม่มี GPU
3. **ALWAYS** call `model.eval()` หลัง load ก่อน inference
4. **ALWAYS** `del state_dict` ทันทีหลัง `load_state_dict()` — ลด peak memory
5. ใช้ `gc.collect()` หลัง load แต่ละกลุ่ม model (tree vs transformer) — staged loading
6. Threshold ทุกตัวประกาศเป็น class constant: `RF_THRESHOLD = 0.6435` — ห้าม hardcode ใน method
7. ผล probability ต้อง `float(...)` explicit — numpy/torch types ทำให้ JSON serialize ไม่ได้

### 3.7 API Proxy (Next.js → FastAPI)

**Frontend calls `/api/...` เสมอ — ไม่ call `http://backend:8000` โดยตรง**

```typescript
// ถูกต้อง
await axios.post("/api/predict", payload, { headers: authHeaders() });

// ผิด — อย่าใช้
await axios.post("http://backend:8000/predict", payload);
```

**Directives:**
1. Next.js proxy rewrite: `/api/*` → `http://backend:8000/*` — config อยู่ใน `next.config.js` / `proxy.ts`
2. `NEXT_PUBLIC_API_URL` ถูก bake ตอน build — ห้ามเปลี่ยน URL dynamically ที่ client
3. API response type ต้อง declare interface ตรงกับ Pydantic schema ทุกครั้ง

### 3.8 Docker & Memory Management

**Directives:**
1. **NEVER** เพิ่ม worker ใน uvicorn — คงไว้ที่ `--workers 1` เพราะ model เปลือง RAM
2. Memory limits: backend <= 2560M, frontend <= 256M, db <= 256M — ห้ามเกิน
3. ห้ามใช้ GPU build ของ PyTorch — ใช้ `--index-url https://download.pytorch.org/whl/cpu` เสมอ
4. Thread limits ต้องมีทุกครั้งใน Dockerfile และ docker-compose: `OMP_NUM_THREADS=1`, `MKL_NUM_THREADS=1`, `TORCH_NUM_THREADS=1`

---

## SECTION 4 — โครงสร้าง Component (Frontend)

### 4.1 Page Component Template

```typescript
"use client";  // ← ทุก interactive page ต้องมี

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { authHeaders } from "@/lib/auth";

// 1. Interface declarations (local to file)
interface MyData { ... }

// 2. Default export function (ลงท้าย "Page")
export default function MyFeaturePage() {
    // 3. State declarations
    const [data, setData] = useState<MyData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 4. Fetch/callback functions (useCallback)
    const fetchData = useCallback(async () => { ... }, [deps]);

    // 5. useEffect
    useEffect(() => { fetchData(); }, [fetchData]);

    // 6. Handler functions (handleXxx)
    const handleAction = async () => { ... };

    // 7. Return JSX
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="container mx-auto px-6 py-12">
                {/* Page header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-navy-800 mb-3">...</h1>
                </div>
                {/* Error banner */}
                {error && (<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700">{error}</p></div>)}
                {/* Loading spinner */}
                {isLoading && (<div className="flex justify-center items-center py-12">...</div>)}
                {/* Content */}
                {!isLoading && data && (...)}
            </div>
        </div>
    );
}
```

### 4.2 Reusable Component Template

```typescript
import { forwardRef, InputHTMLAttributes } from "react";

interface MyComponentProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

// ใช้ forwardRef สำหรับ form components ที่ต้องการ ref (react-hook-form)
export const MyComponent = forwardRef<HTMLInputElement, MyComponentProps>(
    function MyComponent({ label, error, ...props }, ref) {
        return (
            <div className="mb-4">
                <label className="form-label">{label}</label>
                <input ref={ref} className={`form-input ${error ? "border-red-500" : ""}`} {...props} />
                {error && <p className="form-error">{error}</p>}
            </div>
        );
    }
);
```

### 4.3 Backend Route Template

```python
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import MyRequest, MyResponse, ErrorResponse
from app.security import get_current_user

router = APIRouter(prefix="/my-feature", tags=["my-feature"])

@router.post(
    "",
    response_model=MyResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse}
    }
)
async def my_endpoint(
    request: MyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Docstring explaining the endpoint."""
    try:
        # business logic
        pass
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to ...: {str(e)}")
```

---

## SECTION 5 — สิ่งที่ห้ามทำ (Anti-Patterns)

| ❌ ห้ามทำ | ✅ ให้ทำแทน |
|----------|-----------|
| `raise Exception("...")` ใน route handler | `raise HTTPException(status_code=5xx, detail="...")` |
| `except Exception as e: raise HTTPException(...)` โดยไม่มี `except HTTPException: raise` ก่อน | เพิ่ม `except HTTPException: raise` ก่อนเสมอ |
| `dob: date` (required) ใน Pydantic | `dob: Optional[date] = None` |
| `father_dob TIMESTAMP NOT NULL` ใน SQL | `father_dob DATE` (no NOT NULL) |
| `localStorage.getItem(...)` โดยไม่ check SSR | `if (typeof window === "undefined") return null` ก่อน |
| `router.push("/predict")` หลัง login | `setTokenAndNavigate(token, "/predict")` |
| `torch.load(path)` ไม่มี `weights_only=True` | `torch.load(path, map_location="cpu", weights_only=True)` |
| `--workers 4` ใน uvicorn | `--workers 1` เท่านั้น |
| เขียน Tailwind ซ้ำ ๆ inline | ใช้ `btn-primary`, `card`, `form-input` ที่นิยามใน globals.css |
| `await axios.post("http://backend:8000/...")` | `await axios.post("/api/...")` เท่านั้น |
| ลบ DB record โดยไม่ check `current_user.username == "admin"` | check admin ก่อน DB operation ทุกครั้ง |

---

## SECTION 6 — Deployment Checklist

เมื่อเพิ่มฟีเจอร์ที่เปลี่ยน DB schema ให้ทำตามขั้นตอนนี้บน VPS:

```bash
# 1. เพิ่ม migration script ใน init.sql (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
# 2. SSH เข้า VPS และ run manual ALTER TABLE:
docker exec -it thalassemia_db psql -U postgres -d thalassemia_db
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS new_column TYPE;
ALTER TABLE predictions ALTER COLUMN existing_column DROP NOT NULL;

# 3. Pull and rebuild
git pull origin main
docker compose up -d --build

# 4. ตรวจสอบ
docker compose logs backend --tail=30
```

---

*อัปเดตล่าสุด: July 2026 | วิเคราะห์จากโค้ดจริงใน `/backend` และ `/frontend`*
