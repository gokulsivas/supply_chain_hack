# Frontend Implementation Plan
## Supply Chain Control Tower — Cognizant E2 + PR2 Hackathon

> **Status**: Planning — no pages built yet.
> **Stack**: Next.js 16, TypeScript, Tailwind v4, shadcn/ui (base-nova), Lucide, Motion for React, Recharts, React-Leaflet.
> **Backend**: FastAPI at `http://127.0.0.1:8000`. No secrets in frontend code.

---

## 1. Route Map

```
/                          → redirect → /login (unauthenticated) or /dashboard (authenticated)
/login                     → LoginPage
/dashboard                 → DashboardPage          (overview KPIs, recent alerts)

── E2: Where's My Truck? ──────────────────────────────────────────────
/logistics/tracking        → TruckTrackingPage       (live map + search)
/logistics/yard            → YardBoardPage           (yard slot grid)
/logistics/docks           → DockAssignmentPage      (dock schedule board)

── PR2: Autonomous P2P ────────────────────────────────────────────────
/procurement/ai-assistant  → AIProcurementPage       (conversational requisition chat)
/procurement/suppliers     → SuppliersPage           (supplier recommendation list)
/procurement/purchase-orders → PurchaseOrdersPage    (PO list + detail drawer)

/finance/invoices          → InvoicesPage            (OCR-extracted invoice list)
/finance/matching          → ThreeWayMatchPage       (anomaly detection + match view)
/finance/payments          → PaymentApprovalsPage    (approval queue)

/analytics                 → AnalyticsPage           (cross-module charts)
```

**Auth flow**: JWT stored in a cookie (`token`). `src/middleware.ts` checks the cookie at the edge on every protected route and redirects to `/login` if absent. `useAuth` hook decodes the JWT client-side for user info.

---

## 2. Component Map

```
src/
├── app/                          # Thin route wrappers only
│   ├── layout.tsx                # Root layout (font, ThemeProvider, Toaster)
│   ├── page.tsx                  # Redirect → /login or /dashboard
│   ├── login/page.tsx            # → <LoginPage />
│   ├── dashboard/page.tsx        # → <DashboardPage />
│   ├── logistics/
│   │   ├── tracking/page.tsx     # → <TruckTrackingPage />
│   │   ├── yard/page.tsx         # → <YardBoardPage />
│   │   └── docks/page.tsx        # → <DockAssignmentPage />
│   ├── procurement/
│   │   ├── ai-assistant/page.tsx # → <AIProcurementPage />
│   │   ├── suppliers/page.tsx    # → <SuppliersPage />
│   │   └── purchase-orders/page.tsx → <PurchaseOrdersPage />
│   ├── finance/
│   │   ├── invoices/page.tsx     # → <InvoicesPage />
│   │   ├── matching/page.tsx     # → <ThreeWayMatchPage />
│   │   └── payments/page.tsx     # → <PaymentApprovalsPage />
│   └── analytics/page.tsx        # → <AnalyticsPage />
│
├── components/
│   ├── pages/                    # One file per page, real implementation
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── TruckTrackingPage.tsx
│   │   ├── YardBoardPage.tsx
│   │   ├── DockAssignmentPage.tsx
│   │   ├── AIProcurementPage.tsx
│   │   ├── SuppliersPage.tsx
│   │   ├── PurchaseOrdersPage.tsx
│   │   ├── InvoicesPage.tsx
│   │   ├── ThreeWayMatchPage.tsx
│   │   ├── PaymentApprovalsPage.tsx
│   │   └── AnalyticsPage.tsx
│   │
│   ├── layout/
│   │   ├── AppShell.tsx          # Sidebar + main content grid wrapper
│   │   ├── Sidebar.tsx           # Desktop sidebar nav (collapsible)
│   │   ├── MobileNav.tsx         # Sheet-based mobile nav
│   │   ├── Topbar.tsx            # Page title + user menu + notifications
│   │   └── NavItem.tsx           # Individual nav link with active state
│   │
│   ├── shared/
│   │   ├── StatusBadge.tsx       # Color + text + icon — never color-only
│   │   ├── KpiCard.tsx           # Metric value + label + trend
│   │   ├── DataTable.tsx         # Sortable table wrapper
│   │   ├── SearchInput.tsx       # Debounced search field
│   │   ├── EmptyState.tsx        # Empty / no-results state
│   │   ├── LoadingSpinner.tsx    # Accessible spinner
│   │   ├── ErrorBoundary.tsx     # React error boundary
│   │   ├── PageHeader.tsx        # Title + subtitle + action slot
│   │   └── AlertBanner.tsx       # Dismissible banner
│   │
│   ├── logistics/
│   │   ├── TruckMap.tsx          # React-Leaflet live map (client)
│   │   ├── TruckMarker.tsx       # Custom Leaflet marker
│   │   ├── TrackingSearch.tsx    # Shipment/truck lookup
│   │   ├── ETACard.tsx           # ETA + delay info
│   │   ├── YardGrid.tsx          # Yard slot grid
│   │   ├── YardSlot.tsx          # Individual slot cell
│   │   ├── DockSchedule.tsx      # Timeline dock board
│   │   └── DockSlot.tsx          # Single dock row
│   │
│   ├── procurement/
│   │   ├── ChatInterface.tsx     # Conversational requisition (client)
│   │   ├── ChatMessage.tsx       # Message bubble
│   │   ├── SupplierCard.tsx      # Supplier recommendation card
│   │   ├── SupplierList.tsx      # Filtered supplier grid
│   │   ├── POTable.tsx           # PO list table
│   │   ├── PODetailDrawer.tsx    # Slide-over PO detail
│   │   └── CVReceiptSimulator.tsx # Simulated CV receipt upload
│   │
│   └── finance/
│       ├── InvoiceList.tsx       # OCR invoice table
│       ├── InvoiceDetail.tsx     # OCR fields + image preview
│       ├── MatchRow.tsx          # Three-way match row
│       ├── AnomalyBadge.tsx      # Anomaly flag inline
│       ├── ApprovalQueue.tsx     # Payment approval list
│       └── ApprovalCard.tsx      # Single approval card
│
├── hooks/
│   ├── useAuth.ts               # Auth state + redirect
│   ├── useTruckWebSocket.ts     # Live WebSocket truck positions
│   ├── useDebounce.ts           # Generic debounce hook
│   └── useToast.ts              # Sonner wrapper
│
├── lib/
│   ├── api.ts                   # Axios instance + all API functions
│   ├── auth.ts                  # Cookie/JWT helpers
│   └── utils.ts                 # cn() (exists)
│
└── types/
    ├── auth.ts                  # User, LoginRequest, LoginResponse
    ├── logistics.ts             # Truck, Shipment, YardSlot, Dock
    ├── procurement.ts           # Requisition, Supplier, PurchaseOrder
    └── finance.ts               # Invoice, MatchResult, PaymentApproval
```

