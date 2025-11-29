# Babyfae 3.0 - AI Coding Instructions

## Project Overview
This is a monorepo for a Telegram Mini App (TMA) focused on infant care tracking.
- **Root**: Orchestration scripts (`package.json`).
- **Frontend**: React 19 + Vite + Tailwind CSS + Zustand (`frontend/`).
- **Bot**: Node.js + Express + `node-telegram-bot-api` + SQLite (`bot/`).

## Architecture & Patterns

### Frontend (`frontend/`)
- **State Management**: Use **Zustand** (`src/store/`). Do NOT use Redux or Context API for global state.
- **Structure**: Feature-based architecture (`src/features/`). Group components, hooks, and logic by feature (e.g., `calendar`, `dashboard`, `growth`).
- **UI Components**: Located in `src/components/ui`. Prefer creating reusable components here.
- **Styling**: **Tailwind CSS**. Use utility classes directly.
- **Telegram Integration**: Use `@telegram-apps/sdk-react` for TMA features (MainButton, BackButton, etc.).
- **Routing**: Single Page Application (SPA) within the Telegram Webview.

### Backend (`bot/`)
- **Framework**: Express 5 for HTTP endpoints, `node-telegram-bot-api` (NTBA) for Telegram interactions.
- **Database**: **SQLite** (`sqlite3`) in WAL mode. Use helpers in `src/database/` for queries.
- **Handlers**: API logic split into handlers (`src/handlers/`).
- **Authentication**: All `/api/*` endpoints require `X-Telegram-Init-Data` header.
- **Validation**: Input validation via `src/utils/validation.ts`.
- **Scheduler**: Disabled (notifications feature removed).

## Critical Workflows

### Development
- **Start All**: `npm run dev` (in root) starts both Bot and Frontend concurrently.
- **Install Dependencies**: `npm run install:all` (in root).
- **Tunneling**: `npm run tunnel` (in root) exposes the frontend via Cloudflare Tunnel (required for Telegram Web App testing).

### Deployment
- **Docker**: `docker-compose.yml` orchestrates the services.
- **Environment**: `bot/.env` is required for the backend (contains `TELEGRAM_BOT_TOKEN`).

## Coding Conventions
- **TypeScript**: Strict mode enabled. Define interfaces in `types/` folders.
- **Async/Await**: Prefer `async/await` over `.then()`.
- **Error Handling**:
    - **Frontend**: Use `ErrorBoundary` components and toast notifications (`src/lib/toast.ts`).
    - **Backend**: Wrap async handlers to catch errors and log them (`src/utils/logger.ts`).
- **Imports**: Use relative imports or configured aliases if available.

## Common Tasks
- **Adding a new feature**:
    1. Create a new folder in `frontend/src/features/`.
    2. Add state slice in `frontend/src/store/` if needed.
    3. If backend support is needed, add routes in `bot/src/index.ts` or handlers in `bot/src/handlers/`.
- **Database Changes**:
    - Modify `bot/src/database/init.ts` to update schema.
    - Ensure backward compatibility or provide migration steps.

## Specific Gotchas
- **Telegram SDK**: Ensure the SDK is initialized before using it. Mock the environment for local browser development (`frontend/src/mock-env.ts`).
- **Bot Library**: We use `node-telegram-bot-api`, NOT `telegraf`. Ignore references to Telegraf in old documentation.
- **Activity Types**: `feeding`, `water`, `medication`, `sleep`, `walk`, `custom`, `diaper`, `pump`, `bath`, `play`, `doctor`, `other`.
- **Timer Activities**: `sleep` and `walk` use start/end timestamps with active timers (`activeSleepStart`, `activeWalkStart` in store).
- **X-Frame-Options**: Mini App must work in Telegram iframe. Do NOT add `X-Frame-Options` header. Use `Content-Security-Policy: frame-ancestors` instead.
