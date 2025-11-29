# Babyfae - Product Overview

Babyfae is a Telegram Mini App for tracking infant care activities.

## Core Features
- Activity tracking: feedings, sleep, walks, medications, diapers, baths, pumping, doctor visits
- Growth tracking: weight and height records with charts
- Custom activities with configurable icons and colors
- Multi-language support (Russian, English)
- Offline-first with background sync
- Data export/import and backup to Telegram chat

## Target Users
Parents tracking daily care routines for infants, accessed through Telegram's Mini App platform.

## Key Characteristics
- Mobile-first design optimized for Telegram WebApp viewport
- Server is source of truth; local storage used as offline fallback
- User authentication via Telegram initData validation
- All API endpoints (except `/health`) require Telegram authentication header
