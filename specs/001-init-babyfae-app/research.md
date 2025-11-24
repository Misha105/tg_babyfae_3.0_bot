# Research: Babyfae Core App

**Feature**: Develop Babyfae Core App
**Date**: 2025-11-22

## 1. Telegram CloudStorage Limitations & Sync

**Decision**: Use `CloudStorage` as the primary source of truth with a local `Zustand` store that syncs on change.

**Rationale**:
- **Reliability**: `CloudStorage` persists across devices and app reinstalls, unlike `localStorage` or `IndexedDB` in the WebView context.
- **Simplicity**: Avoids setting up a complex backend database for user data initially.
- **Privacy**: Data stays within the Telegram ecosystem.

**Constraints**:
- **Size Limit**: 1024 keys per user, 4096 bytes per key. Total ~5MB (varies by client, safe bet is strict key management).
- **Rate Limits**: High frequency writes can be throttled.
- **Conflict Resolution**: Last write wins is the default behavior.

**Implementation Strategy**:
- **Key Partitioning**: Split data into multiple keys (e.g., `profile`, `activities_2025_11`, `settings`) to avoid the 4KB per key limit (if applicable to specific clients, though modern clients support larger values, splitting is safer). *Correction*: The 4096 bytes limit is per key. We MUST split data.
- **Debouncing**: Debounce writes by 300-500ms to avoid rate limits.
- **Optimistic UI**: Update local store immediately, sync in background.

**Alternatives Considered**:
- **IndexedDB**: Unreliable in WebViews (often cleared by OS).
- **External Database (PostgreSQL)**: Adds infrastructure cost, complexity, and privacy concerns (storing PII).

## 2. Bot Backend & Notification Scheduling

**Decision**: Node.js + Express + SQLite3 + `node-telegram-bot-api`.

**Rationale**:
- **Node.js**: Shared language (TypeScript) with frontend.
- **SQLite3**: Zero-config, file-based, perfect for low-write workloads like notification schedules.
- **Bot API**: Native way to send notifications.

**Implementation Strategy**:
- **Scheduler**: A simple `cron` job (using `node-cron`) running every minute to check SQLite for due notifications.
- **Validation**: Validate `initData` from the Mini App to ensure the schedule request comes from the legitimate user.

**Alternatives Considered**:
- **Redis**: Overkill for simple scheduling.
- **Serverless Functions**: "Cold starts" might delay notifications; a persistent process is better for a scheduler.

## 3. Offline Support

**Decision**: "Offline-first" architecture using `Zustand` persistence.

**Rationale**:
- Parents may be in areas with poor connectivity.
- App must be usable immediately upon opening.

**Implementation Strategy**:
- **Load**: On app start, load from `CloudStorage`. If offline/fail, load from `localStorage` (as a secondary cache) or memory.
- **Save**: Save to `Zustand` (memory) -> `localStorage` (cache) -> `CloudStorage` (persistence).
- **Queue**: If offline, queue `CloudStorage` writes and retry when online.

## 4. Tech Stack Validation

**Decision**: React + Vite + Tailwind + Shadcn/UI.

**Rationale**:
- **Speed**: Vite is significantly faster than CRA/Webpack.
- **UX**: Shadcn/UI provides high-quality, accessible components that fit the "Simplicity" principle.
- **DX**: TypeScript support is first-class.

## 5. Unknowns Resolved

- **CloudStorage Limits**: Confirmed 4096 bytes per key. We need a strategy to shard activity data (e.g., by month) to stay within limits.
- **InitData Validation**: Standard HMAC-SHA256 validation using the bot token is required.
