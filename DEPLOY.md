# Развертывание BabyFae на VPS

Полная инструкция по развертыванию с использованием Docker Compose.

## Содержание

1. [Требования](#требования)
2. [Подготовка сервера](#подготовка-сервера)
3. [Установка приложения](#установка-приложения)
4. [Настройка домена и SSL](#настройка-домена-и-ssl)
5. [Настройка Telegram бота](#настройка-telegram-бота)
6. [Мониторинг](#мониторинг)
7. [Обслуживание](#обслуживание)
8. [Устранение неполадок](#устранение-неполадок)

---

## Требования

### Минимальные (тестирование)

| Ресурс | Значение |
|--------|----------|
| CPU | 1 ядро |
| RAM | 1 GB + Swap 2 GB |
| Disk | 15 GB SSD |
| OS | Ubuntu 22.04/24.04 LTS, Debian 12/13 |

### Рекомендуемые (production до 10K пользователей)

| Ресурс | Значение |
|--------|----------|
| CPU | 2 ядра |
| RAM | 2 GB |
| Disk | 25 GB NVMe |
| OS | Ubuntu 24.04 LTS |

---

## Подготовка сервера

### 1. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git sqlite3 nano htop
```

### 2. Настройка Swap (обязательно при RAM < 4 GB)

Сборка frontend требует много памяти. Без Swap процесс может быть убит OOM killer.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Автозагрузка
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Установка Docker

```bash
# Удаление старых версий
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null

# Установка Docker CE
curl -fsSL https://get.docker.com | sudo sh

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Перелогиньтесь для применения
exit
# Затем подключитесь снова
```

Проверка:

```bash
docker --version
# Docker version 27.x.x

docker compose version
# Docker Compose version v2.x.x
```

### 4. Базовая безопасность

```bash
# Firewall
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Fail2Ban (защита от брутфорса)
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

---

## Установка приложения

### 1. Клонирование репозитория

```bash
cd ~
git clone https://github.com/Misha105/tg_babyfae_3.0_bot.git app
cd app
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env
nano .env
```

Заполните:

```env
# Обязательные
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
WEBAPP_URL=https://your-domain.com

# Опциональные
NODE_ENV=production
ENABLE_BOT_POLLING=true
TZ=Europe/Moscow
```

### 3. Запуск

```bash
docker compose up -d --build
```

Первая сборка занимает 3-5 минут.

### 4. Проверка

```bash
# Статус контейнеров
docker compose ps

# NAME              STATUS
# babyfae-bot       Up (healthy)
# babyfae-frontend  Up
# babyfae-dozzle    Up (healthy)

# Health check
curl -s http://localhost:8080/health | jq
```

---

## Настройка домена и SSL

### Бесплатные домены

Если нет своего домена:

| Сервис | Пример | Особенности |
|--------|--------|-------------|
| [sslip.io](https://sslip.io) | `45.12.34.56.sslip.io` | Мгновенно, без регистрации |
| [nip.io](https://nip.io) | `45-12-34-56.nip.io` | Мгновенно, без регистрации |
| [DuckDNS](https://duckdns.org) | `myapp.duckdns.org` | Бесплатно, нужна регистрация |

### Установка Nginx и Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Конфигурация Nginx

```bash
sudo nano /etc/nginx/sites-available/babyfae
```

В этом примере Nginx действует как публичный reverse-proxy (TLS termination) и проксирует запросы
к внутреннему приложению на 127.0.0.1:8080 (frontend) и 127.0.0.1:9999 (Dozzle).

Содержимое (с дополнительными мерами безопасности и настройками для Certbot):

```nginx
# Map to handle WebSocket connection header behavior
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 80;
  server_name your-domain.com;  # Замените на ваш домен

  # Allow ACME challenge for Certbot
  location ^~ /.well-known/acme-challenge/ {
    default_type "text/plain";
    root /var/www/letsencrypt;
  }

  # Redirect all other requests to HTTPS
  location / {
    return 301 https://$host$request_uri;
  }
}

server {
  listen 443 ssl http2;
  server_name your-domain.com;

  # Letsencrypt certs (certbot will replace these paths)
  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
  ssl_protocols TLSv1.3 TLSv1.2;
  ssl_prefer_server_ciphers off;
  ssl_session_timeout 1d;
  ssl_session_cache shared:SSL:10m;
  ssl_session_tickets off;
  # Optionally add dhparam for increased security
  # ssl_dhparam /etc/ssl/certs/dhparam.pem;
  ssl_stapling on;
  ssl_stapling_verify on;
  resolver 1.1.1.1 8.8.8.8 valid=300s;
  resolver_timeout 5s;

  # Security hardening
  server_tokens off;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  # Allow embedding only in Telegram domains (no X-Frame-Options: keep CSP instead)
  add_header Content-Security-Policy "frame-ancestors 'self' https://web.telegram.org https://telegram.org https://*.telegram.org" always;
  # Limit upload size (imports/backups)
  client_max_body_size 50M;

  # Rate limiting - adjust req/sec as needed for your environment
  # 1 request per second with a burst of 5
  limit_req_zone $binary_remote_addr zone=mylimit:10m rate=1r/s;
  limit_req zone=mylimit burst=5 nodelay;
  # Optionally limit total concurrent connections per IP
  limit_conn_zone $binary_remote_addr zone=addr:10m;
  limit_conn addr 10;

  # Proxy frontend (SPA)
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_hide_header X-Frame-Options;  # Ensure container doesn't set X-Frame-Options
    proxy_read_timeout 120s;
    proxy_connect_timeout 30s;
    proxy_buffering off;
  }

  # Prevent accidental exposure of dotfiles, env files, or repo artifacts
  # Adjust patterns as needed for your environment
  location ~* /(\.|\.env|\.git) {
    deny all;
    access_log off;
    log_not_found off;
  }

  # Monitoring (Dozzle)
  location /monitor/ {
    proxy_pass http://127.0.0.1:9999/monitor/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_hide_header X-Frame-Options;
    # Optional: enforce Basic Auth at the Nginx layer for extra protection
    # auth_basic "Dozzle Admin";
    # auth_basic_user_file /etc/nginx/.htpasswd;
  }
}

```

Примечания:
- Certbot `--nginx` автоматически обновит конфигурацию и добавит корректные `ssl_certificate` пути; `/.well-known/acme-challenge/` необходимо разрешить для HTTP.
- Не используйте `X-Frame-Options` — он конфликтует с Telegram Mini App embedding; используйте `Content-Security-Policy: frame-ancestors`.
- `proxy_hide_header X-Frame-Options;` гарантирует, что контейнер не добавит header, который бы ломал embedding.
- Добавьте `auth_basic` для `/monitor/` если вы хотите дополнительную защиту (htpasswd + systemd secret or strong password).
- Consider adding `limit_req_zone` / `limit_conn` for rate-limiting if public traffic is a risk.


Активация:

```bash
sudo ln -s /etc/nginx/sites-available/babyfae /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Получение SSL сертификата

```bash
sudo certbot --nginx -d your-domain.com
```

Следуйте инструкциям. Certbot автоматически настроит HTTPS и автообновление сертификата.

### Рекомендации по hardening TLS (опционально)

1. Генерация `dhparam` (увеличивает безопасность соединения):
```bash
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
```

2. Настройка безопасных TLS-параметров: обновите конфигурацию Nginx (см. https://ssl-config.mozilla.org/)
например, добавьте в `server` блок:
```nginx
ssl_protocols TLSv1.3 TLSv1.2;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
ssl_dhparam /etc/ssl/certs/dhparam.pem; # (если сгенерирован)
```

3. Проверьте конфигурацию с помощью:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

4. Проверьте конфигурацию TLS и headers с помощью SSL Labs: `https://www.ssllabs.com/ssltest/` или `curl -I -k https://your-domain.com`.

---

## Настройка Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/mybots`
3. Выберите вашего бота
4. **Bot Settings** → **Menu Button** → **Configure Menu Button**
5. Отправьте URL: `https://your-domain.com`

✅ Готово! Кнопка меню в боте будет открывать Mini App.

---

## Мониторинг

В проект интегрирован [Dozzle](https://dozzle.dev/) — легковесный веб-интерфейс для просмотра логов.

### Настройка пароля

```bash
docker run -it --rm amir20/dozzle generate admin --password "YourSecurePassword123!"
```

Скопируйте вывод в файл:

```bash
nano monitoring/dozzle-data/users.yml
```

### Доступ

После настройки Nginx:

```
https://your-domain.com/monitor/
```

Логин: `admin`, пароль: ваш пароль.

### Дополнительно: Basic Auth для /monitor
Если вы хотите добавить дополнительный слой защиты на уровне Nginx (помимо авторизации Dozzle), вы можете включить Basic Auth на `/monitor/`.

1. Установите apache2-utils (для htpasswd):
```bash
sudo apt install -y apache2-utils
```
2. Создайте файл паролей (безопасно храните его):
```bash
sudo htpasswd -c /etc/nginx/.htpasswd admin
```
3. В конфиге Nginx добавьте в блок `location /monitor/`:
```nginx
auth_basic "Dozzle Admin";
auth_basic_user_file /etc/nginx/.htpasswd;
```
Перезапустите `nginx`.

Примечание: при использовании `docker-compose`, держите credentials вне контейнеров в секрете или используйте другой слой прокси для защиты мониторинга.

---

## Обслуживание

### Логи

```bash
# Все сервисы
docker compose logs -f

# Конкретный сервис
docker compose logs -f bot
docker compose logs -f frontend
```

### Обновление

```bash
cd ~/app
git pull origin master
docker compose up -d --build
```

### Резервное копирование

Создайте скрипт:

```bash
nano ~/app/backup.sh
```

```bash
#!/bin/bash
# backup.sh
set -e

BACKUP_DIR="/root/backups"
DATA_DIR="/root/app/data"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p "$BACKUP_DIR"

# Проверка существования базы
if [ ! -f "$DATA_DIR/babyfae.db" ]; then
    echo "Error: Database not found at $DATA_DIR/babyfae.db"
    exit 1
fi

# SQLite безопасный бэкап (работает даже при активной записи)
sqlite3 "$DATA_DIR/babyfae.db" ".backup '$BACKUP_DIR/babyfae_$DATE.db'"

# Удаление бэкапов старше 7 дней
find "$BACKUP_DIR" -type f -name "*.db" -mtime +7 -delete

echo "$(date): Backup created: $BACKUP_DIR/babyfae_$DATE.db"
```

Сделайте исполняемым:

```bash
chmod +x ~/app/backup.sh
```

Добавьте в cron:

```bash
crontab -e
# Добавьте строку:
0 3 * * * /root/app/backup.sh >> /var/log/babyfae-backup.log 2>&1
```

### Восстановление из бэкапа

```bash
docker compose stop bot
cp /root/backups/babyfae_YYYY-MM-DD.db ~/app/data/babyfae.db
docker compose start bot
```

### Перезапуск

```bash
docker compose restart
```

### Полная остановка

```bash
docker compose down
```

### Очистка

```bash
# Неиспользуемые образы и контейнеры
docker system prune -a

# Только образы
docker image prune -a
```

---

## Устранение неполадок

### Бот не отвечает на команды

### Проверка заголовков (ответ сервера)

Проверьте, что ответ не содержит `X-Frame-Options` и содержит корректный CSP `frame-ancestors`:

```bash
# Показывает все заголовки ответа
curl -I https://your-domain.com

# Или проверить только интересующие заголовки
curl -s -D - -o /dev/null https://your-domain.com | grep -i "^Content-Security-Policy\|^X-Frame-Options"
```

Если `X-Frame-Options` присутствует — ищите его в Nginx, CDN (Cloudflare, Fastly), LB, or WAF and disable it there.

```bash
# Проверьте логи
docker compose logs bot | tail -50

# Проверьте токен
grep TELEGRAM_BOT_TOKEN .env
```

### WebApp показывает белый экран

1. Откройте DevTools в Telegram Desktop (правый клик → Inspect)
2. Проверьте вкладку Console на ошибки
3. Проверьте Network — запросы к `/api` должны возвращать 200

```bash
# Проверьте связь frontend → backend
docker compose logs frontend | grep -i error
curl http://localhost:8080/health
```

### «X-Frame-Options» блокирует iframe

Mini App должен открываться в iframe Telegram. Если видите эту ошибку:

1. Проверьте `frontend/nginx.conf` — не должно быть `X-Frame-Options`
2. Должен быть CSP с `frame-ancestors`:

```nginx
add_header Content-Security-Policy "frame-ancestors 'self' https://web.telegram.org https://telegram.org https://*.telegram.org" always;
```

3. Пересоберите: `docker compose up -d --build frontend`

4. Если проблема не исчезла — проверьте REVERSE PROXY / load balancer / CDN (внешний Nginx),
  убедитесь, что тот не вставляет `X-Frame-Options: sameorigin`.
  Пример как проверить заголовки ответа:
```bash
curl -I https://your-domain.com | sed -n '1,50p'
```
  Если в ответе есть `X-Frame-Options`, найдите, какая часть инфраструктуры добавляет header и отключите его.

### «Database is locked»

SQLite в WAL режиме, но если проблема повторяется:

```bash
# Проверьте, что только один контейнер bot запущен
docker ps | grep bot

# Оптимизация базы
sqlite3 ~/app/data/babyfae.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

### Ошибка OOM при сборке (код 137)

Недостаточно памяти. Настройте Swap (см. раздел «Подготовка сервера»).

### Порт 8080 уже занят

```bash
# Найти процесс
sudo lsof -i :8080

# Изменить порт в docker-compose.yml
ports:
  - "127.0.0.1:8081:80"  # Поменяйте 8080 на 8081
```

---

## Миграция на другой сервер

### На старом сервере

```bash
cd ~/app
docker compose down

# Создание архива
tar -czvf ~/migration.tar.gz data/ .env
```

Скачайте `migration.tar.gz` на локальный компьютер.

### На новом сервере

1. Выполните разделы «Подготовка сервера» и начало «Установка приложения»
2. Загрузите архив и распакуйте:

```bash
cd ~/app
tar -xzvf ~/migration.tar.gz
docker compose up -d --build
```

3. Обновите DNS-записи домена на новый IP
4. Настройте Nginx и SSL

---

## Ротация логов Docker

Docker по умолчанию не ограничивает размер логов. Настройте глобально:

```bash
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
sudo systemctl restart docker
```

> В `docker-compose.yml` проекта уже настроена ротация для каждого сервиса.

---

## Масштабирование

Текущая архитектура (SQLite + single instance) подходит для 10-50K активных пользователей.

Для большей нагрузки:
1. Миграция на PostgreSQL
2. Несколько реплик API за load balancer
3. Redis для сессий и кэша
4. Kubernetes (после п.1-3)
