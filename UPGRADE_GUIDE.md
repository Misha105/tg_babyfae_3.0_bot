# Руководство по обновлению

## Обновление с v2.x на v3.0

### ⚠️ Критические изменения

1. **Обязательная аутентификация API**
   - Все эндпоинты `/api/*` теперь требуют заголовок `X-Telegram-Init-Data`
   - Frontend отправляет его автоматически через новый API клиент

2. **Уведомления отключены**
   - Функция scheduled notifications удалена
   - Эндпоинты `/api/schedules/*` возвращают `410 Gone`

3. **Новые зависимости**
   - Node.js 22+ (был 20+)
   - Express 5 (был 4.x)
   - Vite 7 (был 5.x)

---

## Шаги обновления

### 1. Резервное копирование

```bash
# Docker
docker cp babyfae-bot:/app/data/babyfae.db ./backup_$(date +%Y%m%d).db

# Или через volume
cp ./data/babyfae.db ./backup_$(date +%Y%m%d).db
```

### 2. Получение обновлений

```bash
cd /path/to/tg_babyfae_3.0_bot
git fetch origin
git pull origin master
```

### 3. Пересборка (Docker)

```bash
docker compose down
docker compose up -d --build
```

### 4. Пересборка (без Docker)

```bash
npm run install:all
cd bot && npm run build
cd ../frontend && npm run build
```

### 5. Проверка

```bash
# Health check
curl http://localhost:8080/health

# Ожидаемый ответ:
{
  "status": "ok",
  "uptime": 123.45,
  "database": "connected",
  "timestamp": "2025-11-29T12:00:00.000Z"
}
```

---

## Проверка после обновления

- [ ] Mini App открывается в Telegram
- [ ] Данные пользователя загружаются
- [ ] Можно добавить новую активность
- [ ] Можно редактировать активность
- [ ] Можно удалить активность
- [ ] Таймер сна работает корректно
- [ ] Таймер прогулки работает корректно
- [ ] Настройки сохраняются

---

## Устранение проблем

### «Unauthorized: Missing Telegram authentication data»

**Причина**: Frontend не отправляет initData

**Решение**:
1. Очистите кэш браузера
2. Закройте и откройте Mini App заново
3. Убедитесь, что открываете через Telegram (не напрямую в браузере)

### «X-Frame-Options: sameorigin» при открытии в Telegram Web

**Причина**: Nginx блокирует iframe

**Решение**: Проверьте, что `frontend/nginx.conf` содержит:

```nginx
add_header Content-Security-Policy "frame-ancestors 'self' https://web.telegram.org https://telegram.org https://*.telegram.org" always;
```

И НЕ содержит `add_header X-Frame-Options`.

### База данных недоступна

```bash
# Проверка целостности
sqlite3 ./data/babyfae.db "PRAGMA integrity_check;"

# Если повреждена — восстановите из бэкапа
cp ./backup_YYYYMMDD.db ./data/babyfae.db
docker compose restart bot
```

### Контейнер не запускается

```bash
# Проверьте логи
docker compose logs bot

# Проверьте .env файл
cat .env | grep TELEGRAM_BOT_TOKEN
```

---

## Откат

Если обновление критически нарушило работу:

```bash
# 1. Остановите контейнеры
docker compose down

# 2. Откатите код
git checkout v2.0.0  # или конкретный коммит

# 3. Восстановите базу
cp ./backup_YYYYMMDD.db ./data/babyfae.db

# 4. Пересоберите
docker compose up -d --build
```

---

## Changelog v3.0.0

### Безопасность
- ✅ Telegram WebApp аутентификация на всех API эндпоинтах
- ✅ Валидация всех входных данных (valibot)
- ✅ Rate limiting (100 req/15 min)
- ✅ Security headers (CSP, X-Content-Type-Options)
- ✅ SQL injection protection

### Новые функции
- ✅ Действие «Прогулка» с таймером
- ✅ Кастомные активности с иконками и цветами
- ✅ Улучшенное отображение в календаре

### Исправления
- ✅ Сохранение настроек (merge вместо overwrite)
- ✅ Восстановление таймеров после синхронизации
- ✅ Правильная обработка endTimestamp

### Инфраструктура
- ✅ Node.js 22, Express 5, Vite 7
- ✅ Docker multi-stage builds
- ✅ Dozzle мониторинг
- ✅ Resource limits для контейнеров
