# Babyfae Frontend

React Telegram Mini App для отслеживания ухода за младенцем.

## Стек

- **React 19** + TypeScript 5.9
- **Vite 7** — сборка
- **TailwindCSS 4** — стилизация
- **Zustand 5** — state management
- **@telegram-apps/sdk-react** — интеграция с Telegram
- **date-fns** — работа с датами
- **i18next** — интернационализация

## Структура

```
src/
├── components/         # Переиспользуемые UI компоненты
│   ├── ui/            # Базовые компоненты (Header, Modal, etc.)
│   └── layout/        # Layout компоненты
├── features/          # Функциональные модули
│   ├── dashboard/     # Главный экран
│   ├── calendar/      # Календарь активностей
│   ├── growth/        # Графики роста
│   ├── settings/      # Настройки
│   └── onboarding/    # Онбординг
├── store/             # Zustand store
│   └── slices/        # Слайсы состояния
├── lib/               # Утилиты
│   ├── api/           # API клиент и sync
│   ├── i18n/          # Конфигурация i18n
│   └── telegram/      # Telegram helpers
├── hooks/             # Custom hooks
├── locales/           # Переводы (en.json, ru.json)
└── types/             # TypeScript типы
```

## Разработка

```bash
# Установка зависимостей
npm install

# Dev сервер
npm run dev
# http://localhost:5173

# Сборка
npm run build

# Превью production
npm run preview
```

## Переменные окружения

```env
# API URL (оставить пустым для относительного /api)
VITE_API_URL=
```

## Ключевые особенности

### Telegram интеграция

- Автоматическая аутентификация через `initData`
- Использование MainButton, BackButton
- Синхронизация темы с Telegram

### Offline режим

- Оптимистичные обновления UI
- Очередь offline-запросов (`lib/api/queue.ts`)
- Автоматическая синхронизация при восстановлении сети

### Таймеры

- `activeSleepStart` — активный сон
- `activeWalkStart` — активная прогулка
- Сохраняются в settings и восстанавливаются при sync

### Логирование и API клиент

- Frontend теперь использует централизованный `logger` (`src/lib/logger.ts`) — не используйте `console.*` в коде, используйте `logger.error/warn/info/debug/http`.
- Все API вызовы должны идти через `src/lib/api/client.ts` (`apiGet`, `apiPost`, `apiDelete`), который:
	- добавляет `X-Telegram-Init-Data` заголовок для аутентификации,
	- маскирует чувствительные данные в логах (initData/token/password),
	- поддерживает опциональный `timeoutMs` (по умолчанию 30s),
	- корректно разбирает `JSON` и возвращает текст при не-JSON ответах,
	- выбрасывает `ApiError` с `status` и `body` при не-OK ответах.
	- поддерживает опцию `retries` для временных ошибок (по умолчанию `0`), и возвращает ранний ответ для HTTP 204.

Используйте `handleApiError` (`src/lib/api/errorHandler.ts`) для показа пользовательских уведомлений при ошибках API, и `withOfflineQueue` для операций, которые должны добавляться в очередь офлайн при отказе сети.

## Локализация

Поддерживаемые языки:
- Русский (`ru.json`)
- English (`en.json`)

Добавление нового ключа:
1. Добавьте в оба файла `locales/`
2. Используйте: `const { t } = useTranslation(); t('key')`

## Тестирование в браузере

Для локальной разработки без Telegram используется `mock-env.ts`:

```typescript
// Мокает window.Telegram.WebApp
```

**Важно**: В production Mini App работает только внутри Telegram.
