Read and follow `.agents/skills/premium-supply-chain-design/SKILL.md`.

We are building a Supply Chain Control Tower for Cognizant Hackathon combination E2 + PR2.

Backend already uses FastAPI and runs with:

uvicorn app.main:app --reload

Do not rewrite or delete backend code. The frontend makes API calls to:

http://127.0.0.1:8000

Before implementing application UI:

1. Inspect the existing frontend project.
2. Create a concise implementation plan in `docs/frontend-implementation-plan.md`.
3. Include:
   - route map
   - component map
   - Tailwind/shadcn design tokens
   - API client and FastAPI auth strategy
   - WebSocket strategy for truck tracking
   - reusable Procurement, Logistics, and Finance components
   - responsive plan
   - accessibility plan
   - Motion plan
   - phased E2 + PR2 build order
4. Do not build pages yet.
5. Do not add packages unless genuinely needed.
6. Do not expose secrets in frontend code.