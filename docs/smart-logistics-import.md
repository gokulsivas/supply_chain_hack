# Smart Logistics Import & Pipeline Guide

This guide documents the procedures for importing, re-importing, verifying, and troubleshooting the Smart Logistics dataset in PostgreSQL.

---

## 1. Commands

### Initial / Incremental Import
```bash
cd backend
.\venv\Scripts\python.exe scripts/import_smart_logistics.py
```

### Idempotent Repeat Import
Running the command again will automatically skip any rows with matching `(source_asset_id, source_timestamp)` deduplication keys without creating duplicate records:
```bash
cd backend
.\venv\Scripts\python.exe scripts/import_smart_logistics.py
```

### Check Database Counts in PostgreSQL
```bash
cd backend
.\venv\Scripts\python.exe -c "
from app.core.database import SessionLocal
from app.models.logistics import Truck, Shipment, TruckTelemetry
db = SessionLocal()
print('Total Trucks:', db.query(Truck).count())
print('Total Shipments:', db.query(Shipment).count())
print('Total Telemetry Rows:', db.query(TruckTelemetry).count())
db.close()
"
```

---

## 2. Telemetry Schema & Indexes

- **Table**: `truck_telemetry`
- **Primary Key**: `id` (UUID string)
- **Foreign Key**: `truck_id` $\rightarrow$ `trucks.id` (ON DELETE CASCADE)
- **Indexes**:
  - `ix_truck_telemetry_truck_id`
  - `ix_truck_telemetry_source_timestamp`
  - `ix_truck_telemetry_source_asset_id`
  - `ix_truck_telemetry_shipment_status`
  - `ix_truck_telemetry_logistics_delay`
  - `ix_truck_telemetry_asset_ts` (`source_asset_id`, `source_timestamp`)

---

## 3. Data Integrity Guarantees

1. **Transaction Safety**: All ETL mutations execute inside a single transactional block with automatic rollback on error.
2. **Coordinate Validation**: Validates latitude $\in [-90, 90]$ and longitude $\in [-180, 180]$.
3. **Dual-Coordinate Storage**:
   - `source_latitude`, `source_longitude`: Original raw values from the CSV.
   - `display_latitude`, `display_longitude`, `trucks.current_lat`, `trucks.current_lng`: Regional corridor coordinates for map visualization and smooth marker animation.
4. **No Secrets/Credentials**: Script uses database connection parameters from `.env` via `app.core.config.settings` and never logs credentials.
