---
description: "Task list for Babyfae Core App implementation"
---

# Tasks: Develop Babyfae Core App

**Input**: Design documents from `/specs/001-init-babyfae-app/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/bot-api.yaml
**Tests**: Optional (not explicitly requested in spec, but basic unit tests included for critical logic)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize monorepo structure and Docker configuration
  - Create `frontend/`, `bot/`, `docker/` directories
  - Create `docker-compose.yml` and `docker-compose.dev.yml`
  - Create `docker/frontend.Dockerfile` and `docker/bot.Dockerfile`
- [x] T002 [P] Initialize Frontend (React + Vite + Tailwind)
  - Run `npm create vite@latest frontend -- --template react-ts`
  - Install dependencies: `zustand`, `date-fns`, `@telegram-apps/sdk-react`, `lucide-react`, `i18next`, `react-i18next`
  - Setup Tailwind CSS and Shadcn/UI structure
  - Configure `vite.config.ts` with path aliases
- [x] T003 [P] Initialize Backend (Node.js + Express)
  - Initialize `bot/package.json`
  - Install dependencies: `express`, `node-telegram-bot-api`, `sqlite3`, `node-cron`
  - Setup TypeScript configuration `bot/tsconfig.json`
  - Create basic server entry point `bot/src/index.ts`
- [x] T004 [P] Define Shared Types
  - Create `frontend/src/types/index.ts` with entities from data-model.md
  - Copy types to `bot/src/types/index.ts` (or setup shared workspace if preferred)

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data persistence and state management required by all stories

- [x] T005 Implement CloudStorage Adapter with Sharding
- [x] T005a Implement DeviceStorage Adapter (Cache Layer)
  - Create `frontend/src/lib/storage/device-storage.ts` (wrapping localStorage)
  - Implement sync logic between DeviceStorage (fast) and CloudStorage (reliable)
- [x] T005b Setup Internationalization (i18n)
- [x] T006 Setup Zustand Store with Persistence
  - Create `frontend/src/store/index.ts`
  - Configure `persist` middleware using the CloudStorage adapter
  - Create `frontend/src/mock-env.ts` to initialize mock Telegram environment
- [x] T007 Implement Base UI Layout
  - Create `frontend/src/components/layout/AppLayout.tsx`
  - Setup `frontend/src/App.tsx` with routing (if using router) or view switching
  - Implement `frontend/src/lib/telegram/init.ts` for SDK initialization

## Phase 3: User Story 3 - Onboarding & Baby Profile (P1)

**Goal**: Users can set up their baby's profile.
**Independent Test**: Clear data, launch app, complete onboarding, verify name in header.

- [x] T008 [US3] Create BabyProfile Store Slice
  - Create `frontend/src/store/baby-profile.ts`
  - Define `BabyProfile` interface and actions (`setProfile`, `updateProfile`)
  - Integrate into main store
- [x] T009 [US3] Create Onboarding Screen
  - Create `frontend/src/features/onboarding/OnboardingScreen.tsx`
  - Implement form for Name, Gender, Birth Date
  - Add validation (no future dates)
- [x] T010 [US3] Create App Header Component
  - Create `frontend/src/components/ui/Header.tsx`
  - Connect to store to display Baby Name and Age (calculated from birth date)
  - Add logic to show OnboardingScreen if profile is missing

## Phase 4: User Story 1 - Core Activity Tracking (P1)

**Goal**: Users can record feeding and medication.
**Independent Test**: Tap "Feeding", verify record added to store/history.

- [x] T011 [US1] Create Activity Store Slice
  - Create `frontend/src/store/activities.ts`
  - Define `ActivityRecord` interface and actions (`addActivity`, `deleteActivity`)
  - Implement logic to shard activities by month in storage (if using sharding strategy)
- [x] T012 [US1] Create Dashboard Layout
  - Create `frontend/src/features/dashboard/Dashboard.tsx`
  - Implement grid layout for activity buttons
- [x] T013 [US1] Implement Feeding & Medication Logic
  - Create `frontend/src/features/dashboard/ActivityButton.tsx`
  - Implement handler to add "Feeding" record with current timestamp
  - Implement handler to add "Medication" record
  - Add "Last activity" display logic using `date-fns`

## Phase 5: User Story 2 - Sleep Tracking (P1)

**Goal**: Users can track sleep duration in real-time.
**Independent Test**: Start sleep, wait, end sleep, verify duration.

- [x] T014 [US2] Implement Sleep Timer Hook
  - Create `frontend/src/hooks/useSleepTimer.ts`
  - Logic to handle active sleep session (persisted in store or separate key)
  - Calculate elapsed time in real-time
- [x] T015 [US2] Update Dashboard for Sleep Tracking
- [x] T016 [US2] Implement Sleep Record Saving
  - Update `activities.ts` store to handle `endTimestamp` and duration calculation
  - Save completed sleep session as `ActivityRecord`

## Phase 6: User Story 4 - Calendar & History (P2)

**Goal**: Users can view and edit past activities.
**Independent Test**: Record activities, view in calendar, edit one.

- [x] T017 [US4] Create Calendar View Component
  - Create `frontend/src/features/calendar/CalendarView.tsx`
  - Use `react-day-picker` or custom grid for monthly view
  - Highlight days with activities
- [x] T018 [US4] Implement Daily Activity List
  - Create `frontend/src/features/calendar/DailyActivityList.tsx`
  - Fetch activities for selected date from store
  - Group by type (Feeding, Sleep, etc.)
- [x] T019 [US4] Implement Edit/Delete Logic
  - Create `frontend/src/features/calendar/EditActivityModal.tsx`
  - Add update/delete actions to `activities.ts` store
  - Connect modal to list items

## Phase 7: User Story 5 - Growth Tracking (P2)

**Goal**: Users can record weight and height.
**Independent Test**: Add growth record, view in list.

- [x] T020 [US5] Create Growth Store Slice
  - Create `frontend/src/store/growth.ts`
  - Define `GrowthRecord` interface and actions
- [x] T021 [US5] Create Growth Screen
  - Create `frontend/src/features/growth/GrowthScreen.tsx`
  - Implement form for Weight/Height input
  - Implement list view of historical measurements

## Phase 8: User Story 6 - Custom Activities & Settings (P2)

**Goal**: Users can customize the app.
**Independent Test**: Create "Bath" activity, see it on Dashboard.

- [x] T022 [US6] Create Settings Store Slice
  - Create `frontend/src/store/settings.ts`
  - Define `Settings` and `CustomActivity` interfaces
- [x] T023 [US6] Create Settings Screen
  - Create `frontend/src/features/settings/SettingsScreen.tsx`
  - Implement sections for Baby Profile (edit), Schedules, Data Management
- [x] T024 [US6] Implement Custom Activity Creator
  - Create `frontend/src/features/settings/CustomActivityForm.tsx`
  - Allow defining name, icon, and color
- [x] T025 [US6] Update Dashboard for Custom Activities
  - Modify `Dashboard.tsx` to render dynamic buttons from `customActivities` store

## Phase 9: User Story 7 - Notifications (P3)

**Goal**: Users receive Telegram notifications.
**Independent Test**: Set reminder, verify API call to bot.

- [x] T026 [US7] Implement Bot Database Schema
  - Create `bot/src/database/init.ts`
  - Define SQLite schema for `notification_schedules`
- [x] T027 [US7] Implement Bot API Endpoints
  - Create `bot/src/handlers/api.ts`
  - Implement `POST /api/schedules/update`
  - Implement `POST /api/schedules/delete`
  - Add `initData` validation middleware
- [x] T028 [US7] Implement Notification Scheduler
  - Create `bot/src/scheduler/index.ts`
  - Setup cron job (every minute)
  - Implement logic to query due notifications and send messages via `node-telegram-bot-api`
- [x] T029 [US7] Implement Frontend Sync Logic
  - Create `frontend/src/lib/api/notifications.ts`
  - Add logic to `settings.ts` store to sync changes to backend
  - Add "Enable Notifications" toggle in Settings UI

## Phase 10: Polish & Cross-Cutting

**Purpose**: Stability and final touches

- [x] T030 Implement Offline Queue
  - Create `frontend/src/lib/api/queue.ts`
  - Queue failed notification sync requests and retry when online
- [x] T031 Add Error Boundaries & Loading States
  - Wrap main routes in `ErrorBoundary`
  - Add Skeleton loaders for dashboard and calendar
- [x] T032 Final Theme & Accessibility Check
  - Verify dark mode consistency
  - Check touch targets (44px+)
  - Verify contrast ratios

## Dependencies

- **Phase 1 & 2** must be completed before any User Story.
- **US3 (Profile)** blocks **US1 (Tracking)** (need baby name/age).
- **US1 (Tracking)** blocks **US2 (Sleep)** (shares activity store).
- **US1 (Tracking)** blocks **US4 (Calendar)** (needs data to display).
- **US6 (Settings)** blocks **US7 (Notifications)** (needs settings to configure reminders).

## Parallel Execution Examples

- **Frontend/Backend Split**: One dev works on **T002/T005/T006** (Frontend Store), another on **T003/T026/T027** (Bot API).
- **Feature Split**: Once Phase 2 is done, one dev can work on **US4 (Calendar)** while another works on **US5 (Growth)**.

## Implementation Strategy

1.  **MVP (Phases 1-4)**: Setup + Profile + Core Tracking. This is usable immediately.
2.  **Enhanced Tracking (Phases 5-7)**: Sleep, Calendar, Growth.
3.  **Customization & Reminders (Phases 8-9)**: Custom activities and Notifications.
