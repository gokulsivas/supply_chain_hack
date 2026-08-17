from sqlalchemy import text
from sqlalchemy.engine import Engine

def bootstrap_schema(engine: Engine) -> None:
    """
    Idempotent schema bootstrap script for the Supply Chain Control Tower.
    Ensures tables, columns, constraints, and indexes added for Smart Logistics
    and PR2/E2 stages are present in PostgreSQL.
    """
    
    with engine.begin() as conn:
        # 1. Shipments updates
        try:
            conn.execute(text(
                "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS purchase_order_id VARCHAR(36);"
            ))
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
            conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'fk_shipments_purchase_order_id'
                    ) THEN
                        ALTER TABLE shipments ADD CONSTRAINT fk_shipments_purchase_order_id FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (id);
                    END IF;
                END
                $$;
            """))
        except Exception as e:
            print(f"[bootstrap] Warning handling shipments: {e}")

        # 2. Purchase Requests updates
        try:
            conn.execute(text(
                "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS recommended_supplier_id VARCHAR(36);"
            ))
            conn.execute(text(
                "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS supplier_recommendation_json JSON;"
            ))
            conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'fk_purchase_requests_recommended_supplier_id'
                    ) THEN
                        ALTER TABLE purchase_requests ADD CONSTRAINT fk_purchase_requests_recommended_supplier_id FOREIGN KEY (recommended_supplier_id) REFERENCES suppliers (id);
                    END IF;
                END
                $$;
            """))
        except Exception as e:
            print(f"[bootstrap] Warning handling purchase_requests: {e}")

        # 3. Trucks enhancements for Smart Logistics telemetry
        try:
            conn.execute(text("""
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS source_asset_id VARCHAR(50);
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS display_lat DOUBLE PRECISION;
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS display_lng DOUBLE PRECISION;
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS inventory_level DOUBLE PRECISION;
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION;
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS humidity DOUBLE PRECISION;
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS traffic_status VARCHAR(50);
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS waiting_time DOUBLE PRECISION;
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS logistics_delay_reason VARCHAR(100);
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS asset_utilization DOUBLE PRECISION;
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS demand_forecast DOUBLE PRECISION;
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN DEFAULT FALSE;
                ALTER TABLE trucks ADD COLUMN IF NOT EXISTS latest_telemetry_timestamp TIMESTAMP WITH TIME ZONE;
            """))
        except Exception as e:
            print(f"[bootstrap] Warning handling trucks: {e}")

        # 4. Truck Telemetry table creation and indexes
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS truck_telemetry (
                    id VARCHAR(36) PRIMARY KEY,
                    truck_id VARCHAR(36) REFERENCES trucks (id) ON DELETE CASCADE,
                    source_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
                    source_asset_id VARCHAR(50) NOT NULL,
                    source_latitude DOUBLE PRECISION NOT NULL,
                    source_longitude DOUBLE PRECISION NOT NULL,
                    display_latitude DOUBLE PRECISION,
                    display_longitude DOUBLE PRECISION,
                    inventory_level DOUBLE PRECISION,
                    shipment_status VARCHAR(50),
                    temperature DOUBLE PRECISION,
                    humidity DOUBLE PRECISION,
                    traffic_status VARCHAR(50),
                    waiting_time DOUBLE PRECISION,
                    logistics_delay_reason VARCHAR(100),
                    asset_utilization DOUBLE PRECISION,
                    demand_forecast DOUBLE PRECISION,
                    logistics_delay BOOLEAN DEFAULT FALSE,
                    user_transaction_amount DOUBLE PRECISION,
                    user_purchase_frequency DOUBLE PRECISION,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
                );

                CREATE INDEX IF NOT EXISTS ix_truck_telemetry_truck_id ON truck_telemetry (truck_id);
                CREATE INDEX IF NOT EXISTS ix_truck_telemetry_source_timestamp ON truck_telemetry (source_timestamp);
                CREATE INDEX IF NOT EXISTS ix_truck_telemetry_source_asset_id ON truck_telemetry (source_asset_id);
                CREATE INDEX IF NOT EXISTS ix_truck_telemetry_shipment_status ON truck_telemetry (shipment_status);
                CREATE INDEX IF NOT EXISTS ix_truck_telemetry_logistics_delay ON truck_telemetry (logistics_delay);
                CREATE INDEX IF NOT EXISTS ix_truck_telemetry_asset_ts ON truck_telemetry (source_asset_id, source_timestamp);
            """))
        except Exception as e:
            print(f"[bootstrap] Warning handling truck_telemetry: {e}")

    print("[bootstrap_schema] Schema bootstrap checks completed successfully.")
