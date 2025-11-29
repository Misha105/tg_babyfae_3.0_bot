# Project Structure

## Root Level
```
├── bot/                 # Express API + Telegram Bot
├── frontend/            # React Mini App
├── docker/              # Docker build files
├── monitoring/          # Dozzle log viewer config
├── nginx/               # Nginx configuration examples
├── specs/               # Feature specifications
├── docker-compose.yml   # Production compose
├── docker-compose.dev.yml
```

## Frontend (`/frontend/src`)
```
├── components/          # Shared UI components
│   ├── ui/              # Generic UI (Header, LoadingSpinner, etc.)
│   └── layout/          # Layout components (AppLayout, BottomNav)
├── features/            # Feature modules (self-contained)
│   ├── dashboard/       # Main activity tracking screen
│   ├── calendar/        # Calendar view with activity list
│   ├── growth/          # Growth tracking charts
│   ├── onboarding/      # New user setup
│   └── settings/        # User settings
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and services
│   ├── api/             # API client, error handling, offline queue
│   ├── i18n/            # Internationalization setup
│   ├── storage/         # Storage abstractions
│   └── telegram/        # Telegram SDK initialization
├── locales/             # Translation files (en.json, ru.json)
├── store/               # Zustand store
│   └── slices/          # Store slices by domain
└── types/               # TypeScript type definitions
```

## Backend (`/bot/src`)
```
├── database/            # SQLite helpers and initialization
├── handlers/            # Express route handlers
│   ├── api.ts           # Schedule management endpoints
│   └── data.ts          # User data CRUD endpoints
├── middleware/          # Express middleware (auth, logging)
├── scheduler/           # Cron job scheduler
├── types/               # TypeScript type definitions
├── utils/               # Utilities (logger, validation, dates)
├── index.ts             # App entry point
├── telegram.ts          # Telegram bot setup
└── locales.ts           # Bot message translations
```

## Key Patterns
- Feature-based organization in frontend (`/features/*`)
- Zustand slices for domain separation (`/store/slices/*`)
- Centralized API client with auth injection (`/lib/api/client.ts`)
- User-scoped localStorage with server as source of truth
- Shared type definitions between frontend and bot (kept in sync manually)
