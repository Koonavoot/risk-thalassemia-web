# === Builder Stage ===
FROM python:3.12-slim-bookworm AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (cache layer)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# === Runtime Stage ===
FROM python:3.12-slim-bookworm

# Install runtime dependency for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Setup non-root user
RUN groupadd --system --gid 1001 appuser \
    && useradd --system --gid 1001 --uid 1001 --create-home appuser

# Copy from builder
COPY --from=builder --chown=appuser:appuser /app /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

USER appuser
WORKDIR /app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
