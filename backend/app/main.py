from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError
import logging
from sqlalchemy import text

from app.database import engine, Base
from app.routes import predict, history, contact
from app.routes import auth

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Thalassemia Prediction API",
    description="API for predicting thalassemia risk based on parental blood values",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Set up rate limiter state
app.state.limiter = contact.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://risk-thalassemia-web.vercel.app",
        # "http://thalassemiaai.com",
        "https://thalassemiaai.com",
        # "http://www.thalassemiaai.com",
        "https://www.thalassemiaai.com",
        # "http://119.59.103.14:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(history.router)
app.include_router(contact.router)


# HTTPException handler — pass through as-is (401, 403, 404, etc.)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None) or {},
    )


# Global handler for truly unexpected errors only
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error"}
    )


@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Thalassemia Prediction API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.get("/db-health")
async def db_health_check():
    """Database connection health check endpoint."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected", "error": str(e)}
        )