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

1.  **Обновите систему и установите базовые утилиты:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install curl git sqlite3 -y
    ```

2.  **Настройте Swap (Файл подкачки) — ОБЯЗАТЕЛЬНО:**
    Сборка Frontend-части требует много памяти. Если у вас меньше 4 ГБ RAM, создайте Swap **до** начала установки, иначе сборка упадет с ошибкой.
    ```bash
    # Проверяем текущий swap
    sudo swapon --show

    # Если пусто, создаем файл подкачки 4ГБ
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile

    # Делаем постоянным
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    ```

3.  **Установите Docker и Docker Compose:**
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

    **Проверка установки Docker:**
    ```bash
    docker --version
    docker compose version
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo systemctl status docker
    ```

---

## Шаг 2: Установка и запуск приложения

1.  **Клонируйте репозиторий** (или загрузите файлы через SFTP):

    **Вариант А: Публичный репозиторий**
    ```bash
    git clone https://github.com/YOUR_USERNAME/tg_babyfae_3.0_bot.git app
    cd app
    ```

    **Вариант Б: Приватный репозиторий (Deploy Key)**
    Для доступа к приватному коду безопаснее всего использовать "Deploy Key".
    1.  Сгенерируйте SSH-ключ на сервере:
        ```bash
        ssh-keygen -t ed25519 -C "vps-deploy"
        # Нажимайте Enter на все вопросы (путь по умолчанию, без пароля)
        ```
    2.  Выведите публичный ключ:
        ```bash
        cat ~/.ssh/id_ed25519.pub
        ```
    3.  Скопируйте ключ и добавьте его в GitHub: **Settings** -> **Deploy keys** -> **Add deploy key**.
    4.  Клонируйте через SSH:
        ```bash
        git clone git@github.com:YOUR_USERNAME/tg_babyfae_3.0_bot.git app
        cd app
        ```

2.  **Настройте переменные окружения:**
    Скопируйте пример конфигурации:
    ```bash
    cp .env.example .env
    nano .env
    ```
    
    Заполните файл `.env` (если каких-то переменных нет в примере, добавьте их):
    *   `TELEGRAM_BOT_TOKEN`: Ваш токен от BotFather.
    *   `WEBAPP_URL`: `https://ваш-домен.com` (важно указать https). Это URL, по которому будет доступно ваше WebApp.
    *   `NODE_ENV`: `production`
    *   `PORT`: `3000`
    *   `VITE_API_URL`: Оставьте пустым! (Nginx внутри контейнера сам перенаправит запросы).
    *   `ENABLE_BOT_POLLING`: `true` (по умолчанию). Установите `false`, если запускаете только API-сервер.
    *   `TZ`: `Europe/Moscow` (или ваш часовой пояс). Полезно для корректного времени в логах.

    **Хранение секретов:**
    ```bash
    chmod 600 .env
    ```
    Не добавляйте `.env` в git (файл уже в `.gitignore`). Используйте менеджер секретов провайдера, если храните значения вне сервера.

### Профили окружений (Dev/Stage/Prod)

| Профиль | Цель | Отличия |
| --- | --- | --- |
| Development | Локальная разработка | Используйте `npm run dev` в подкаталогах `bot/` и `frontend/`, включен Vite proxy на `http://localhost:3000`, `.env` может содержать `NODE_ENV=development`. |
| Staging | Тестирование на VPS | Развертывайте по этой инструкции, но указывайте отдельный домен (например, `staging.example.com`) и Telegram-бота-песочницу. В переменных окружения включайте `ENABLE_BOT_POLLING=false`, если основные уведомления обрабатывает production. |
| Production | Боевая среда | Используйте HTTPS-домен в `WEBAPP_URL`, включайте Swap/Firewall, следите за бэкапами. |

Создайте отдельные `.env.production`, `.env.staging` файлы (не коммитить) и подставляйте их через `env_file` при необходимости.

3.  **Запустите контейнеры:**
    Используйте команду `docker compose` (V2), которая является стандартом в 2024-2025 годах.
    ```bash
    sudo docker compose up -d --build
    ```
    *Команда скачает образы, соберет приложение и запустит его в фоне.*
    
    **Проверка:**
    Убедитесь, что контейнеры запущены:
    ```bash
    sudo docker compose ps
    ```
    Вы должны увидеть два контейнера (`babyfae-bot` и `babyfae-frontend`) со статусом `Up`.
    *Примечание: Порт 8080 открыт только на localhost (127.0.0.1) для безопасности.*

