# Security Policy

## Overview

This document outlines the security measures implemented in the Babyfae application and provides guidelines for maintaining security.

## Implemented Security Measures

### 1. Authentication & Authorization

- **Telegram WebApp Authentication**: All API requests are authenticated using Telegram's initData validation
- **User Verification**: Each request verifies that the authenticated user matches the requested user ID
- **Token Validation**: Telegram initData is validated using HMAC-SHA256 with timing-safe comparison
- **Session Expiry**: initData older than 24 hours is rejected

### 2. Input Validation

- **User ID Validation**: All user IDs are validated to be positive integers within valid range
- **JSON Size Limits**: Payloads are limited to 100KB to prevent DoS attacks
- **String Length Limits**: All string inputs have maximum length constraints
- **Type Validation**: All inputs are validated for correct data types
- **Activity Validation**: Activity records are validated for required fields and correct formats

### 3. SQL Injection Prevention

- **Parameterized Queries**: All database queries use parameterized statements
- **Input Sanitization**: User inputs are sanitized before processing
- **Transaction Safety**: Database transactions use proper locking mechanisms

### 4. Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Sensitive Operations**: 5 requests per minute for delete/import operations
- **Backup Operations**: 1 request per minute for backup exports

### 5. Security Headers

- **Content Security Policy**: Restricts resource loading to prevent XSS
- **Frame Options**: Prevents clickjacking attacks
- **CORS**: Properly configured for production environment
- **Helmet.js**: Comprehensive security headers

### 6. Data Protection

- **Transaction Atomicity**: All multi-step operations use database transactions
- **Audit Logging**: Critical operations (data deletion) are logged
- **Conflict Prevention**: ID conflicts between users are prevented

## Environment Variables

### Required Variables

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
WEBAPP_URL=https://your-domain.com
NODE_ENV=production
PORT=3000
```

### Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique tokens** for production
3. **Rotate tokens regularly** (at least every 90 days)
4. **Limit file permissions**: `chmod 600 .env`
5. **Use secrets management** in production (AWS Secrets Manager, HashiCorp Vault)

## Deployment Security

### Docker Security

1. **Run as non-root user** (already configured in Dockerfile)
2. **Limit container resources** using Docker resource constraints
3. **Use specific image versions** instead of `latest`
4. **Scan images for vulnerabilities** regularly

### Network Security

1. **Use HTTPS only** for all communications
2. **Configure firewall** to allow only necessary ports (80, 443, 22)
3. **Use fail2ban** to prevent brute force attacks
4. **Keep SSL certificates updated** (use Let's Encrypt with auto-renewal)

### Database Security

1. **Regular backups**: Automated daily backups recommended
2. **Backup encryption**: Encrypt backup files
3. **Access control**: Limit database file permissions to application user only
4. **WAL mode**: Enabled for better concurrency and crash recovery

## Monitoring & Incident Response

### Recommended Monitoring

1. **Error tracking**: Integrate Sentry or similar service
2. **Log aggregation**: Centralize logs for analysis
3. **Performance monitoring**: Track API response times
4. **Security alerts**: Monitor for suspicious activity patterns

### Incident Response

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. **Email** the maintainers directly (add contact email)
3. **Provide** detailed information about the vulnerability
4. **Wait** for confirmation before public disclosure

## Security Checklist for Production

### 1. Environment & Secrets

- [ ] `.env` не в репозитории (в `.gitignore`)
- [ ] Права на `.env` выставлены как `chmod 600 .env`
- [ ] `TELEGRAM_BOT_TOKEN` задан и хранится только в секрете (env/secret manager)
- [ ] `WEBAPP_URL` указывает на HTTPS-домен WebApp (например, `https://your-domain.com`)
- [ ] `NODE_ENV` установлен в `production`
- [ ] `ENABLE_BOT_POLLING` явно задано (`true`/`false`) для нужного процесса

### 2. Хост и сеть

- [ ] Включён firewall (UFW/iptables), разрешены только порты `22/tcp`, `80/tcp`, `443/tcp`
- [ ] Установлен и настроен fail2ban
- [ ] SSH-вход только по ключу, `PasswordAuthentication no`
- [ ] Swap включен на VPS с 1–2 ГБ RAM (см. `DEPLOY.md`)

### 3. Docker / Nginx / TLS

- [ ] Docker установлен из официального репозитория (`download.docker.com`)
- [ ] Запущены только нужные контейнеры (`babyfae-bot`, `babyfae-frontend`)
- [ ] Порт 8080 проброшен только на `127.0.0.1` (см. `docker-compose.yml`)
- [ ] Системный Nginx настроен как reverse-proxy к `127.0.0.1:8080`
- [ ] Получен и автоматически продлевается SSL-сертификат (Certbot)
- [ ] В Nginx выставлен `client_max_body_size` ≥ 20M и включён HTTPS

### 4. Backend безопасности

- [ ] Для всех `/api/...` маршрутов включён `authenticateTelegramUser`
- [ ] Везде, где используется `/api/user/:id/...`, подключён `verifyUserAccess`
- [ ] `WEBAPP_URL` задан в проде, origin-проверка в `auth.ts` включена
- [ ] Лимиты запросов (`rateLimit`) активны для общих и чувствительных операций
- [ ] Размер JSON‑тела ограничен (`express.json({ limit: '1mb' })`)

### 5. База данных и бэкапы

- [ ] SQLite-файл хранится в примонтированной папке `./data`
- [ ] Включены регулярные бэкапы через `sqlite3 .backup` (cron-скрипт из `DEPLOY.md`)
- [ ] Проверена процедура восстановления из бэкапа (Restore в `DEPLOY.md`)
- [ ] При миграции на новый сервер использована инструкция Migration в `DEPLOY.md`

### 6. Логи и обновления

- [ ] Включён ротационный драйвер логов Docker (`max-size`, `max-file`)
- [ ] Логи ошибок/аудита просматриваются регулярно
- [ ] `npm audit` выполнен, критичные уязвимости исправлены
- [ ] Образа Docker пересобираются регулярно (получение security‑апдейтов)

## Updates & Patches

- **Dependencies**: Update regularly using `npm audit` and `npm update`
- **Security patches**: Apply immediately when available
- **Node.js**: Keep Node.js version updated to latest LTS
- **Docker images**: Rebuild images monthly to include security patches

## Compliance

### GDPR Considerations

- Users can export their data (implemented)
- Users can delete all their data (implemented)
- Data is stored securely with access controls
- Consider adding Privacy Policy and Terms of Service

### Data Retention

- User data is retained indefinitely unless user requests deletion
- Deleted data is permanently removed from database
- Consider implementing automatic data retention policies

## Contact

For security concerns, please contact: [Add your security contact email]

## Version History

- **v3.0.0** (2025-11-24): Initial security implementation
  - Added Telegram authentication
  - Implemented input validation
  - Added rate limiting
  - Improved database security
