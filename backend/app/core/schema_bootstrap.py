from sqlalchemy import text
from sqlalchemy.engine import Engine

def bootstrap_schema(engine: Engine) -> None:
    """
    Idempotent schema bootstrap script for the Hackathon prototype.
    Ensures that columns added after initial table creation are present,
    avoiding the need for Alembic migrations for this specific scope.
    """
    
    # PostgreSQL supports `ADD COLUMN IF NOT EXISTS` natively.
    # We apply this specifically to the columns added for PR2 Stage 2.
    
    with engine.begin() as conn:
        # Add purchase_order_id to shipments
        try:
            conn.execute(text(
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS purchase_order_id VARCHAR(36);"
            ))
            # Safe way to add a unique constraint if it doesn't exist
            # PostgreSQL 11+ supports 'IF NOT EXISTS' for indexes but not for UNIQUE constraints natively 
            # via ALTER TABLE cleanly without procedural blocks, so we do it via plpgsql
            conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'uq_shipments_purchase_order_id'
                    ) THEN
                        ALTER TABLE shipments ADD CONSTRAINT uq_shipments_purchase_order_id UNIQUE (purchase_order_id);
                    END IF;
                END
                $$;
            """))
        except Exception as e:
            print(f"[bootstrap] Warning handling shipments: {e}")

        # Add columns to purchase_requests
        try:
            conn.execute(text(
                "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS recommended_supplier_id VARCHAR(36);"
            ))
            conn.execute(text(
                "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS supplier_recommendation_json JSON;"
            ))
        except Exception as e:
            print(f"[bootstrap] Warning handling purchase_requests: {e}")

    print("[bootstrap_schema] Schema bootstrap checks completed successfully.")
