# Thalassemia Risk Prediction System

A web-based clinical decision support tool for predicting thalassemia risk in offspring based on parental blood test values.

## Tech Stack

- **Frontend**: Next.js 14 (React) with TypeScript
- **Backend**: FastAPI (Python) with [uv](https://docs.astral.sh/uv/) package manager
- **Database**: PostgreSQL
- **ML Model**: XGBoost

## Features

1. **Home Page** - Introduction and system overview
2. **Predict Page** - Input parental blood values and get risk predictions
3. **History Page** - View and search past predictions
4. **Contact Page** - Contact information and FAQ

## Project Structure

```
Thalassemia_predict_project/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── database.py      # Database connection
│   │   ├── predictor.py     # ML prediction logic
│   │   └── routes/
│   │       ├── predict.py   # Prediction endpoints
│   │       └── history.py   # History endpoints
│   ├── model/
│   │   └── model.pkl        # XGBoost model (add your own)
│   ├── pyproject.toml       # Dependencies (managed by uv)
│   ├── uv.lock              # Lockfile (deterministic installs)
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
│   ├── package.json
│   └── Dockerfile
│
└── docker-compose.yml
```

## Input Features

### Numerical Columns
- Hb (Hemoglobin) - g/dL
- Hct (Hematocrit) - %
- MCV (Mean Corpuscular Volume) - fL
- MCH (Mean Corpuscular Hemoglobin) - pg

### Categorical Columns
- Dichlorophenol Indolephenol (DCIP) - Positive/Negative

### Feature Order for Model
```
['Hb mother', 'Hb father', 'Hct mother', 'Hct father',
 'MCV mother', 'MCV father', 'MCH mother', 'MCH father',
 'Dichrolophenol Indolephenol M', 'Dichrolophenol Indolephenol F']
```

## Business Logic

- **Threshold**: 0.35
- **Output**: 
  - `probability >= 0.35` → Risk
  - `probability < 0.35` → No Risk

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