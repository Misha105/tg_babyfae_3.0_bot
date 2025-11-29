# 🔍 Мониторинг Babyfae 3.0 — Dozzle

Интегрированное решение для просмотра логов Docker-контейнеров в реальном времени с безопасным доступом через интернет.

## Характеристики Dozzle

| Параметр | Значение |
|----------|----------|
| RAM | ~10-15 MB |
| CPU | <1% |
| Зависимости | Нет |
| GitHub Stars | 79,000+ |
| Лицензия | MIT |

---

## 🚀 Быстрый старт на VPS

### Шаг 1: Сгенерируйте пароль

```bash
# Подключитесь к VPS и выполните:
docker run -it --rm amir20/dozzle generate admin --password "ВашНадёжныйПароль123!"
```

Скопируйте весь вывод (блок `users:`) и замените содержимое файла:
```bash
nano monitoring/dozzle-data/users.yml
```

### Шаг 2: Запустите приложение

```bash
# Из корня проекта
docker compose up -d --build
```

### Шаг 3: Настройте Nginx (см. ниже)

После настройки Nginx доступ по адресу:
```
https://your-domain.com/monitor/
```

---

## 🔐 Настройка Nginx для безопасного доступа

Dozzle доступен по адресу `https://your-domain.com/monitor/` через существующий Nginx с SSL.

### Обновите конфиг Nginx на VPS

Отредактируйте файл `/etc/nginx/sites-available/babyfae`:

```bash
sudo nano /etc/nginx/sites-available/babyfae
```

Замените содержимое на:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers
    # NOTE: X-Frame-Options removed - Telegram Mini App requires iframe embedding
    # Use Content-Security-Policy frame-ancestors instead
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "frame-ancestors 'self' https://web.telegram.org https://telegram.org https://*.telegram.org" always;
    
    # File upload limit
    client_max_body_size 20M;

    # =========================================================================
    # Main Application (Frontend + API)
    # =========================================================================
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # =========================================================================
    # Monitoring Panel (Dozzle)
    # =========================================================================
    # Access: https://your-domain.com/monitor/
    # Authentication: Built-in (users.yml)
    # =========================================================================
    location /monitor/ {
        proxy_pass http://127.0.0.1:9999/monitor/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (required for real-time logs)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        
        # Disable buffering for real-time streaming
        proxy_buffering off;
        proxy_cache off;
    }
}
```

### Применение конфигурации

```bash
# Проверка синтаксиса
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx
```

### Если SSL ещё не настроен

```bash
# Установка Certbot (если не установлен)
sudo apt install certbot python3-certbot-nginx -y

# Получение сертификата
sudo certbot --nginx -d your-domain.com
```

---

## 🛡️ Безопасность

### Что уже сделано

| Мера | Описание |
|------|----------|
| ✅ Bcrypt пароли | Хеширование с солью |
| ✅ Localhost only | Порты 8080/9999 доступны только локально |
| ✅ HTTPS | Шифрование через Let's Encrypt |
| ✅ Read-only socket | Docker socket монтируется только для чтения |
| ✅ No-new-privileges | Запрет эскалации привилегий |
| ✅ Resource limits | Лимит 64MB RAM, 0.25 CPU |
| ✅ Security headers | X-Frame-Options, CSP и др. |

### Дополнительные меры (опционально)

#### 1. Ограничение по IP

Если доступ нужен только с определённых IP:

```nginx
location /monitor/ {
    # Разрешить только вашему IP
    allow 123.45.67.89;  # Ваш домашний IP
    allow 10.0.0.0/8;    # VPN сеть
    deny all;
    
    proxy_pass http://127.0.0.1:9999/monitor/;
    # ... остальные настройки
}
```

#### 2. Basic Auth поверх Dozzle (двойная защита)

```bash
# Создание файла паролей
sudo apt install apache2-utils -y
sudo htpasswd -c /etc/nginx/.htpasswd monitor_admin
```

```nginx
location /monitor/ {
    auth_basic "Monitoring Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    proxy_pass http://127.0.0.1:9999/monitor/;
    # ... остальные настройки
}
```

#### 3. Fail2Ban для защиты от брутфорса

```bash
# Создайте фильтр для Dozzle
sudo nano /etc/fail2ban/filter.d/dozzle.conf
```

```ini
[Definition]
failregex = ^.*"POST /monitor/api/token.*" 401.*$
ignoreregex =
```

```bash
# Добавьте jail
sudo nano /etc/fail2ban/jail.local
```

```ini
[dozzle]
enabled = true
filter = dozzle
logpath = /var/log/nginx/access.log
maxretry = 5
bantime = 3600
findtime = 600
```

```bash
sudo systemctl restart fail2ban
```

---

## 📊 Возможности Dozzle

### Real-time логи
- Автоматическая прокрутка
- JSON подсветка с цветовым кодированием
- Фильтрация по уровню (error, warn, info)

### Поиск
- Полнотекстовый поиск
- Regex-фильтры
- SQL-запросы к логам

### Множественные контейнеры
- Объединённый просмотр
- Группировка по проектам
- Временная синхронизация

---

## 🔧 Управление

### Команды

```bash
# Статус всех контейнеров
docker compose ps

# Логи мониторинга
docker logs babyfae-dozzle

# Перезапуск мониторинга
docker compose restart dozzle

# Обновление Dozzle
docker compose pull dozzle
docker compose up -d dozzle
```

### Смена пароля

```bash
# Генерация нового хеша
docker run -it --rm amir20/dozzle generate admin --password "НовыйПароль"

# Редактирование users.yml
nano monitoring/dozzle-data/users.yml

# Перезапуск
docker compose restart dozzle
```

### Добавление пользователя только для чтения

```bash
# Генерация пользователя
docker run -it --rm amir20/dozzle generate viewer \
  --password "ViewerPass123" \
  --name "Viewer" \
  --user-roles none
```

Добавьте вывод в `users.yml` и перезапустите dozzle.

---

## ❓ Устранение неполадок

### Dozzle не показывает логи

```bash
# Проверьте доступ к Docker socket
docker exec babyfae-dozzle ls -la /var/run/docker.sock

# Проверьте драйвер логов контейнеров
docker inspect babyfae-bot --format='{{.HostConfig.LogConfig.Type}}'
# Должно быть: json-file
```

### 502 Bad Gateway

```bash
# Проверьте, запущен ли Dozzle
docker compose ps dozzle

# Проверьте логи
docker logs babyfae-dozzle

# Проверьте доступность
curl -I http://127.0.0.1:9999/monitor/
```

### Не работает авторизация

```bash
# Проверьте формат users.yml
docker logs babyfae-dozzle | grep -i "user\|auth"

# Перегенерируйте пароль
docker run -it --rm amir20/dozzle generate admin --password "NewPass"
```

---

## 📚 Ссылки

- [Dozzle Documentation](https://dozzle.dev/)
- [GitHub Repository](https://github.com/amir20/dozzle)
- [Supported Environment Variables](https://dozzle.dev/guide/supported-env-vars)
