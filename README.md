# Babyfae 3.0

Telegram Mini App для отслеживания ухода за младенцем.

## Стек технологий

| Компонент | Технологии |
|-----------|------------|
| **Frontend** | React 19, Vite 7, TailwindCSS 4, Zustand 5, TypeScript 5.9 |
| **Backend** | Node.js 22, Express 5, SQLite 3 (WAL mode), TypeScript |
| **Telegram** | node-telegram-bot-api, @telegram-apps/sdk-react |
| **Деплой** | Docker, Docker Compose, Nginx |

## Возможности

- 📝 Отслеживание кормлений, сна, прогулок, лекарств
- 📊 График роста и веса
- 🎨 Кастомные активности с иконками
- 🌍 Мультиязычность (Русский, English)
- 📱 Оффлайн-режим с синхронизацией
- 🔒 Аутентификация через Telegram

## Структура проекта

```
├── frontend/          # React Mini App
│   ├── src/
│   │   ├── components/    # UI компоненты
│   │   ├── features/      # Функциональные модули
│   │   ├── store/         # Zustand хранилище
│   │   ├── lib/           # Утилиты, API клиент
│   │   └── locales/       # i18n переводы
│   └── Dockerfile
├── bot/               # Express API + Telegram Bot
│   ├── src/
│   │   ├── handlers/      # API роуты
│   │   ├── database/      # SQLite helpers
│   │   ├── middleware/    # Auth, logging
│   │   └── utils/         # Валидация, утилиты
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Быстрый старт

### Требования

- Node.js 22+
- Telegram Bot Token (получить у [@BotFather](https://t.me/BotFather))

### Локальная разработка

```bash
# 1. Установка зависимостей
npm run install:all

# 2. Настройка окружения
cp bot/.env.example bot/.env
# Добавьте TELEGRAM_BOT_TOKEN в bot/.env

# 3. Запуск dev-серверов
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3000

# 4. Туннель для Telegram (в отдельном терминале)
npm run tunnel
# Скопируйте HTTPS URL и настройте Menu Button в @BotFather
```

### Production (Docker)

```bash
# 1. Настройка
cp .env.example .env
# Заполните TELEGRAM_BOT_TOKEN и WEBAPP_URL

# 2. Запуск
docker compose up -d --build

# 3. Проверка
curl http://localhost:3000/health
```

## Документация

| Документ | Описание |
|----------|----------|
| [QUICK_START.md](./QUICK_START.md) | Быстрый старт за 5 минут |
| [DEPLOY.md](./DEPLOY.md) | Полная инструкция по развертыванию на VPS |
| [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md) | Обновление с предыдущих версий |
| [monitoring/README.md](./monitoring/README.md) | Настройка мониторинга (Dozzle) |

## Мониторинг

В проект интегрирован [Dozzle](https://dozzle.dev/) — веб-интерфейс для просмотра логов Docker (~15 MB RAM).

```bash
# Генерация пароля
docker run -it --rm amir20/dozzle generate admin --password "YourPassword"

# Доступ после настройки Nginx
https://your-domain.com/monitor/
```

## API

Все эндпоинты (кроме `/health`) требуют заголовок `X-Telegram-Init-Data` с данными аутентификации Telegram WebApp.

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/health` | Проверка состояния (без авторизации) |
| GET | `/api/user/:id` | Все данные пользователя |
| GET | `/api/user/:id/activities` | Список активностей (с пагинацией) |
| POST | `/api/user/:id/profile` | Обновить профиль ребенка |
| POST | `/api/user/:id/settings` | Обновить настройки |
| POST | `/api/user/:id/activity` | Сохранить активность |
| DELETE | `/api/user/:id/activity` | Удалить активность |
| POST | `/api/user/:id/custom-activity` | Сохранить кастомную активность |
| DELETE | `/api/user/:id/custom-activity` | Удалить кастомную активность |
| POST | `/api/user/:id/growth` | Сохранить запись роста |
| DELETE | `/api/user/:id/growth` | Удалить запись роста |
| GET | `/api/user/:id/export` | Экспорт данных (JSON) |
| POST | `/api/user/:id/export-to-chat` | Отправить бэкап в чат |
| POST | `/api/user/:id/import` | Импорт данных |
| DELETE | `/api/user/:id` | Удалить все данные пользователя |

## Dev notes: logging & API client

- The frontend uses a centralized `logger` API in `frontend/src/lib/logger.ts` — prefer `logger.info`/`logger.warn`/`logger.error`/`logger.debug` or `logger.http` for HTTP events. Do not use `console.*` directly in the frontend source; eslint will enforce this.
- All frontend API calls should use `frontend/src/lib/api/client.ts` which:
	- injects `X-Telegram-Init-Data` header automatically,
	- masks sensitive values in logs,
	- supports per-request `timeoutMs` (defaults to 30 seconds), and
	- normalizes error responses to `ApiError` with status and body.

Полная спецификация: [bot/openapi.yaml](./bot/openapi.yaml)

## Лицензия

MIT
