# Feature Specification: Develop Babyfae Core App

**Feature Branch**: `001-init-babyfae-app`
**Created**: 2025-11-22
**Status**: Draft
**Input**: User description: "Develop Babyfae, a Telegram Mini App..."

## User Scenarios & Testing

### User Story 1 - Core Activity Tracking (Feeding & Medication) (Priority: P1)

As a sleep-deprived parent, I want to record feeding and medication with a single tap so that I can track my baby's schedule without effort.

**Why this priority**: These are the most frequent and critical daily activities. If this is hard to do, the app fails its core mission.

**Independent Test**: Can be fully tested by launching the app, tapping "Feeding", and verifying the record appears in the history/calendar.

**Acceptance Scenarios**:

1. **Given** the user is on the Main Dashboard, **When** they tap the "Feeding" button, **Then** a new feeding record is saved with the current timestamp and a success feedback is shown.
2. **Given** the user is on the Main Dashboard, **When** they tap the "Medication" button, **Then** a new medication record is saved with the current timestamp.
3. **Given** a recorded activity, **When** the user views the dashboard, **Then** the time since the last activity is displayed (e.g., "Last feeding: 2h ago").

---

### User Story 2 - Sleep Tracking (Priority: P1)

As a parent, I want to track my baby's sleep sessions in real-time so that I know how long they have slept and when they might wake up.

**Why this priority**: Sleep patterns are critical for infant health and parent sanity. Real-time tracking is a key differentiator from paper logs.

**Independent Test**: Can be tested by starting a sleep session, waiting a minute, and ending it, then checking the duration.

**Acceptance Scenarios**:

1. **Given** the baby is awake, **When** the user taps "Start Sleep", **Then** the app enters "Sleep Mode", showing a timer of the current sleep duration.
2. **Given** the baby is sleeping, **When** the user taps "End Sleep", **Then** the sleep session is saved with start/end times and total duration.
3. **Given** a completed sleep session, **When** the user views the dashboard, **Then** the total sleep duration for the current day is updated.

---

### User Story 3 - Onboarding & Baby Profile (Priority: P1)

As a first-time user, I want to set up my baby's profile quickly so that the app is personalized for my child.

**Why this priority**: Required for the app to function (calculating age, personalizing notifications).

**Independent Test**: Can be tested by clearing local data and launching the app as a new user.

**Acceptance Scenarios**:

1. **Given** a new user, **When** they launch the app, **Then** they are presented with the Onboarding screen asking for Name, Gender, and Birth Date.
2. **Given** the onboarding form is filled, **When** the user submits, **Then** the data is saved and they are redirected to the Main Dashboard.
3. **Given** a configured profile, **When** the user is on any screen, **Then** the baby's name and calculated age are visible in the header.

---

### User Story 4 - Calendar & History Management (Priority: P2)

As a parent, I want to view past activities in a calendar view so that I can see trends or correct mistakes.

**Why this priority**: Users inevitably make mistakes (forgetting to record, recording twice) and need to fix them.

**Independent Test**: Can be tested by recording activities on different days and navigating the calendar.

**Acceptance Scenarios**:

1. **Given** the Calendar View, **When** the user selects a date, **Then** a list of all activities (Feeding, Sleep, Medication, Custom) for that day is displayed.
2. **Given** an activity in the daily list, **When** the user taps it, **Then** they can edit the timestamp or delete the record.
3. **Given** the Calendar View, **When** the user swipes or taps navigation arrows, **Then** the view changes to the previous/next month.

---

### User Story 5 - Growth Tracking (Priority: P2)

As a parent, I want to record my baby's weight and height so that I can monitor their physical development.

**Why this priority**: Important health metric, though less frequent than daily activities.

**Independent Test**: Can be tested by adding a growth record and verifying it appears in the list.

**Acceptance Scenarios**:

1. **Given** the Growth Screen, **When** the user enters weight and height and saves, **Then** a new growth record is created with the date and calculated age.
2. **Given** the Growth Screen, **When** the user views the list, **Then** all past measurements are shown in reverse chronological order.

---

### User Story 6 - Custom Activities & Settings (Priority: P2)

As a parent, I want to configure custom activities and schedules so that the app fits my specific routine.