---

## 3. Design Tokens (Tailwind v4)

Override `globals.css` `:root` with an enterprise indigo/slate palette:

| Token | Light value | Purpose |
|-------|-------------|---------|
| `--primary` | `oklch(0.47 0.18 254)` | Indigo-blue primary |
| `--primary-foreground` | `oklch(0.99 0 0)` | White on primary |
| `--background` | `oklch(0.98 0.004 264)` | Near-white slate tint |
| `--foreground` | `oklch(0.16 0.01 264)` | Near-black slate |
| `--muted` | `oklch(0.94 0.005 264)` | Muted surface |
| `--muted-foreground` | `oklch(0.48 0.01 264)` | Helper text |
| `--border` | `oklch(0.88 0.005 264)` | Subtle border |
| `--card` | `oklch(1 0 0)` | White card |
| `--radius` | `0.5rem` | 8px base radius |

**Semantic status** (via `StatusBadge` — always color + text + icon):
- Green: `oklch(0.56 0.18 142)` — success / on-time
- Amber: `oklch(0.75 0.18 78)` — warning / delayed
- Red: `oklch(0.58 0.24 27)` — critical / failed
- Blue: `oklch(0.52 0.18 242)` — informational

**Spacing**: 8px rhythm — `gap-2` (8px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px).

**Typography**:
- Page title: `text-xl font-semibold tracking-tight` (sentence case)
- Section title: `text-sm font-semibold uppercase tracking-wider text-muted-foreground`
- KPI value: `text-3xl font-bold tabular-nums`
- Body: `text-sm`
- Helper: `text-xs text-muted-foreground`

**Container**: `max-w-7xl mx-auto`

---

## 4. API Client & Auth Strategy

### `src/lib/api.ts`
- Axios instance with `baseURL: process.env.NEXT_PUBLIC_API_URL`
- Request interceptor: reads `token` cookie → `Authorization: Bearer <token>`
- Response interceptor: on `401` → clear cookie + `router.push('/login')`
- Named async functions per domain (`listTrucks()`, `getShipment()`, `listSuppliers()`, etc.)

### Auth Flow
1. `POST /auth/login` → `{ access_token, token_type }`
2. Store token in a JS-accessible cookie (not localStorage — XSS risk)
3. `src/middleware.ts` (Next.js edge middleware) checks cookie; redirects to `/login` if absent
4. `useAuth` hook: `user`, `logout()`, `isLoading`

### `.env.local` (fix required — current file has PowerShell echo artifact)
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000
```
> No API keys or secrets in any `NEXT_PUBLIC_*` variable or source file.

---

## 5. WebSocket Strategy (Live Truck Tracking)

**Hook**: `src/hooks/useTruckWebSocket.ts`

- Endpoint (backend to add): `ws://127.0.0.1:8000/ws/trucks`
- Message shape: `{ truck_id, lat, lng, status, eta_minutes, shipment_id }`
- Lifecycle: `useEffect` opens socket → `onmessage` updates `Map<truck_id, TruckPosition>` → cleanup on unmount
- Reconnect: exponential back-off (max 5 retries, 30s cap)
- Fallback: poll `GET /logistics/trucks` every 5s until WS endpoint exists

**TruckMap** is a `"use client"` component, loaded via `dynamic(() => ..., { ssr: false })`.

