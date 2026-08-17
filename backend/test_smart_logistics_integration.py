"""
Phase 10 — Smart Logistics Integration & Data Verification Test Suite
Validates database counts, deduplication, analytics queries, and API endpoints.
"""

from datetime import datetime, timezone
from sqlalchemy import func
from app.core.database import SessionLocal
from app.models.logistics import Truck, Shipment, TruckTelemetry, LogisticsAlert
from app.api.routes.logistics import (
    list_trucks,
    get_truck_detail,
    get_truck_telemetry,
    get_logistics_analytics_summary,
    search_tracking,
    simulate_truck_step,
    simulate_all_trucks
)
from app.api.routes.analytics import get_analytics_summary

def run_integration_tests():
    print("=" * 70)
    print("PHASE 10: SMART LOGISTICS POSTGRESQL & API VALIDATION")
    print("=" * 70)

    db = SessionLocal()
    try:
        # 1. Database Counts
        total_trucks = db.query(Truck).count()
        total_shipments = db.query(Shipment).count()
        total_telemetry = db.query(TruckTelemetry).count()

        print(f"\n[1. PostgreSQL Row Counts]")
        print(f"  - Total Trucks:           {total_trucks}")
        print(f"  - Total Shipments:        {total_shipments}")
        print(f"  - Total Telemetry Events: {total_telemetry}")

        assert total_trucks >= 10, f"Expected at least 10 trucks, got {total_trucks}"
        assert total_shipments >= 10, f"Expected at least 10 shipments, got {total_shipments}"
        assert total_telemetry == 1000, f"Expected exactly 1000 telemetry rows, got {total_telemetry}"

        # 2. Duplicate Keys Check
        duplicates = (
            db.query(TruckTelemetry.source_asset_id, TruckTelemetry.source_timestamp, func.count(TruckTelemetry.id))
            .group_by(TruckTelemetry.source_asset_id, TruckTelemetry.source_timestamp)
            .having(func.count(TruckTelemetry.id) > 1)
            .all()
        )
        print(f"\n[2. Deduplication Check]")
        print(f"  - Duplicate (asset, timestamp) keys: {len(duplicates)}")
        assert len(duplicates) == 0, f"Found {len(duplicates)} duplicate telemetry rows!"

        # 3. Coordinate Integrity Check
        invalid_coords = (
            db.query(TruckTelemetry)
            .filter(
                (TruckTelemetry.source_latitude < -90.0) |
                (TruckTelemetry.source_latitude > 90.0) |
                (TruckTelemetry.source_longitude < -180.0) |
                (TruckTelemetry.source_longitude > 180.0)
            )
            .count()
        )
        print(f"\n[3. Coordinate Validation]")
        print(f"  - Out-of-bounds telemetry coordinates: {invalid_coords}")
        assert invalid_coords == 0, f"Found {invalid_coords} out-of-bounds coordinates!"

        # 4. Status Distributions
        status_counts = dict(
            db.query(TruckTelemetry.shipment_status, func.count(TruckTelemetry.id))
            .group_by(TruckTelemetry.shipment_status)
            .all()
        )
        traffic_counts = dict(
            db.query(TruckTelemetry.traffic_status, func.count(TruckTelemetry.id))
            .group_by(TruckTelemetry.traffic_status)
            .all()
        )
        delay_counts = dict(
            db.query(TruckTelemetry.logistics_delay_reason, func.count(TruckTelemetry.id))
            .group_by(TruckTelemetry.logistics_delay_reason)
            .all()
        )
        min_ts = db.query(func.min(TruckTelemetry.source_timestamp)).scalar()
        max_ts = db.query(func.max(TruckTelemetry.source_timestamp)).scalar()

        print(f"\n[4. Telemetry Distributions]")
        print(f"  - Timestamp Range: {min_ts} to {max_ts}")
        print(f"  - Shipment Statuses: {status_counts}")
        print(f"  - Traffic Statuses:  {traffic_counts}")
        print(f"  - Delay Reasons:     {delay_counts}")

        # 5. API Endpoint Smoke Tests
        print(f"\n[5. API Endpoint Smoke Tests]")

        # A: list_trucks
        trucks = list_trucks(db)
        print(f"  - GET /api/logistics/trucks: OK ({len(trucks)} trucks)")

        # B: get_truck_detail
        t_sample = get_truck_detail("TRK-1001", db)
        print(f"  - GET /api/logistics/trucks/TRK-1001: OK (Status: {t_sample.status}, Temp: {t_sample.temperature}°C, Hum: {t_sample.humidity}%)")

        # C: get_truck_telemetry
        telem = get_truck_telemetry("TRK-1001", 10, db)
        print(f"  - GET /api/logistics/trucks/TRK-1001/telemetry: OK ({len(telem)} records)")
        assert len(telem) > 0, "Expected telemetry history for TRK-1001"

        # D: get_logistics_analytics_summary
        log_analytics = get_logistics_analytics_summary(db)
        print(f"  - GET /api/logistics/analytics/summary: OK (Delay Rate: {log_analytics['logistics_delay_rate']}%, Avg Wait: {log_analytics['average_waiting_time']}h)")

        # E: get_analytics_summary (Executive Overview)
        exec_analytics = get_analytics_summary(db)
        print(f"  - GET /api/analytics/summary: OK (Total Tracked: {exec_analytics['logistics']['total_trucks']}, Telemetry Records: {exec_analytics['telemetry_summary']['total_records']})")

        # F: search_tracking
        track_res = search_tracking("TRK-1003", db)
        print(f"  - GET /api/logistics/track/TRK-1003: OK (Origin: {track_res['truck'].origin_name} -> Dest: {track_res['truck'].dest_name}, ETA: {track_res['eta']})")

        # G: simulate_truck_step
        sim_truck = simulate_truck_step(t_sample.id, db)
        print(f"  - POST /api/logistics/trucks/{t_sample.id}/simulate-step: OK (Progress: {sim_truck.progress_percent}%)")

        # H: simulate_all_trucks
        all_sim = simulate_all_trucks(db)
        print(f"  - POST /api/logistics/simulate-all: OK ({all_sim.get('advanced_count', 0)} fleet vehicles advanced)")

        print("\n" + "=" * 70)
        print("ALL SMART LOGISTICS INTEGRATION & API TESTS PASSED!")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    run_integration_tests()
