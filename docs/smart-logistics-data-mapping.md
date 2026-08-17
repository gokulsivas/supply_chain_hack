# Smart Logistics Dataset Data Mapping Specification

This document defines the canonical mapping between `smart_logistics_dataset.csv` and the PostgreSQL schema, FastAPI backend, and Next.js frontend of the Supply Chain Control Tower.

---

## 1. Dataset Overview

- **Source File**: `data/smart_logistics_dataset.csv` (and workspace root `smart_logistics_dataset.csv`)
- **Total Records**: 1,000 telemetry rows
- **Distinct Assets**: 10 assets (`Truck_1` through `Truck_10`)
- **Time Range**: `2024-01-01 11:37:57` to `2024-12-30 20:21:58`
- **Geographic Bounds (Source)**: Latitude `-89.7915` to `89.8701`, Longitude `-179.8202` to `179.9237`
- **Shipment Statuses**: `In Transit` (312), `Delivered` (338), `Delayed` (350)
- **Traffic Statuses**: `Clear` (328), `Heavy` (327), `Detour` (345)
- **Delay Reasons**: `None` (263), `Weather` (267), `Traffic` (236), `Mechanical Failure` (234)
- **Logistics Delay Flag**: `0` (434), `1` (566)
- **Null Values**: 0 nulls across all 16 columns

---

## 2. Column-by-Column Mapping Matrix

| CSV Column | Data Type | Database Table & Column | Mapping Classification | Target Field Notes & Transformations |
| :--- | :--- | :--- | :--- | :--- |
| `Timestamp` | String (ISO) | `truck_telemetry.source_timestamp`, `trucks.latest_telemetry_timestamp` | Existing / Telemetry | Parsed as timezone-aware UTC timestamp. Used for deduplication key (`source_asset_id` + `source_timestamp`). |
| `Asset_ID` | String | `trucks.truck_code`, `trucks.source_asset_id`, `truck_telemetry.source_asset_id` | Existing / Extended | Formatted into standard fleet codes: `Truck_1` $\rightarrow$ `TRK-1001` (up to `TRK-1010`), retaining `source_asset_id="Truck_1"`. |
| `Latitude` | Float | `truck_telemetry.source_latitude`, `trucks.current_lat` | Existing / Telemetry | Original raw global coordinate stored in `source_latitude`. Validated in $[-90, 90]$. |
| `Longitude` | Float | `truck_telemetry.source_longitude`, `trucks.current_lng` | Existing / Telemetry | Original raw global coordinate stored in `source_longitude`. Validated in $[-180, 180]$. |
| `Inventory_Level` | Integer/Float | `truck_telemetry.inventory_level`, `trucks.inventory_level` | New Column / Telemetry | Direct numeric cargo inventory capacity index. |
| `Shipment_Status` | String | `truck_telemetry.shipment_status`, `trucks.status`, `shipments.status` | Existing Enum Mapping | Normalized to system enums: `"In Transit"` $\rightarrow$ `IN_TRANSIT`, `"Delivered"` $\rightarrow$ `DELIVERED`, `"Delayed"` $\rightarrow$ `DELAYED`. |
| `Temperature` | Float | `truck_telemetry.temperature`, `trucks.temperature` | New Column / Telemetry | Ambient / cargo cold chain telemetry (in °C). |
| `Humidity` | Float | `truck_telemetry.humidity`, `trucks.humidity` | New Column / Telemetry | Ambient relative humidity percentage (0-100%). |
| `Traffic_Status` | String | `truck_telemetry.traffic_status`, `trucks.traffic_status` | New Column / Telemetry | `"Clear"`, `"Heavy"`, `"Detour"`. |
| `Waiting_Time` | Float | `truck_telemetry.waiting_time`, `trucks.waiting_time` | New Column / Telemetry | Depot / yard waiting duration (hours). |
| `User_Transaction_Amount` | Float | `truck_telemetry.user_transaction_amount` | Analytics-Only | Commercial value of freight cargo associated with batch. |
| `User_Purchase_Frequency` | Float | `truck_telemetry.user_purchase_frequency` | Analytics-Only | Customer procurement cadence index for analytics. |
| `Logistics_Delay_Reason` | String | `truck_telemetry.logistics_delay_reason`, `trucks.logistics_delay_reason` | New Column / Telemetry | `"None"`, `"Weather"`, `"Traffic"`, `"Mechanical Failure"`. |
| `Asset_Utilization` | Float | `truck_telemetry.asset_utilization`, `trucks.asset_utilization` | New Column / Telemetry | Active asset usage ratio (0.0 to 1.0). |
| `Demand_Forecast` | Float | `truck_telemetry.demand_forecast`, `trucks.demand_forecast` | New Column / Telemetry | Forward predictive demand index. |
| `Logistics_Delay` | Integer (0/1) | `truck_telemetry.logistics_delay`, `trucks.is_delayed` | Existing / Telemetry | Boolean flag (`True` if 1, `False` if 0). |

---

## 3. Route Normalization & Display Coordinate Handling

Because the CSV dataset contains arbitrary global coordinates spanning from $-89.79^\circ$ to $+89.87^\circ$ latitude, the system implements a two-tier coordinate structure:
1. **Source Coordinate (`source_latitude`, `source_longitude`)**: Preserves the exact, unaltered dataset value in PostgreSQL.
2. **Display Route Coordinate (`display_latitude`, `display_longitude`, `trucks.current_lat`, `trucks.current_lng`)**: Interpolated along real regional Indian freight corridors (e.g. Chennai, Bengaluru, Mumbai, Kolkata, Delhi, Balurghat) based on asset progression to ensure realistic map visualization and animation.

---

## 4. Entity Relationships

```
+-------------------------------------------------------------+
|                           Trucks                            |
| id (PK)                                                     |
| truck_code (TRK-1001 .. TRK-1010)                           |
| source_asset_id ("Truck_1" .. "Truck_10")                   |
| shipment_id (FK -> shipments.id)                            |
| status (IN_TRANSIT, DELIVERED, DELAYED)                     |
| current_lat, current_lng, display_lat, display_lng          |
| inventory_level, temperature, humidity, traffic_status      |
| waiting_time, logistics_delay_reason, asset_utilization     |
+------------------------------+------------------------------+
                               | 1
                               |
                               | *
+------------------------------v------------------------------+
|                       TruckTelemetry                        |
| id (PK)                                                     |
| truck_id (FK -> trucks.id)                                  |
| source_timestamp, source_asset_id                           |
| source_latitude, source_longitude                           |
| display_latitude, display_longitude                         |
| inventory_level, shipment_status, temperature, humidity     |
| traffic_status, waiting_time, logistics_delay_reason        |
| asset_utilization, demand_forecast, logistics_delay         |
| user_transaction_amount, user_purchase_frequency            |
+-------------------------------------------------------------+
```
