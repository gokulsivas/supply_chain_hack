from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine

# Import all models so SQLAlchemy metadata discovers them before create_all
import app.models  # noqa: F401

from app.api.routes import auth as auth_router
from app.api.routes import logistics as logistics_router
from app.api.routes import procurement as procurement_router
from app.api.routes import suppliers as suppliers_router
from app.api.routes import finance as finance_router
from app.api.routes import analytics as analytics_router

# ── Create tables (prototype-only; use Alembic in production) ─────
Base.metadata.create_all(bind=engine)

from app.core.schema_bootstrap import bootstrap_schema
bootstrap_schema(engine)

# ── Seed demo data ────────────────────────────────────────────────
from app.utils.seed_logistics import seed_logistics  # noqa: E402
from app.utils.seed_procurement import seed_procurement # noqa: E402

_db = SessionLocal()
try:
    seed_logistics(_db)
    seed_procurement(_db)
finally:
    _db.close()

# ── Application ───────────────────────────────────────────────────
app = FastAPI(
    title="Supply Chain Control Tower API",
    version="1.0.0",
    description="Cognizant Hackathon — E2 + PR2",
)

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.FRONTEND_ORIGIN,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────
app.include_router(auth_router.router, prefix="/api")
app.include_router(logistics_router.router, prefix="/api")
app.include_router(procurement_router.router, prefix="/api")
app.include_router(suppliers_router.router, prefix="/api")
app.include_router(finance_router.router, prefix="/api")
app.include_router(analytics_router.router, prefix="/api")

# ── Health ────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
def health_check():
    return {
        "status": "ok",
        "service": "Supply Chain Control Tower API",
        "use_cases": ["E2 — Where's My Truck?", "PR2 — Autonomous P2P"],
    }