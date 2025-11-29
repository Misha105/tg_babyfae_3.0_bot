# Babyfae Backend

Express API + Telegram Bot для приложения отслеживания ухода за младенцем.

## Стек

- **Node.js 22** + TypeScript 5.9
- **Express 5** — HTTP сервер
- **SQLite 3** — база данных (WAL mode)
- **node-telegram-bot-api** — Telegram Bot API
- **Helmet** — security headers
- **express-rate-limit** — rate limiting

## Структура

```
src/
├── index.ts           # Entry point, Express app
├── telegram.ts        # Telegram bot initialization
├── locales.ts         # Bot message translations
├── database/          # SQLite helpers
│   ├── init.ts        # Schema initialization
│   ├── db-helper.ts   # Async DB wrapper
│   └── db-utils.ts    # Query utilities
├── handlers/          # API handlers
│   ├── data.ts        # User data CRUD
│   └── api.ts         # Disabled endpoints (schedules)
├── middleware/        # Express middleware
│   ├── auth.ts        # Telegram authentication
│   └── requestLogger.ts
├── scheduler/         # Disabled (notifications removed)
├── utils/             # Utilities
│   ├── validation.ts  # Input validation
│   ├── logger.ts      # Console logger
│   └── dateUtils.ts   # Date helpers
└── types/             # TypeScript types
```

## Разработка

```bash
# Установка
npm install

# Dev сервер (nodemon + ts-node)
npm run dev
# http://localhost:3000

# Сборка
npm run build

# Production
npm start
```

## Переменные окружения

```env
# Обязательные
TELEGRAM_BOT_TOKEN=your_token_here

# Опциональные
PORT=3000
WEBAPP_URL=https://your-domain.com
ENABLE_BOT_POLLING=true
```

## API Endpoints

Все эндпоинты (кроме `/health`) требуют заголовок `X-Telegram-Init-Data`.

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/health` | Health check |
| GET | `/api/user/:id` | Все данные пользователя |
| GET | `/api/user/:id/activities` | Активности (с пагинацией) |
| POST | `/api/user/:id/profile` | Обновить профиль |
| POST | `/api/user/:id/settings` | Обновить настройки |
| POST | `/api/user/:id/activity` | Сохранить активность |
| DELETE | `/api/user/:id/activity` | Удалить активность |
| POST | `/api/user/:id/custom-activity` | Сохранить кастомную активность |
| DELETE | `/api/user/:id/custom-activity` | Удалить кастомную активность |
| POST | `/api/user/:id/growth` | Сохранить запись роста |
| DELETE | `/api/user/:id/growth` | Удалить запись роста |
| GET | `/api/user/:id/export` | Экспорт данных |
| POST | `/api/user/:id/export-to-chat` | Отправить бэкап в чат |
| POST | `/api/user/:id/import` | Импорт данных |
| DELETE | `/api/user/:id` | Удалить все данные пользователя |

Полная спецификация: [openapi.yaml](./openapi.yaml)

## База данных

SQLite в режиме WAL (Write-Ahead Logging):
- Высокая производительность чтения
- Конкурентный доступ
- Автоматическое восстановление

Расположение: `data/babyfae.db`

### Backup

```bash
sqlite3 data/babyfae.db ".backup backup.db"
```

## Аутентификация

Все API запросы проверяются через `X-Telegram-Init-Data`:

1. Парсинг initData (URLSearchParams)
2. Проверка HMAC подписи
3. Проверка срока действия (auth_date)
4. Сопоставление user.id с :id в URL

## Rate Limiting

| Эндпоинт | Лимит |
|----------|-------|
| Общий | 100 req / 15 min |
| Export/Import | 10 req / 15 min |
| Export to chat | 1 req / min |

## Безопасность

- Helmet security headers
- CORS настроен для production
- Input validation (valibot)
- SQL injection protection (параметризованные запросы)
- CSP для Telegram iframe
