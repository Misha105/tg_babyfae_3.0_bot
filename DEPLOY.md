# Инструкция по развертыванию BabyFae Bot на VPS

Этот проект подготовлен для развертывания с использованием **Docker Compose**. Это гарантирует, что приложение будет работать на сервере так же, как и локально, изолируя его от окружения сервера.

## Системные требования (VPS)

Для стабильной работы приложения (Backend + Frontend + Database) рекомендуются следующие характеристики:

### Минимальные (для старта и тестов)
*   **CPU**: 1 ядро
*   **RAM**: 1 ГБ (Обязательно настроить Swap файл 2-4 ГБ, иначе сборка может упасть по памяти)
*   **Disk**: 15 ГБ SSD
*   **OS**: Ubuntu 22.04 LTS / 24.04 LTS

### Рекомендуемые (Production, до 10к пользователей)
*   **CPU**: 2 ядра
*   **RAM**: 2 ГБ
*   **Disk**: 25 ГБ NVMe / SSD
*   **OS**: Ubuntu 22.04 LTS / 24.04 LTS

---

## Архитектура
*   **Frontend**: React приложение, собирается в статические файлы и раздается через Nginx (внутри контейнера).
*   **Backend**: Node.js/Express приложение, работает в отдельном контейнере.
*   **Database**: SQLite, файл базы данных сохраняется в volume для персистентности.
*   **Proxy**: Nginx внутри frontend-контейнера проксирует запросы `/api` к backend-контейнеру.

---

## Шаг 1: Подготовка VPS

Зайдите на свой сервер по SSH.

1.  **Обновите систему:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

2.  **Установите Docker и Docker Compose:**
    В современных дистрибутивах (Ubuntu 22.04/24.04) рекомендуется использовать официальный репозиторий Docker.
    ```bash
    # Удаляем старые версии, если есть
    sudo apt-get remove docker docker-engine docker.io containerd runc

    # Устанавливаем зависимости
    sudo apt-get update
    sudo apt-get install ca-certificates curl gnupg

    # Добавляем GPG ключ Docker
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Добавляем репозиторий
    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Устанавливаем Docker Engine
    sudo apt-get update
    sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
    ```

3.  **Установите Git:**
    ```bash
    sudo apt install git -y
    ```

---

## Шаг 2: Установка и запуск приложения

1.  **Клонируйте репозиторий** (или загрузите файлы через SFTP):
    ```bash
    git clone <ссылка_на_ваш_репозиторий> app
    cd app
    ```

2.  **Настройте переменные окружения:**
    Скопируйте пример конфигурации:
    ```bash
    cp .env.example .env
    nano .env
    ```
    
    Заполните файл `.env`:
    *   `TELEGRAM_BOT_TOKEN`: Ваш токен от BotFather.
    *   `WEBAPP_URL`: `https://ваш-домен.com` (важно указать https).
    *   `NODE_ENV`: `production`
    *   `PORT`: `3000`
    *   `VITE_API_URL`: Оставьте пустым! (Nginx внутри контейнера сам перенаправит запросы).

3.  **Запустите контейнеры:**
    Используйте команду `docker compose` (V2), которая является стандартом в 2024-2025 годах.
    ```bash
    sudo docker compose up -d --build
    ```
    *Команда скачает образы, соберет приложение и запустит его в фоне.*

---

## Шаг 3: Настройка домена и SSL (HTTPS)

Telegram WebApp **требует** наличие HTTPS. Мы настроим Nginx на самом сервере (хосте) как обратный прокси с SSL-сертификатом.
**Важно:** Мы используем порт `8080` для Docker-контейнера, чтобы освободить стандартный порт `80` для системного Nginx.

1.  **Установите Nginx и Certbot на хост-машину:**
    ```bash
    sudo apt install nginx certbot python3-certbot-nginx -y
    ```

2.  **Создайте конфиг для вашего сайта:**
    ```bash
    sudo nano /etc/nginx/sites-available/babyfae
    ```

    Вставьте следующий код (замените `your-domain.com` на ваш реальный домен):
    ```nginx
    server {
        server_name your-domain.com;

        location / {
            proxy_pass http://127.0.0.1:8080; # Проксируем на наш Docker-контейнер (порт 8080)
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```

3.  **Активируйте сайт:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/babyfae /etc/nginx/sites-enabled/
    sudo nginx -t # Проверка конфига (должно быть: syntax is ok, test is successful)
    sudo systemctl restart nginx
    ```

4.  **Получите SSL сертификат (автоматически):**
    ```bash
    sudo certbot --nginx -d your-domain.com
    ```
    Следуйте инструкциям на экране. Certbot сам настроит HTTPS и автообновление сертификата.

---

## Шаг 4: Настройка в Telegram

1.  Откройте **BotFather** в Telegram.
2.  Выберите своего бота.
3.  Перейдите в `Bot Settings` -> `Menu Button` -> `Configure Menu Button`.
4.  Отправьте ссылку на ваш сайт: `https://your-domain.com` (обязательно с https).
5.  Готово! Теперь кнопка "Меню" в боте будет открывать ваше WebApp.

---

## Полезные команды

*   **Посмотреть логи контейнеров:**
    ```bash
    sudo docker compose logs -f
    ```

*   **Перезапустить приложение:**
    ```bash
    sudo docker compose restart
    ```

*   **Полностью остановить приложение:**
    ```bash
    sudo docker compose down
    ```

*   **Обновить код и пересобрать:**
    ```bash
    git pull
    sudo docker compose up -d --build
    ```

