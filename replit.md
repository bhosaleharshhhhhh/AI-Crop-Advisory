# Cropwise Advisory

Cropwise helps farmers diagnose crop health, understand field risk, and plan harvest and selling decisions with structured AI guidance.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required secret: `GEMINI_API_KEY` — server-side Gemini access for crop and market advisories

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/crop-advisor/src/App.tsx` — routed React experience and farmer workflows
- `artifacts/crop-advisor/src/index.css` — Cropwise visual tokens, typography, and motion
- `artifacts/api-server/src/routes/` — profile, dashboard, AI advisory, saved insight, and history endpoints
- `artifacts/api-server/src/lib/ai.ts` — server-only Gemini client and structured response validation
- `lib/api-spec/openapi.yaml` — source of truth for API contracts and generated hooks
- `lib/db/src/schema/` — Drizzle tables for users, scans, advisories, and saved insights

## Architecture decisions

- AI calls stay on the Express server; the browser only sees validated JSON responses.
- Client requests carry a persisted UUID and the API checks it against every user-owned query and mutation.
- Crop images are processed in Multer memory storage and only the structured diagnosis is persisted.
- Weather conditions are a deterministic seasonal advisory until a live weather provider is added.

## Product

- Landing onboarding captures email, farm location, and primary crop.
- Dashboard shows field weather risk, activity stats, recent diagnoses, and market notes.
- Disease scanner accepts JPEG, PNG, and WebP images up to 5MB and returns structured remedies.
- Market insights returns structured weather risks, harvest timing, and selling strategy.
- History supports scans, market notes, and saved insights.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run API codegen after every OpenAPI change before using generated hooks or Zod schemas.
- The frontend workflow supplies `PORT` and `BASE_PATH`; use the managed workflow for preview/build verification.
- `GEMINI_API_KEY` must remain a Replit Secret and is never bundled into the frontend.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
