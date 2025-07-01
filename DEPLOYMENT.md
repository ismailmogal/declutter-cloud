# Declutter Cloud: Production Deployment Guide

## Overview
This guide covers the production deployment of Declutter Cloud, including all security hardening, performance optimizations, and operational considerations.

## Security Features Implemented

### 1. Authentication & Authorization
- **JWT-based authentication** with configurable expiry
- **Rate limiting** on sensitive endpoints:
  - Authentication: 5/minute (production), 10/minute (staging)
  - File deletion: 20/minute (production), 30/minute (staging)
- **Input validation** using Pydantic models
- **Input sanitization** middleware for XSS prevention

### 2. API Security
- **CORS protection** with environment-specific origins
- **Secure HTTP headers** via custom middleware
- **Error handling** that doesn't leak sensitive information
- **Request/response compression** for performance

### 3. Database Security
- **Connection pooling** with environment-specific settings
- **Connection validation** with `pool_pre_ping`
- **Connection recycling** every hour
- **SQL injection protection** via SQLAlchemy ORM

## Environment Configuration

### Environment Variables
```bash
# Required
SECRET_KEY=your-secure-secret-key
DATABASE_URL=postgresql://user:pass@host:port/db
ENVIRONMENT=production

# Optional
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=10080
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
MAX_FILE_SIZE=100
ALLOWED_FILE_TYPES=image/*,application/pdf,text/*
```

### Environment-Specific Settings
- **Development**: Debug enabled, relaxed rate limits, local CORS
- **Staging**: Debug disabled, moderate rate limits, staging CORS
- **Production**: Debug disabled, strict rate limits, production CORS

## Health Checks & Monitoring

### Endpoints
- `GET /health` - Application health check
- `GET /ready` - Database connectivity check

### Security Logging
The application logs:
- Authentication attempts (successful and failed)
- File deletion operations
- Database errors
- Rate limit violations
- Security-relevant HTTP errors

## Database Configuration

### Connection Pool Settings
- **Production**: 20 connections, 30 overflow, 30s timeout
- **Staging**: 10 connections, 20 overflow, 30s timeout
- **Development**: 5 connections, 10 overflow, 30s timeout

### Backup Strategy
Use the provided backup script:
```bash
cd backend/scripts
bash backup_db.sh
```

Schedule regular backups with cron:
```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/declutter-cloud/backend/scripts && bash backup_db.sh
```

## Performance Optimizations

### 1. Database
- Connection pooling with pre-ping validation
- Connection recycling to prevent stale connections
- Optimized pool sizes per environment

### 2. API
- Gzip compression for responses > 1KB
- Input sanitization to prevent processing overhead
- Rate limiting to prevent abuse

### 3. Security
- Efficient JWT validation
- Minimal overhead security middleware
- Optimized error handling

## Deployment Checklist

### Pre-Deployment
- [ ] Set `ENVIRONMENT=production` in environment variables
- [ ] Configure production `DATABASE_URL`
- [ ] Set secure `SECRET_KEY`
- [ ] Update CORS origins for production domain
- [ ] Configure production rate limits
- [ ] Set up database backups

### Deployment
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Run database migrations: `alembic upgrade head`
- [ ] Test health endpoints: `/health` and `/ready`
- [ ] Verify security headers are present
- [ ] Test rate limiting on sensitive endpoints

### Post-Deployment
- [ ] Monitor application logs for errors
- [ ] Verify database connection pool is working
- [ ] Test backup script functionality
- [ ] Monitor rate limiting effectiveness
- [ ] Verify CORS is working correctly

## Security Monitoring

### Log Analysis
Monitor these log patterns:
- Failed authentication attempts
- Rate limit violations
- Database connection errors
- Unexpected exceptions

### Alerts
Set up alerts for:
- High error rates (>5% of requests)
- Database connection pool exhaustion
- Rate limit violations
- Failed health checks

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` format
   - Verify database is accessible
   - Check connection pool settings

2. **Rate Limiting Issues**
   - Verify client IP detection
   - Check rate limit configuration
   - Monitor for legitimate traffic being blocked

3. **CORS Errors**
   - Verify frontend domain is in `CORS_ORIGINS`
   - Check for protocol mismatches (http vs https)

4. **Performance Issues**
   - Monitor database connection pool usage
   - Check for slow queries
   - Verify compression is working

### Debug Mode
For troubleshooting, temporarily enable debug mode:
```bash
export ENVIRONMENT=development
export DEBUG=true
```

## Maintenance

### Regular Tasks
- Monitor and rotate logs
- Review security logs for suspicious activity
- Update dependencies for security patches
- Test backup and restore procedures
- Review rate limiting effectiveness

### Updates
- Test all changes in staging environment
- Use blue-green deployment for zero downtime
- Monitor health endpoints during updates
- Have rollback plan ready

## Support

For issues or questions:
- Check application logs first
- Verify environment configuration
- Test with health endpoints
- Review this deployment guide

---

**Last Updated**: January 2025
**Version**: 1.0.0 