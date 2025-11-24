# Upgrade Guide: Security Improvements

## Overview

This update includes critical security improvements for the Babyfae application. All users should upgrade immediately.

## What's New

### 🔒 Security Enhancements

1. **Telegram Authentication**: All API requests now require valid Telegram initData
2. **Input Validation**: Comprehensive validation of all user inputs
3. **Rate Limiting**: Protection against abuse and DoS attacks
4. **Improved Database Security**: Better transaction handling and SQL injection prevention
5. **Security Headers**: CSP, frame protection, and other security headers
6. **Audit Logging**: Critical operations are now logged

### 🐛 Bug Fixes

1. **Race Condition**: Fixed mutex implementation for database transactions
2. **Performance**: Optimized database queries with parallel execution
3. **Database Configuration**: Improved SQLite settings for better performance

## Breaking Changes

### API Changes

**All API endpoints now require authentication**. The frontend automatically handles this, but if you have custom integrations, you need to:

1. Include `X-Telegram-Init-Data` header with valid Telegram initData
2. Ensure the authenticated user matches the requested user ID

### Example (Frontend)

```typescript
// Old way (no longer works)
fetch('/api/user/12345')

// New way (handled automatically by new API client)
import { apiGet } from '@/lib/api/client';
apiGet('/api/user/12345')
```

## Upgrade Steps

### For Development

1. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

2. **Install dependencies**:
   ```bash
   npm run install:all
   ```

3. **Rebuild**:
   ```bash
   cd bot && npm run build
   cd ../frontend && npm run build
   ```

4. **Restart development servers**:
   ```bash
   npm run dev
   ```

### For Production (Docker)

1. **Backup your data** (IMPORTANT!):
   ```bash
   # Backup database
   docker cp babyfae-bot:/app/data/babyfae.db ./backup_$(date +%Y%m%d).db
   
   # Or use the automated backup script
   ./scripts/backup.sh
   ```

2. **Pull latest changes**:
   ```bash
   cd /path/to/babyfae
   git pull origin main
   ```

3. **Rebuild and restart containers**:
   ```bash
   sudo docker compose down
   sudo docker compose up -d --build
   ```

4. **Verify deployment**:
   ```bash
   # Check health endpoint
   curl http://localhost:8080/health
   
   # Check logs
   sudo docker compose logs -f
   ```

### For Production (Manual)

1. **Backup your data**:
   ```bash
   cp bot/babyfae.db bot/babyfae.db.backup.$(date +%Y%m%d)
   ```

2. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

3. **Install dependencies**:
   ```bash
   cd bot && npm install && npm run build
   cd ../frontend && npm install && npm run build
   ```

4. **Restart services**:
   ```bash
   # Using PM2
   pm2 restart babyfae-bot
   
   # Or using systemd
   sudo systemctl restart babyfae-bot
   ```

## Post-Upgrade Verification

### 1. Check Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123.45,
  "database": "connected",
  "timestamp": "2025-11-24T12:00:00.000Z"
}
```

### 2. Test Authentication

Open the Telegram Mini App and verify:
- [ ] You can view your data
- [ ] You can add new activities
- [ ] You can edit existing activities
- [ ] You can delete activities
- [ ] Settings are saved correctly

### 3. Check Logs

```bash
# Docker
sudo docker compose logs bot | tail -50

# Manual
tail -f /var/log/babyfae/bot.log
```

Look for:
- ✅ "Server running on port 3000"
- ✅ "Connected to the SQLite database"
- ✅ "WAL mode enabled"
- ✅ "All database tables and indexes initialized"
- ❌ No authentication errors
- ❌ No database errors

## Troubleshooting

### Issue: "Unauthorized: Missing Telegram authentication data"

**Cause**: Frontend is not sending initData header

**Solution**:
1. Clear browser cache
2. Restart the Mini App
3. Verify WEBAPP_URL is correctly set in .env
4. Check that you're accessing via Telegram (not direct browser)

### Issue: "Forbidden: Access denied"

**Cause**: User ID mismatch between authenticated user and requested resource

**Solution**:
1. This is expected behavior - users can only access their own data
2. If you're the correct user, try logging out and back in
3. Clear app data and restart

### Issue: Database errors after upgrade

**Cause**: Database schema changes or corruption

**Solution**:
1. Restore from backup:
   ```bash
   cp bot/babyfae.db.backup.YYYYMMDD bot/babyfae.db
   ```
2. Restart the application
3. If issues persist, check database integrity:
   ```bash
   sqlite3 bot/babyfae.db "PRAGMA integrity_check;"
   ```

### Issue: High CPU usage

**Cause**: Database reindexing after upgrade

**Solution**:
- This is normal for the first few minutes after upgrade
- New indexes are being created
- CPU usage should normalize within 5-10 minutes

## Rollback Procedure

If you encounter critical issues:

1. **Stop the application**:
   ```bash
   # Docker
   sudo docker compose down
   
   # Manual
   pm2 stop babyfae-bot
   ```

2. **Restore previous version**:
   ```bash
   git checkout <previous-commit-hash>
   ```

3. **Restore database backup**:
   ```bash
   cp bot/babyfae.db.backup.YYYYMMDD bot/babyfae.db
   ```

4. **Rebuild and restart**:
   ```bash
   # Docker
   sudo docker compose up -d --build
   
   # Manual
   cd bot && npm run build && pm2 restart babyfae-bot
   ```

## Security Audit

After upgrading, run a security audit:

```bash
cd bot
npm audit

cd ../frontend
npm audit
```

Fix any vulnerabilities:
```bash
npm audit fix
```

## Performance Tuning

### For High-Traffic Deployments

If you have >1000 active users, consider:

1. **Increase rate limits** in `bot/src/index.ts`:
   ```typescript
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 200, // Increase from 100
   });
   ```

2. **Optimize database**:
   ```bash
   sqlite3 bot/babyfae.db "VACUUM;"
   sqlite3 bot/babyfae.db "ANALYZE;"
   ```

3. **Monitor performance**:
   - Set up Prometheus/Grafana
   - Monitor response times
   - Track error rates

## Support

If you encounter issues during upgrade:

1. Check the [SECURITY.md](./SECURITY.md) document
2. Review logs for error messages
3. Open an issue on GitHub with:
   - Error messages
   - Steps to reproduce
   - Environment details (OS, Node version, Docker version)

## Next Steps

After successful upgrade:

1. ✅ Review [SECURITY.md](./SECURITY.md) for security best practices
2. ✅ Set up automated backups
3. ✅ Configure monitoring and alerts
4. ✅ Update your deployment documentation
5. ✅ Test all features thoroughly

## Changelog

### v3.0.0 (2025-11-24)

**Security**:
- Added Telegram WebApp authentication
- Implemented comprehensive input validation
- Added rate limiting for all API endpoints
- Improved SQL injection prevention
- Added security headers (CSP, frame protection)
- Fixed race condition in database transactions

**Performance**:
- Optimized database queries with parallel execution
- Added composite indexes for common queries
- Improved SQLite configuration

**Bug Fixes**:
- Fixed mutex implementation
- Improved error handling
- Added audit logging for critical operations

**Breaking Changes**:
- All API endpoints now require authentication
- Frontend must send X-Telegram-Init-Data header
