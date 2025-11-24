# Implementation Plan: Develop Babyfae Core App

**Branch**: `001-init-babyfae-app` | **Date**: 2025-11-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-init-babyfae-app/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Develop the core Babyfae Telegram Mini App for infant care tracking. The system will consist of a React-based frontend (Mini App) using Telegram CloudStorage for data persistence and a Node.js bot backend for hosting and notification scheduling. Key features include tracking feeding, medication, sleep, and growth, along with custom activities and automated reminders.

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 20+
**Primary Dependencies**: React 18+, Vite 5+, Zustand, @telegram-apps/sdk-react, date-fns, node-telegram-bot-api, Express, SQLite3, i18next, react-i18next
**Storage**: Telegram CloudStorage (Frontend Persistence), SQLite3 (Bot Notification Schedules)
**Testing**: Vitest, React Testing Library
**Target Platform**: Telegram Mini App (Mobile/Desktop)
**Project Type**: Monorepo (Frontend + Bot)
**Performance Goals**: < 300KB initial bundle, < 2s load time on 3G
**Constraints**: Offline-capable, 5MB CloudStorage limit per user
**Scale/Scope**: Single baby profile, ~1000 activity records/year

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **1. Simplicity Above All**: ✅ Stack uses standard, well-documented tools (React, Vite). UI focuses on single-tap actions.
- **2. Data Reliability**: ✅ CloudStorage selected as primary store to prevent data loss (vs IndexedDB).
- **3. Mobile-First**: ✅ Shadcn/UI + Tailwind ensures touch-optimized, responsive design.
- **4. Platform Conventions**: ✅ `@telegram-apps/sdk-react` ensures native feel and theme integration.
- **5. Performance**: ✅ Vite + Code Splitting + minimal dependencies to meet < 300KB goal.
- **6. Privacy**: ✅ Data stored in user's CloudStorage; Bot only stores notification schedules.
- **7. Graceful Degradation**: ✅ Offline support planned; Error boundaries included.
- **8. Accessibility**: ✅ Shadcn/UI components are accessible by default.
- **9. Iterative**: ✅ MVP scope defined (no multi-user, no export yet).
- **10. Code Quality**: ✅ TypeScript Strict Mode enforced.

## Project Structure

### Documentation (this feature)

```text
specs/001-init-babyfae-app/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
frontend/                # Telegram Mini App (React)
├── src/
│   ├── components/      # UI & Shared Components
│   ├── features/        # Feature-based modules (feeding, sleep, etc.)
│   ├── lib/             # Utilities & SDK wrappers
│   ├── store/           # Zustand state management
│   └── types/           # Shared TypeScript types
bot/                     # Telegram Bot (Node.js)
├── src/
│   ├── handlers/        # Bot command handlers
│   ├── scheduler/       # Notification logic
│   └── database/        # SQLite adapter
docker/                  # Container configurations
```

**Structure Decision**: Monorepo with `frontend` and `bot` directories to separate concerns while keeping types and logic accessible.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | | |
