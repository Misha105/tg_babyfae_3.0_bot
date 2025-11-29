# 🚀 Быстрый старт

## Требования

- **Node.js 22+** (LTS)
- **Telegram Bot Token** — получить у [@BotFather](https://t.me/BotFather)
- **Cloudflared** (для туннеля) — [установка](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

---

## Разработка (5 минут)

### 1. Клонирование и установка

```bash
git clone https://github.com/Misha105/tg_babyfae_3.0_bot.git
cd tg_babyfae_3.0_bot
npm run install:all
```

### 2. Настройка токена бота

```bash
cp bot/.env.example bot/.env
```

Откройте `bot/.env` и добавьте токен:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 3. Запуск

```bash
npm run dev
```

Запустятся оба сервера:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

### 4. Туннель для Telegram

В отдельном терминале:

```bash
npm run tunnel
```

Скопируйте URL вида `https://xxxx-xxxx.trycloudflare.com`

### 5. Настройка Menu Button

1. Откройте [@BotFather](https://t.me/BotFather)
2. `/mybots` → выберите бота → **Bot Settings** → **Menu Button** → **Configure Menu Button**
3. Отправьте URL из шага 4

✅ Готово! Откройте бота в Telegram и нажмите кнопку меню.

---

## Production (Docker)

### 1. Подготовка сервера

```bash
# Ubuntu/Debian - установка Docker официальным способом
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Перелогиньтесь для применения группы
```

### 2. Клонирование и настройка

```bash
git clone https://github.com/Misha105/tg_babyfae_3.0_bot.git
cd tg_babyfae_3.0_bot

cp .env.example .env
nano .env
```

Заполните:

```env
TELEGRAM_BOT_TOKEN=your_token_here
WEBAPP_URL=https://your-domain.com
NODE_ENV=production
```

### 3. Запуск

```bash
docker compose up -d --build
```

### 4. Проверка

```bash
# Статус контейнеров
docker compose ps

# Health check
curl http://localhost:3000/health
# Ожидаемый ответ: {"status":"ok","database":"connected",...}

# Логи
docker compose logs -f
```

### 5. Настройка HTTPS

См. [DEPLOY.md](./DEPLOY.md) для настройки Nginx + SSL.

---

## Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|--------|
| `TELEGRAM_BOT_TOKEN` | Токен от @BotFather | `123456:ABC...` |
| `WEBAPP_URL` | URL приложения (с HTTPS) | `https://example.com` |
| `NODE_ENV` | Режим работы | `production` / `development` |
| `PORT` | Порт API (внутри Docker) | `3000` |
| `ENABLE_BOT_POLLING` | Включить Long Polling | `true` / `false` |
| `TZ` | Часовой пояс | `Europe/Moscow` |

---

## Полезные команды

```bash
# Остановить
docker compose down

# Пересобрать
docker compose up -d --build

# Логи конкретного сервиса
docker compose logs -f bot
docker compose logs -f frontend

# Очистка неиспользуемых образов
docker system prune -a
```

---

## Следующие шаги

- 📖 [DEPLOY.md](./DEPLOY.md) — полная инструкция по развертыванию
- 🔄 [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md) — обновление версий
- 📊 [monitoring/README.md](./monitoring/README.md) — настройка мониторинга