**Why this priority**: Adds flexibility for diverse parenting needs (tummy time, baths, etc.).

**Independent Test**: Can be tested by creating a custom activity "Bath" and verifying it appears on the dashboard.

**Acceptance Scenarios**:

1. **Given** Settings > Custom Activities, **When** the user adds a new activity "Bath", **Then** a "Bath" button appears on the Main Dashboard.
2. **Given** Settings > Feeding Schedule, **When** the user changes the default interval, **Then** the reminder logic updates to reflect the new interval.
3. **Given** Settings > Data Management, **When** the user taps "Clear All Data" and confirms, **Then** all user data is wiped and the app returns to Onboarding state.

---

### User Story 7 - Notifications (Priority: P3)

As a parent, I want to receive reminders for feeding and medication so that I don't miss a dose or feed.

**Why this priority**: High value, but relies on external platform (Telegram) delivery and user permissions.

**Independent Test**: Can be tested by setting a reminder for 1 minute in the future and waiting for the notification.

**Acceptance Scenarios**:

1. **Given** a configured feeding interval, **When** the time elapses, **Then** a Telegram notification is sent: "It's been X hours since last feeding...".
2. **Given** a medication schedule, **When** the time approaches, **Then** a reminder is sent.
3. **Given** Settings > Notifications, **When** the user disables notifications, **Then** no reminders are sent.

### Edge Cases

- **Network Failure**: If the user records an activity while offline, the data must be saved locally and synced when connection is restored. No error should interrupt the user flow.
- **Storage Limit**: If Telegram CloudStorage is full, the user should be warned and prompted to clear old data or sync failed.
- **App Termination**: If the app is closed while a sleep timer is running, the timer should resume correctly (calculating elapsed time) when the app is reopened.
- **Permission Revoked**: If the user blocks the bot, the app should disable notification settings and warn the user that reminders will not work.
- **Invalid Dates**: Users cannot select a birth date in the future.

## Functional Requirements

### General
- **Platform**: Telegram Mini App (TMA).
- **Language**: Full Russian language support for all UI text.
- **Theme**: Dark theme default, consistent with Telegram native styles.
- **Offline Support**: App must function offline, queuing data for sync when online.

### Dashboard
- Display 4 main activity buttons: Feeding, Medication, Sleep, Custom.
- Show "Last activity" timestamps for each category.
- Sleep button toggles between "Start Sleep" and "End Sleep".
- Display current sleep timer when sleep is active.

### Data Management
- Store all data in Telegram CloudStorage.
- Persist data across sessions and device restarts.
- Validate all inputs (e.g., no future dates for birth, positive numbers for weight).

### Settings
- **Baby Profile**: Name, Gender, Birth Date.
- **Schedules**: Feeding interval, Medication list & timing.
- **Custom Activities**: Name, Icon, Schedule.
- **Notifications**: Global toggle, Advance notice time (5, 15, 30 min).

## Success Criteria

1. **Performance**: App loads and is interactive in < 2 seconds on 3G networks.
2. **Efficiency**: Recording a feeding takes < 3 seconds (1 tap).
3. **Reliability**: 100% of recorded data persists after app restart.
4. **Usability**: Users can complete the onboarding flow in < 1 minute.
5. **Notifications**: Reminders are delivered within 1 minute of scheduled time (when network allows).
6. **Visuals**: UI adheres to Dark Theme and passes accessibility contrast checks.

## Assumptions

- Users have a valid Telegram account.
- Users grant the bot permission to send messages (for notifications).
- The device has a working internet connection for initial load and data sync (though offline usage is supported).
- Telegram CloudStorage limits (approx 1MB-2MB depending on implementation) are sufficient for text-based history for at least 1 year.

## Key Entities

- **BabyProfile**: Name, Gender, BirthDate.
- **ActivityRecord**: Type (Feeding, Medication, Sleep, Custom), SubType (e.g., specific medication name), StartTime, EndTime (for sleep), Note.
- **GrowthRecord**: Date, Weight, Height, Age.
- **CustomActivityDefinition**: Name, Icon, ScheduleRules.
- **Settings**: NotificationPreferences, ThemePreferences (if any override).
