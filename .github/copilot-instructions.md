# Babyfae 3.0 – Copilot Instructions

## 1. Big Picture
- Monorepo for a Telegram Mini App (TMA) for infant care.
- `frontend/`: React + Vite + Tailwind + Zustand TMA, talking to the bot via `/api/*`.
- `bot/`: Node.js + Express + `node-telegram-bot-api` + SQLite, exposes REST API + runs Telegram bot + scheduler.
- Specs for features live under `specs/001-init-babyfae-app/` and `.specify/` (plans, tasks, constitution).

## 2. Frontend Architecture (`frontend/`)
- **Entry & layout**: `src/main.tsx` wraps `App` in `ErrorBoundary`; `src/components/layout/AppLayout.tsx` + `BottomNav.tsx` define main shell.
- **State**: Use **Zustand** slices in `src/store/` for app-wide state (sleep tracking, activities, growth, settings). Do **not** introduce Redux/Context for global state.
- **Features**: Implement UI per feature folder in `src/features/` (e.g. `calendar/`, `dashboard/`, `growth/`, `onboarding/`). Keep hooks/components colocated with their feature.
- **UI components**: Reusable generic pieces go in `src/components/ui/` (e.g. `ErrorBoundary`, `ConfirmModal`, `LoadingSpinner`, `Header`). Prefer reusing/extending these over ad‑hoc components.
- **Styling**: Tailwind utility classes only; follow existing patterns in `App.tsx`, `Dashboard.tsx`, and `GrowthScreen.tsx`.
- **Telegram integration**: Use `@telegram-apps/sdk-react` helpers via `src/lib/telegram/` and `TelegramViewportSync.tsx`. For local non‑Telegram runs, rely on `src/mock-env.ts`.
- **API access**: Use the API client in `src/lib/api/client.ts` and the offline queue in `src/lib/api/queue` (already imported in `main.tsx`). New network calls should flow through this client so they benefit from auth/queueing.

## 3. Backend Architecture (`bot/`)
- **Entry point**: `src/index.ts` wires Express, security middleware, DB init, Telegram bot, scheduler, and all `/api` routes.
- **Routing pattern**:
    - Pure HTTP/cron logic in `src/handlers/api.ts` (e.g. schedule updates).
    - User data CRUD & import/export in `src/handlers/data.ts`.
    - Each handler assumes `authenticateTelegramUser` + `verifyUserAccess` have run for `/api/user/:id/*` routes.
- **Database**: SQLite via helpers in `src/database/db-helper.ts` and schema in `src/database/init.ts`. Use `db-utils.ts` for common query helpers; do not open raw connections elsewhere.
- **Auth & security**:
    - All `/api/*` routes pass through `authenticateTelegramUser` (Telegram Web App auth) and often `verifyUserAccess`.
    - `requestLogger` / `errorLogger` in `src/middleware/requestLogger.ts` handle logging.
    - Express is configured with `helmet`, CORS, strict rate limiters (`limiter`, `strictLimiter`, `backupLimiter`) and `trust proxy` based on `TRUSTED_PROXIES`.
    - In production, `WEBAPP_URL` **must** be set; otherwise the process exits early.
- **Bot**: `src/telegram.ts` creates the NTBA bot and is imported into `index.ts`; `/start` handler sends a localized welcome + WebApp URL button based on `WEBAPP_URL`.
- **Scheduler**: `src/scheduler/index.ts` uses `node-cron` with the bot instance for notifications.

## 4. Critical Workflows
- **Install deps (root)**: `npm run install:all`.
- **Run dev stack**: `npm run dev` (starts bot on `:3000` and frontend on `:5173` with `/api` proxy).
- **Expose frontend to Telegram**:
    - Either run `npm run tunnel` (Cloudflare Tunnel wrapper) **or** use `cloudflared tunnel --url http://localhost:5173`.
    - Register the HTTPS URL in BotFather as the Web App URL.
- **Docker build/run (prod-like)**: use `docker-compose.yml` (or `docker-compose.dev.yml` for dev) – backend image defined in `docker/bot.Dockerfile`, frontend in `docker/frontend.Dockerfile`.
- **Health check**: backend at `/health` (also checks DB connectivity); used in `DEPLOY.md` and `SECURITY_FIXES_REPORT.md` examples.

## 5. Conventions & Patterns
- **TypeScript**: strict configs in both `frontend/tsconfig*.json` and `bot/tsconfig.json`. Add/extend types under `frontend/src/types/` and `bot/src/types/`.
- **Async**: Prefer `async/await`; avoid `.then()` chains, especially inside handlers.
- **Errors (frontend)**: Wrap top-level UI in `ErrorBoundary`; show user‑visible errors via `src/lib/toast.ts`. New network flows should surface failures through toasts instead of silent failures.
- **Errors (backend)**: Throw or reject in handlers and let `errorLogger` middleware serialize/log errors; log via `src/utils/logger.ts` instead of `console.log`.
- **Imports**: Use `@` alias for `frontend/src` (see `vite.config.ts`), and relative imports in the bot.
- **Feature work**: Prefer updating the relevant `specs/001-init-babyfae-app/*` docs when changing cross‑cutting behavior (data model, contracts), then reflect in `bot/openapi.yaml` if necessary.

## 6. Common Changes
- **Add new user activity type**:
    - Extend DB schema / helpers in `bot/src/database/init.ts` and `db-utils.ts`.
    - Add CRUD endpoints or extend existing ones in `bot/src/handlers/data.ts` and wire them in `src/index.ts`.
    - On the frontend, add a feature component under `src/features/` and wire state via a new/updated slice in `src/store/`.
- **Adjust notification logic**:
    - Update scheduler logic in `bot/src/scheduler/index.ts` and keep Telegram messaging localized via `bot/src/locales.ts`.
- **Change auth or rate limits**:
    - Edit `bot/src/middleware/auth.ts` or the rate limiter configs in `src/index.ts`, preserving the pattern of stricter limits for backup/export/import endpoints.

## 7. Environment & Secrets
- Required envs for local dev (see `DEPLOY.md` and `SECURITY_FIXES_REPORT.md`):
    - `TELEGRAM_BOT_TOKEN` (bot token), `WEBAPP_URL`, `NODE_ENV`, `PORT` (default `3000`), optional `TRUSTED_PROXIES`.
- Copy `bot/.env.example` → `bot/.env` and fill in secrets; never hard‑code tokens in code.

## 8. How to Help Copilot
- Keep functions small, typed, and named by intent (e.g. `calculateDailySleepDuration` style in `.specify/memory/constitution.md`).
- Follow existing file/module boundaries so Copilot can infer patterns (handlers, DB utils, slices, feature components).
- When implementing new behavior, mirror similar flows (e.g. growth records or custom activities) instead of inventing new patterns.