---

## Шаг 3: Настройка домена и SSL (HTTPS)

Telegram WebApp **требует** наличие HTTPS. Мы настроим Nginx на самом сервере (хосте) как обратный прокси с SSL-сертификатом.
**Важно:** Мы используем порт `8080` для Docker-контейнера, чтобы освободить стандартный порт `80` для системного Nginx.

### Если у вас нет домена (Бесплатные варианты)
Для работы WebApp **обязателен** домен (IP-адрес не подойдет для получения бесплатного SSL сертификата). Если вы не хотите покупать домен, используйте один из проверенных бесплатных вариантов:

#### Вариант А: sslip.io или nip.io (Мгновенные, без регистрации)
Эти сервисы автоматически превращают ваш IP в домен.
1.  Узнайте IP вашего VPS (например, `45.12.34.56`).
2.  Ваш домен будет: `45.12.34.56.sslip.io` или `45.12.34.56.nip.io`.
3.  Используйте этот адрес везде в инструкции вместо `your-domain.com`.

#### Вариант Б: DuckDNS или FreeDNS (Красивое имя)
1.  **DuckDNS**: Зайдите на [duckdns.org](https://www.duckdns.org). Создайте домен (например, `babyfae.duckdns.org`) и укажите IP вашего VPS.
2.  **FreeDNS (Afraid.org)**: Зайдите на [freedns.afraid.org](https://freedns.afraid.org/). Там огромный выбор доменных зон (например, `us.to`, `mooo.com`). Регистрация чуть сложнее, но выбор имен больше.

#### Вариант В: Купить дешевый домен (Самый надежный)
Если проект планируется надолго, лучше купить домен в зоне `.ru`, `.site`, `.online`. Они часто стоят 100-200 рублей в год (Reg.ru, Beget, Namecheap). Это избавит от зависимости от бесплатных сервисов.

---

### Настройка Nginx

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

## Проверка готовности (Health-check)

1.  **Проверьте доступность фронтенда c сервера:**
    ```bash
    curl -I http://127.0.0.1:8080
    ```
    Ответ должен содержать `HTTP/1.1 200 OK`.

2.  **Проверьте HTTPS c внешнего адреса (можно с локальной машины):**
    ```bash
    curl -I https://your-domain.com
    ```

3.  **Проверьте backend health endpoint:**
    ```bash
    # Используем wget, так как curl может отсутствовать в минимальном образе
    sudo docker compose exec bot wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health
    ```
    Если команда ничего не вывела (или вернула 0) — все ок. Если ошибка — сервис недоступен.

4.  **Контролируйте логи:**
    ```bash
    sudo docker compose logs --tail=50 bot frontend
    ```

Если какой-либо шаг завершается ошибкой, вернитесь к разделу "Устранение неполадок".

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

Чтобы ваш сервер работал стабильно и безопасно, выполните следующие настройки.

### 1. Базовая безопасность (Firewall & SSH)
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

### 2. Ротация логов Docker
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

### 3. Резервное копирование (Backups)
Потеря данных — это катастрофа. Настройте автоматическое резервное копирование базы данных.

Так как база данных подключена через volume (`./data:/app/data`), мы можем делать бэкап прямо с хост-машины, используя установленную утилиту `sqlite3`.

Простой скрипт для бэкапа (добавьте в cron):
```bash
#!/bin/bash
# Путь к папке проекта (где лежит docker-compose.yml)
PROJECT_DIR="/root/app"
DATA_DIR="$PROJECT_DIR/data"
BACKUP_DIR="/root/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p $BACKUP_DIR

# Используем sqlite3 на хосте для безопасного бэкапа (даже если база активна)
# Убедитесь, что sqlite3 установлен: sudo apt install sqlite3
if [ -f "$DATA_DIR/babyfae.db" ]; then
    sqlite3 "$DATA_DIR/babyfae.db" ".backup '$BACKUP_DIR/babyfae_$DATE.db'"
    echo "Backup created: $BACKUP_DIR/babyfae_$DATE.db"
else
    echo "Database file not found at $DATA_DIR/babyfae.db"
fi

# Удаляем бэкапы старше 7 дней
find $BACKUP_DIR -type f -name "*.db" -mtime +7 -delete
```

### 5. Восстановление из бэкапа (Restore)
Если база данных повредилась или нужно откатиться к предыдущему состоянию:

1.  **Остановите бота:**
    Важно остановить запись в базу перед заменой файла.
    ```bash
    sudo docker compose stop bot
    ```

2.  **Найдите нужный бэкап:**
    ```bash
    ls -lh /root/backups/
    # Выберите файл, например: babyfae_2025-11-24_12-00-00.db
    ```

3.  **Замените текущую базу:**
    ```bash
    # Сохраняем текущую (сломанную) базу на всякий случай
    mv /root/app/data/babyfae.db /root/app/data/babyfae.db.broken

    # Копируем бэкап на место боевой базы
    cp /root/backups/babyfae_2025-11-24_12-00-00.db /root/app/data/babyfae.db
    ```

4.  **Запустите бота:**
    ```bash
    sudo docker compose start bot
    ```

### 6. Миграция на новый сервер (Migration)
Перенос бота на другой VPS с сохранением всех данных (пользователи, настройки, история).

#### Этап 1: Действия на СТАРОМ сервере
1.  **Остановите бота:**
    Важно остановить запись в базу данных перед копированием, чтобы не потерять последние действия пользователей.
    ```bash
    cd /root/app  # Или ваша папка с проектом
    sudo docker compose down
    ```

2.  **Создайте архив с важными данными:**
    Мы переносим только базу данных (`data/`) и секреты (`.env`). Код приложения проще и правильнее скачать заново из Git.
    ```bash
    # Создаем архив migration_backup.tar.gz, включающий папку data и файл .env
    tar -czvf migration_backup.tar.gz data .env
    ```

3.  **Скачайте архив:**
    Заберите файл `migration_backup.tar.gz` со старого сервера на свой локальный компьютер.
    *   **Через консоль (с вашего ПК):** `scp root@OLD_IP:/root/app/migration_backup.tar.gz .`
    *   **Через SFTP:** Используйте FileZilla или WinSCP.

#### Этап 2: Действия на НОВОМ сервере
1.  **Подготовьте окружение:**
    Выполните **Шаг 1** данной инструкции на новом сервере (обновление системы, установка Docker, **обязательная настройка Swap**).

2.  **Клонируйте код:**
    Выполните **Шаг 2, пункт 1** (клонирование репозитория).
    ```bash
    git clone https://github.com/YOUR_USERNAME/tg_babyfae_3.0_bot.git app
    cd app
    ```

3.  **Загрузите архив с данными:**
    Скопируйте сохраненный архив с вашего компьютера на новый сервер в папку проекта.
    *   **Через консоль (с вашего ПК):** `scp migration_backup.tar.gz root@NEW_IP:/root/app/`

4.  **Распакуйте данные:**
    ```bash
    # Распаковка восстановит .env и базу данных
    tar -xzvf migration_backup.tar.gz
    
    # Проверьте, что файлы на месте
    ls -la
    ```

5.  **Запустите приложение:**
    ```bash
    sudo docker compose up -d --build
    ```

6.  **Переключите домен:**
    1.  Зайдите к регистратору домена и измените **A-запись** на IP-адрес нового сервера.
    2.  Выполните **Шаг 3** данной инструкции (настройка Nginx и получение SSL сертификата) на новом сервере.
    3.  *Старый сервер можно выключать после того, как убедитесь, что DNS обновился и бот работает корректно.*

---

## Устранение неполадок (Troubleshooting)

### 1. Бот не отвечает на команды
*   Проверьте логи: `sudo docker compose logs -f bot`
*   Убедитесь, что токен в `.env` верный.
*   В текущей конфигурации бот использует **Long Polling** (`ENABLE_BOT_POLLING=true`), поэтому он должен работать сразу после запуска.

### 2. WebApp открывается с белым экраном
*   Откройте консоль разработчика в браузере (или Telegram Desktop).
*   Проверьте вкладку Network. Если запросы к `/api/...` падают с ошибкой 404 или 502, значит проблема в связи Frontend -> Backend.
*   Проверьте логи Nginx внутри контейнера: `sudo docker compose logs -f frontend`.
*   Убедитесь, что вы открываете WebApp по HTTPS ссылке.

### 3. Ошибка "Database is locked"
*   SQLite в режиме WAL хорошо справляется с конкурентностью, но если у вас запущено несколько экземпляров бота, использующих один файл БД, могут быть проблемы.
*   Убедитесь, что запущен только один контейнер `bot`.

### 4. Ошибка при сборке (OOM / Out of Memory)
*   Если `npm run build` падает с кодом 137, значит не хватает оперативной памяти.
*   **Решение:** Настройте Swap (см. раздел Рекомендации выше).

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
