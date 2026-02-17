# === Builder Stage ===
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
ENV UV_PYTHON_DOWNLOADS=0

WORKDIR /app

# Install system dependencies required for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (cached layer)
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-dev

# Copy application code
COPY . /app

# Sync again to install the project itself
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

# === Runtime Stage ===
FROM python:3.12-slim-bookworm

# Install runtime dependency for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Setup non-root user
RUN groupadd --system --gid 1001 appuser \
    && useradd --system --gid 1001 --uid 1001 --create-home appuser

# Copy the application from builder
COPY --from=builder --chown=appuser:appuser /app /app

# Set PATH to use venv executables
ENV PATH="/app/.venv/bin:$PATH"

USER appuser
WORKDIR /app

EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
