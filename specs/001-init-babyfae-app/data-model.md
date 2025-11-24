# Data Model: Babyfae Core App

## Entities

### BabyProfile
Stores the core identity of the infant.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Unique identifier |
| `name` | `string` | Baby's display name |
| `gender` | `'male' \| 'female'` | For personalization |
| `birthDate` | `string` (ISO8601) | For age calculation |
| `createdAt` | `string` (ISO8601) | Record creation time |
| `updatedAt` | `string` (ISO8601) | Last update time |

### ActivityRecord
Represents a single care event.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Unique identifier |
| `type` | `'feeding' \| 'medication' \| 'sleep' \| 'custom'` | Category of activity |
| `timestamp` | `string` (ISO8601) | When the activity started/happened |
| `endTimestamp` | `string` (ISO8601)? | Optional, for sleep duration |
| `subType` | `string`? | e.g., Medication name, Custom activity ID |
| `notes` | `string`? | Optional user notes |
| `metadata` | `Record<string, any>`? | Flexible field for future use |

### GrowthRecord
Tracks physical development.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Unique identifier |
| `date` | `string` (ISO8601) | Measurement date |
| `weight` | `number` | Weight value |
| `weightUnit` | `'kg' \| 'lb'` | Unit of weight |
| `height` | `number` | Height value |
| `heightUnit` | `'cm' \| 'in'` | Unit of height |
| `ageInDays` | `number` | Calculated age at measurement |

### CustomActivityDefinition
User-defined activity types.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Unique identifier |
| `name` | `string` | Display name |
| `icon` | `string` | Emoji or icon ID |
| `color` | `string` | Hex color code |
| `schedule` | `ScheduleConfig` | Schedule rules |

### Settings
User preferences.

| Field | Type | Description |
|-------|------|-------------|
| `feedingIntervalMinutes` | `number` | Default: 180 |
| `notificationsEnabled` | `boolean` | Global toggle |
| `themePreference` | `'auto' \| 'dark' \| 'light'` | UI theme |

### NotificationSchedule (Bot Side)
Stored in SQLite for the scheduler.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Unique identifier |
| `user_id` | `number` | Telegram User ID |
| `chat_id` | `number` | Telegram Chat ID |
| `type` | `string` | 'feeding', 'medication', etc. |
| `schedule_data` | `string` (JSON) | Details for the scheduler |
| `next_run` | `number` (Unix TS) | Next execution time |
| `enabled` | `boolean` | Is active |

## Storage Schema (CloudStorage)

Data is sharded to respect the 4KB value limit.

- `profile`: JSON of `BabyProfile`
- `settings`: JSON of `Settings`
- `custom_activities`: JSON array of `CustomActivityDefinition`
- `growth`: JSON array of `GrowthRecord`
- `activities_YYYY_MM`: JSON array of `ActivityRecord` for that month (e.g., `activities_2025_11`)

## State Management (Zustand)

The frontend store aggregates these keys into a unified state object for the UI, handling the logic of reading/writing to the correct CloudStorage keys.
