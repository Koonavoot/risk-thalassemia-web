# Thalassemia Risk Prediction System

A web-based clinical decision support tool for predicting thalassemia risk in offspring based on parental blood test values, powered by an XGBoost machine learning model.

## Live URLs

| Service  | URL |
|----------|-----|
| Frontend | https://risk-thalassemia-web.vercel.app |
| Backend API | https://risk-thalassemia-web-production.up.railway.app |
| API Docs | https://risk-thalassemia-web-production.up.railway.app/docs |

## Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | Next.js 14 (React), TypeScript, TailwindCSS |
| Backend   | FastAPI (Python), SQLAlchemy |
| Database  | PostgreSQL (Railway) |
| ML Model  | XGBoost (threshold 0.35) |
| Hosting   | Vercel (frontend) + Railway (backend + DB) |

## Features

1. **Home Page** — Introduction and system overview
2. **Predict Page** — Input parental blood values and get risk predictions
3. **History Page** — View, search, and sort past predictions (paginated)
4. **Contact Page** — Contact information and FAQ

## Project Structure

```
Thalassemia_predict_project/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application + CORS
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── database.py      # Database connection
│   │   ├── predictor.py     # XGBoost prediction logic
│   │   └── routes/
│   │       ├── predict.py   # POST /predict, POST /predict/save
│   │       └── history.py   # GET /history, GET/DELETE /history/{id}
│   ├── model/
│   │   └── model.pkl        # XGBoost model (not committed to git)
│   ├── .env.example         # Environment variable template
│   ├── pyproject.toml       # Python dependencies
│   ├── Dockerfile
│   └── init.sql
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Home page
│   │   ├── predict/page.tsx # Prediction form
│   │   ├── history/page.tsx # History table
│   │   └── contact/page.tsx # Contact page
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── FormInput.tsx
│   │   └── ResultCard.tsx
│   ├── next.config.js       # API proxy rewrites (/api/* → backend)
│   ├── package.json
│   └── Dockerfile
│
└── docker-compose.yml
```

## How It Works

The Next.js frontend uses `next.config.js` rewrites to proxy all `/api/*` requests to the Railway backend, so no CORS issues arise from the browser:

```
Browser → /api/predict  →  Next.js rewrite  →  Railway backend /predict
```

The backend runs an XGBoost model against parental blood values and returns a probability score. Results above the **0.35 threshold** are classified as **Risk**.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/predict` | Run prediction (without saving) |
| `POST` | `/predict/save` | Run prediction and save to DB |
| `GET`  | `/history` | Paginated history (search + sort) |
| `GET`  | `/history/{id}` | Single prediction detail |
| `DELETE` | `/history/{id}` | Delete a prediction |
| `GET`  | `/health` | Health check |
| `GET`  | `/db-health` | Database health check |

## Environment Variables

### Frontend (Vercel)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://risk-thalassemia-web-production.up.railway.app` |

### Backend (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `MODEL_PATH` | Path to model file relative to `backend/` | `model/model.pkl` |
| `PORT` | Port for the HTTP server | `8000` |

> **Security**: Never commit `.env` files or credentials. The `backend/.gitignore` already excludes `.env`. Use `backend/.env.example` as a template.

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- Python 3.11+
- PostgreSQL running locally (or use Docker Compose)
- `model/model.pkl` — your trained XGBoost model file

### Option A: Docker Compose (recommended)

```bash
# Place your model file first
cp /path/to/model.pkl backend/model/model.pkl

# Start all services (frontend, backend, postgres)
docker compose up -d

# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000
# API Docs:  http://localhost:8000/docs
```

```bash
docker compose down        # Stop
docker compose down -v     # Stop and delete database volumes
```

### Option B: Manual Setup

#### Backend

