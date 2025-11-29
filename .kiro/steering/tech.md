# Tech Stack & Build System

## Monorepo Structure
Root `package.json` orchestrates both frontend and bot packages using `concurrently`.

## Frontend (`/frontend`)
- React 19 with TypeScript 5.9
- Vite 7 for bundling and dev server
- TailwindCSS 4 for styling
- Zustand 5 for state management (with persist middleware)
- i18next + react-i18next for internationalization
- @telegram-apps/sdk-react for Telegram Mini App integration
- date-fns for date utilities
- lucide-react for icons
- Path alias: `@/` maps to `./src/`

## Backend (`/bot`)
- Node.js 22 with Express 5
- TypeScript 5.9 compiled to CommonJS
- SQLite 3 with WAL mode for persistence
- node-telegram-bot-api for Telegram bot features
- helmet, cors, express-rate-limit for security
- node-cron for scheduled tasks

## Deployment
- Docker + Docker Compose
- Nginx reverse proxy
- Dozzle for log monitoring

## Common Commands

```bash
# Install all dependencies (root, bot, frontend)
npm run install:all

# Development (runs both frontend and bot concurrently)
npm run dev

# Development - individual services
npm run dev:bot      # Bot only (port 3000)
npm run dev:frontend # Frontend only (port 5173)

# Create tunnel for Telegram testing
npm run tunnel

# Production build
npm run build

# Docker production
docker compose up -d --build
```

## Environment Variables
- Copy `.env.example` to `.env` (root) and `bot/.env.example` to `bot/.env`
- Required: `TELEGRAM_BOT_TOKEN`, `WEBAPP_URL` (production)

## Code Quality
- ESLint configured for both packages
- TypeScript strict mode enabled
- Frontend: no direct `console.*` calls - use `logger` from `@/lib/logger`
- Frontend: all API calls through `@/lib/api/client.ts`
