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

- [ ] TELEGRAM_BOT_TOKEN is set and kept secret
- [ ] WEBAPP_URL is configured with HTTPS
- [ ] NODE_ENV is set to 'production'
- [ ] Firewall is configured (UFW or iptables)
- [ ] fail2ban is installed and configured
- [ ] SSL certificate is valid and auto-renewing
- [ ] Database backups are automated
- [ ] Logs are being monitored
- [ ] Rate limiting is enabled
- [ ] All dependencies are up to date
- [ ] Docker containers are running as non-root
- [ ] Swap is configured (for low-memory VPS)

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