```bash
cd backend

# Install dependencies (pip or uv)
pip install -r requirements.txt
# or: uv sync

# Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL to your local postgres instance

# Create the database
createdb thalassemia_db
psql -d thalassemia_db -f init.sql

# Run the server
uvicorn app.main:app --reload --port 8000
```

> **macOS**: XGBoost requires the OpenMP runtime. Install with `brew install libomp`.

#### Frontend

```bash
cd frontend

npm install

# Create a local env file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev   # http://localhost:3000
```

## Deployment Guide

### Backend → Railway

1. Create a new Railway project and add a **PostgreSQL** service.
2. Add a second service pointed at the `backend/` folder (or the root repo with the `backend` Dockerfile).
3. Set the following environment variables on the backend service:
   - `DATABASE_URL` — copy the internal connection string from the PostgreSQL service
   - `MODEL_PATH` — `model/model.pkl`
   - `PORT` — `8000`
4. Upload or mount `model/model.pkl` (Railway Volume or build step).
5. Deploy. The `/health` and `/db-health` endpoints can be used as Railway health checks.

### Frontend → Vercel

1. Import the GitHub repository (`Koonavoot/risk-thalassemia-web`) into Vercel.
2. Set the **Root Directory** to `frontend`.
3. Add the environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://risk-thalassemia-web-production.up.railway.app`
4. Deploy. Vercel's build will automatically pick up `next.config.js` rewrites; all `/api/*` traffic is proxied to Railway.

## ML Model Details

### Input Features (per parent)
| Feature | Unit |
|---------|------|
| Hb (Hemoglobin) | g/dL |
| Hct (Hematocrit) | % |
| MCV (Mean Corpuscular Volume) | fL |
| MCH (Mean Corpuscular Hemoglobin) | pg |
| DCIP (Dichlorophenol Indophenol test) | Positive / Negative |

### Feature order fed to model
```
['Hb mother', 'Hb father', 'Hct mother', 'Hct father',
 'MCV mother', 'MCV father', 'MCH mother', 'MCH father',
 'Dichrolophenol Indolephenol M', 'Dichrolophenol Indolephenol F']
```

### Classification Threshold
- `probability >= 0.35` → **Risk**
- `probability < 0.35` → **No Risk**

## Medical Disclaimer

> ⚠️ This tool is intended for **screening support only** and must not replace professional medical diagnosis or laboratory confirmation.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) — Python package manager (install: `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- [Node.js](https://nodejs.org/) 18+ and npm
- [Docker](https://www.docker.com/) (optional, for containerized setup)

## Quick Start

### Using Docker Compose

1. **Add your model file**
   ```bash
   # Place your trained XGBoost model in:
   backend/model/model.pkl
   ```

2. **Start all services**
   ```bash
   docker compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

4. **Stop services**
   ```bash
   docker compose down        # Stop all services
   docker compose down -v     # Stop and remove volumes (deletes database data)
   ```

### Manual Setup

#### Backend

1. **Install dependencies**
   ```bash
   cd backend
   uv sync
   ```

2. **Set up PostgreSQL**
   ```bash
   # Create database
   createdb thalassemia_db

   # Run init script
   psql -d thalassemia_db -f init.sql
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Run the server**
   ```bash
   uv run uvicorn app.main:app --reload
   ```

> **macOS note**: XGBoost requires OpenMP runtime. Install it with `brew install libomp`.

#### Frontend

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Prediction
- `POST /predict` — Make a prediction (without saving)
- `POST /predict/save` — Save prediction to database

### History
- `GET /history` — Get paginated history with search and sort
- `GET /history/{id}` — Get specific prediction details
- `DELETE /history/{id}` — Delete a prediction

## Validation Rules

- Hb must be > 0
- Hct must be between 0–100 (%)
- Date of birth must be in the past
- DCIP must be "Positive" or "Negative"

## Medical Disclaimer

⚠️ **Important**: This tool is intended for screening support only and should not replace professional medical diagnosis or laboratory confirmation.

## License

For medical/research use only.