---

## 6. Reusable Component API Contracts

### Procurement
| Component | Key props |
|-----------|-----------|
| `ChatInterface` | `sessionId: string`, `onRequisitionCreated: (req: Requisition) => void` |
| `SupplierCard` | `supplier: Supplier`, `onSelect: (id: string) => void` |
| `PODetailDrawer` | `poId: string \| null`, `open: boolean`, `onClose: () => void` |

### Logistics
| Component | Key props |
|-----------|-----------|
| `TruckMap` | `trucks: TruckPosition[]`, `selectedId: string \| null` |
| `YardGrid` | `slots: YardSlot[]`, `onAssign: (slotId, truckId) => void` |
| `DockSchedule` | `docks: Dock[]`, `date: Date` |

### Finance
| Component | Key props |
|-----------|-----------|
| `MatchRow` | `match: MatchResult` |
| `ApprovalCard` | `approval: PaymentApproval`, `onApprove: () => void`, `onReject: () => void` |

---

## 7. Responsive Plan

| Breakpoint | Layout |
|-----------|--------|
| 320–639px | Single column; sidebar hidden; hamburger → `MobileNav` Sheet |
| 640–1023px | Sidebar collapsed to 48px icon rail |
| 1024–1919px | Sidebar 240px; `max-w-7xl` content |
| 1920px+ | Same, content centred |

- `AppShell`: CSS Grid `grid-cols-[240px_1fr]` on lg+
- Tables → card stacks on mobile via container queries
- Map: minimum `h-[400px]` on mobile

---

## 8. Accessibility Plan

- Semantic HTML: `<nav>`, `<main>`, `<header>`, `<aside>`, `<table>`, `<dialog>`
- Every field has a visible `<label>` (not just `aria-label`)
- Focus ring: `focus-visible:ring-2 focus-visible:ring-primary`
- Skip-to-main link as first element in `AppShell`
- `StatusBadge`: color + icon + text — never color-only
- Map markers: `aria-label` via Leaflet `DivIcon` `title`
- `DataTable`: `<th scope="col">` with descriptive sort button labels
- Contrast: ≥ 4.5:1 body text, ≥ 3:1 large UI text
- Keyboard: modal focus trap; sidebar keyboard-operable
- `prefers-reduced-motion` honored throughout

---

## 9. Motion Plan (`motion/react`)

| Interaction | Duration | Notes |
|------------|----------|-------|
| Page entrance | 200ms `easeOut` | `opacity 0→1`, `y 8→0` |
| KPI card stagger | 160ms + 40ms stagger | Max 5 cards |
| Sidebar open/close | 220ms `easeInOut` | Width transition |
| Mobile sheet | 240ms spring | `stiffness:300 damping:30` |
| Button tap | 80ms `scale 0.97` | Press feedback |
| Alert appear | 200ms `easeOut` | Opacity + translateY |
| Approval slide-out | 280ms `easeInOut` | After approve/reject |
| Truck marker | 800ms via Leaflet | `setLatLng` — not Motion |

All motion wrapped with `useReducedMotion()` check from `motion/react`.

---

## 10. Phased Build Order

### Phase 1 — Foundation
1. Fix `.env.local` (remove PowerShell echo artifact)
2. `globals.css` — override design tokens
3. `layout.tsx` — Inter font, metadata, ThemeProvider, Toaster
4. `src/middleware.ts` — auth route protection
5. `src/lib/api.ts` — Axios instance + interceptors
6. `src/lib/auth.ts` — cookie helpers
7. `src/types/` — all four type files
8. `src/hooks/useAuth.ts`, `useDebounce.ts`, `useToast.ts`

### Phase 2 — Shell & Login
9. `LoginPage.tsx`
10. `AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `MobileNav.tsx`, `NavItem.tsx`
11. All `src/components/shared/` components

### Phase 3 — E2: Where's My Truck?
12. `useTruckWebSocket.ts`
13. Logistics components → `TruckTrackingPage`, `YardBoardPage`, `DockAssignmentPage`
14. `DashboardPage` with E2 KPI cards

### Phase 4 — PR2: Autonomous P2P
15. Procurement components → `AIProcurementPage`, `SuppliersPage`, `PurchaseOrdersPage`
16. Dashboard updated with PR2 KPIs

### Phase 5 — Finance
17. Finance components → `InvoicesPage`, `ThreeWayMatchPage`, `PaymentApprovalsPage`

### Phase 6 — Analytics & Polish
18. `AnalyticsPage` with Recharts (on-time trend, PO cycle time, anomaly rate)
19. Cross-browser/mobile QA
20. Lighthouse accessibility pass
21. Motion polish + reduced-motion verification

---

## Open Notes

- **Backend auth** (`/auth/login`) not yet implemented → Phase 1-2 use mock bypass, replaced when backend ships it.
- **WebSocket** (`/ws/trucks`) not yet in backend → Phase 3 polls until WS is ready.
- **shadcn components** added via `npx shadcn add <component>` only when needed — no bulk installs.
- **React-Leaflet** loaded with `dynamic(..., { ssr: false })` to prevent SSR errors.
