---
name: premium-supply-chain-design
description: Standards for building the Cognizant E2 + PR2 Supply Chain Control Tower.
---

# Product context

Build a premium enterprise Supply Chain Control Tower for the Cognizant E2 + PR2 hackathon.

- E2: tracking lookup, live truck movement, ETA, delay alerts, yard board, dock assignment.
- PR2: conversational requisitions, supplier recommendation, purchase orders, simulated CV receipt, OCR invoice extraction, anomaly detection, three-way match, payment approval.

The product must feel like a credible enterprise operations system—not a generic AI dashboard or a marketing site.

# Stack

- Frontend: Next.js, TypeScript, Tailwind v4, shadcn/ui, Lucide, Motion for React, Recharts, React Leaflet.
- Backend: FastAPI at `http://127.0.0.1:8000`.
- Real-time: browser-native WebSocket to FastAPI.
- No backend secrets may ever appear in frontend files.

# Frontend architecture

- `app/**/page.tsx` files are thin route wrappers only.
- Real page implementations are placed in `components/pages` with explicit names:
  `LoginPage.tsx`, `DashboardPage.tsx`, `TruckTrackingPage.tsx`, etc.
- Reusable domain components belong in:
  `components/procurement`, `components/logistics`, `components/finance`, and `components/shared`.
- Centralize HTTP calls in `src/lib/api.ts`.
- Keep TypeScript API payload types in `src/types`.
- Use client components only when browser state, events, Motion, or WebSocket code needs them.

# Design direction

The visual tone is calm, trustworthy, precise, and operational:
- modern logistics command center
- premium enterprise SaaS
- data-dense but scannable
- controlled use of color for status and actions

Avoid:
- generic landing-page sections
- large marketing heroes in authenticated screens
- random gradients, blobs, or decorative backgrounds
- excessive glassmorphism or shadows
- excessive rounded cards
- emoji as icons
- arbitrary font sizes, spacing, or colors
- long, bouncy, decorative animations
- putting every UI element in a card

# Design system

- Follow an 8px spacing rhythm.
- Use `max-w-7xl` primary content containers.
- Use a neutral/slate application base and white surfaces.
- Use one restrained indigo/blue primary accent.
- Use semantic status colors consistently:
  green = success, amber = warning, red = critical, blue = information.
- Status must never rely on color alone; include text, icon, or badge.
- Use Lucide icons consistently.
- Use desktop sidebar and responsive mobile sheet navigation.
- Preserve empty, loading, error, disabled, and success states.

# Typography

- Use clear hierarchy: page title, section title, metric value, label, helper text.
- Keep application headings compact and information-focused.
- Use sentence case.
- Do not use arbitrary type scales or excessive bold text.

# Motion

Use `motion/react` only for meaningful feedback:
- short page entrance/reveal
- staggered KPI cards
- button hover/tap feedback
- alerts appearing or changing state
- mobile navigation transitions

Rules:
- interactions should usually be 160–280ms
- avoid bounce unless it conveys physical state
- never animate every element
- respect `prefers-reduced-motion`

# Accessibility

- Use semantic HTML first.
- Every field requires a visible associated label.
- Support keyboard navigation and visible focus states.
- Maintain sufficient color contrast.
- Prefer native semantics over unnecessary ARIA.
- Build mobile-first from 320px to 1920px.

# Quality routine

After each significant view:
1. Run the application.
2. Test desktop and mobile dimensions.
3. Inspect browser console errors.
4. Check loading, empty, error, and success states.
5. Verify keyboard navigation.
6. Validate design consistency against this skill.
7. Avoid adding unrelated features.