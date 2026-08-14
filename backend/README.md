# Backend Services

FastAPI + PostgreSQL prototype backend for the Supply Chain Control Tower.

## Database bootstrap

This hackathon prototype uses SQLAlchemy's `create_all` feature combined with a safe compatibility bootstrap script instead of full Alembic migrations. 

The `app.core.schema_bootstrap.bootstrap_schema` function natively intercepts the startup sequence, verifying and idempotently creating newly added Stage 2 schema columns (`purchase_order_id`, `recommended_supplier_id`, `supplier_recommendation_json`) if they are missing. This protects existing data while ensuring fresh environments generate correctly.

To run the system, simply start the server normally:
```bash
uvicorn app.main:app --reload
```