---

## Рекомендации по настройке и оптимизации VPS

Чтобы ваш сервер работал стабильно и безопасно, выполните следующие настройки сразу после получения доступа к VPS.

### 1. Настройка Swap (Файл подкачки)
Если у вас меньше 4 ГБ RAM, Swap **обязателен**. Docker-сборка (`npm install`, `npm run build`) потребляет много памяти и может "убить" процесс без Swap.

```bash
# Проверяем текущий swap
sudo swapon --show

# Создаем файл подкачки 4ГБ
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Делаем постоянным (добавляем в fstab)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Базовая безопасность (Firewall & SSH)
Не оставляйте сервер открытым для всех ветров.

```bash
# 1. Настройка UFW (Firewall)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# 2. Защита от брутфорса (Fail2Ban)
sudo apt install fail2ban -y
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

**Рекомендация по SSH:** Отключите вход по паролю.
1.  Убедитесь, что вы добавили свой SSH-ключ (`ssh-copy-id user@host`).
2.  Отредактируйте конфиг: `sudo nano /etc/ssh/sshd_config`
3.  Установите: `PasswordAuthentication no`
4.  Перезапустите: `sudo systemctl restart ssh`

### 3. Ротация логов Docker
По умолчанию Docker хранит логи контейнеров бесконечно, что может забить диск. Настройте ротацию.

Создайте файл `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```
Затем перезапустите Docker: `sudo systemctl restart docker`.

---

### 4. Резервное копирование (Backups)
Потеря данных — это катастрофа. Настройте автоматическое резервное копирование базы данных.

Простой скрипт для бэкапа SQLite (добавьте в cron):
```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
mkdir -p $BACKUP_DIR

# Копируем файл БД (SQLite в WAL режиме можно копировать на лету, но лучше использовать команду .backup)
docker exec babyfae-bot sqlite3 /app/data/babyfae.db ".backup '/app/data/backup_temp.db'"
docker cp babyfae-bot:/app/data/backup_temp.db $BACKUP_DIR/babyfae_$DATE.db
docker exec babyfae-bot rm /app/data/backup_temp.db

# Удаляем бэкапы старше 7 дней
find $BACKUP_DIR -type f -name "*.db" -mtime +7 -delete
```

---

## Масштабирование (Scalability)

Текущая архитектура приложения оптимизирована для работы на одном VPS (Vertical Scaling). Она использует SQLite в режиме WAL, что обеспечивает высокую производительность (тысячи запросов в секунду) при минимальных ресурсах.

### Уровень 1: Вертикальное масштабирование (Рекомендуется)
Для большинства случаев (до 10-50 тыс. активных пользователей) достаточно одного мощного VPS.
1.  Увеличьте ресурсы сервера (CPU/RAM).
2.  SQLite в режиме WAL (включен по умолчанию) эффективно использует многоядерные процессоры для чтения.

### Уровень 2: Горизонтальное масштабирование (High Load)
Если вам нужно обслуживать сотни тысяч пользователей, потребуется изменить архитектуру:

1.  **База данных**: Миграция с SQLite на **PostgreSQL**.
    *   Код использует абстракцию `dbAsync` (`src/database/db-helper.ts`), поэтому миграция потребует замены реализации этого файла на использование `pg` драйвера, без переписывания всей бизнес-логики.
2.  **Разделение сервисов**:
    *   Запустите несколько контейнеров `bot` (API) за балансировщиком нагрузки (Nginx/HAProxy).
    *   Выделите **один** отдельный контейнер для обработки Telegram-событий и планировщика (Scheduler), установив переменную `ENABLE_BOT_POLLING=true` только для него, и `false` для остальных API-воркеров.
3.  **Очереди**:
    *   Для надежной доставки уведомлений при высокой нагрузке рекомендуется внедрить Redis и BullMQ вместо in-memory планировщика.

### Уровень 3: Kubernetes (K8s)
Kubernetes — это мощный инструмент оркестрации, но для данного проекта его использование имеет смысл **только после перехода на Уровень 2 (PostgreSQL)**.

**Почему нельзя просто перенести текущий код в K8s?**
Текущая версия использует SQLite (файловую базу данных). В Kubernetes поды (контейнеры) эфемерны и могут быть перезапущены на разных узлах.
*   Если запустить 2 реплики бота, у каждой будет **свой** файл базы данных (или конфликт блокировок при использовании общего тома), что приведет к потере данных и рассинхронизации.

**Правильная архитектура для K8s:**
1.  **Database**: Managed PostgreSQL (например, AWS RDS, Google Cloud SQL) или StatefulSet с PostgreSQL внутри кластера.
2.  **Backend (Bot)**: Deployment с `replicas: N`.
    *   Приложение должно быть полностью **stateless** (без сохранения состояния в файлы).
    *   Все сессии и кэши должны храниться в Redis.
3.  **Frontend**: Deployment с Nginx, раздающим статику.
4.  **Ingress**: Nginx Ingress Controller для управления SSL и маршрутизацией.

**Рекомендация:** Не используйте Kubernetes, пока не упретесь в лимиты одного мощного сервера с Docker Compose. Сложность поддержки K8s для монолитного приложения на старте не окупается.

### Конфигурация для масштабирования
В файле `.env` можно управлять режимом работы бота:
```env
# true (по умолчанию) - запускает polling и планировщик.
# false - запускает только API сервер (для горизонтального масштабирования API).
ENABLE_BOT_POLLING=true
```
