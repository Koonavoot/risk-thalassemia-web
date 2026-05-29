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

# Install PyTorch CPU-only FIRST (separate layer for better caching)
# Using --index-url to get the smaller CPU-only build (~260MB vs 2GB GPU)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
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

# Limit threads to reduce memory (PyTorch/NumPy create threads per core)
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV TORCH_NUM_THREADS=1

# Single worker — multiple workers duplicate all models in memory
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
