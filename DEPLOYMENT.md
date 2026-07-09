# Deployment Guide — Enterprise Cloud File Storage System

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Configuration](#2-environment-configuration)
3. [Docker Compose Deployment](#3-docker-compose-deployment)
4. [SSL / TLS Setup](#4-ssl--tls-setup)
5. [Nginx Production Hardening](#5-nginx-production-hardening)
6. [Backend Production Configuration](#6-backend-production-configuration)
7. [MinIO Production Setup](#7-minio-production-setup)
8. [Database Backup & Restore](#8-database-backup--restore)
9. [Scaling Horizontally](#9-scaling-horizontally)
10. [Monitoring & Health Checks](#10-monitoring--health-checks)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

| Tool | Minimum Version | Purpose |
|---|---|---|
| Docker Engine | 24.0+ | Container runtime |
| Docker Compose | 2.20+ (V2) | Multi-container orchestration |
| 4 GB RAM | Recommended 8 GB+ | MinIO + JVM + MySQL footprint |
| 40 GB Disk | Recommended 200 GB+ SSD | Object storage + database |
| Domain Name | Required for HTTPS | SSL certificate provisioning |

---

## 2. Environment Configuration

### Step 1: Copy the environment template

```bash
cp .env.example .env
```

### Step 2: Edit `.env` with real secrets

| Variable | Description | Example |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | MySQL root password | `Str0ng!Pass#2024` |
| `JWT_SECRET` | HS512 JWT signing key (min 64 bytes) | `openssl rand -base64 64` |
| `MINIO_ACCESS_KEY` | MinIO access key ID | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key (min 8 chars) | `Secret!Key123` |
| `SPRING_PROFILES_ACTIVE` | Spring profile | `prod` |
| `VITE_API_URL` | Backend API URL (not used in Docker — Nginx proxies) | `https://api.yourdomain.com` |

> **Security Note**: Never commit `.env` to version control. Add it to `.gitignore`.

### Generate a Secure JWT Secret

```bash
# Linux/macOS
openssl rand -base64 64

# Windows PowerShell
[Convert]::ToBase64String((1..64 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

---

## 3. Docker Compose Deployment

### Build and Start (Production)

```bash
# Build all images and start detached
docker compose up --build -d

# Follow logs from all services
docker compose logs -f

# Check service status
docker compose ps
```

### Zero-Downtime Update (Rolling Deploy)

```bash
# Rebuild only the changed service
docker compose up --build -d backend
docker compose up --build -d frontend
```

### Stop All Services

```bash
docker compose down
```

### Full Reset (⚠️ Destroys All Data)

```bash
docker compose down -v --remove-orphans
```

---

## 4. SSL / TLS Setup

### Option A: Certbot + Let's Encrypt (Recommended for Production)

```bash
# Install Certbot
sudo apt install certbot

# Issue certificate
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos --non-interactive

# Certificates are stored at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### Option B: Mount Certificates in Docker Compose

In `docker-compose.yml` under the `frontend` service, mount certs:

```yaml
volumes:
  - /etc/letsencrypt/live/yourdomain.com:/etc/ssl/certs/yourdomain:ro
```

Then update `nginx.conf` to add an HTTPS server block:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate     /etc/ssl/certs/yourdomain/fullchain.pem;
    ssl_certificate_key /etc/ssl/certs/yourdomain/privkey.pem;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # ... rest of your location blocks
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

### Auto-renew with Cron

```bash
# Add to root crontab
0 2 * * 1 certbot renew --quiet && docker compose restart frontend
```

---

## 5. Nginx Production Hardening

The project's `frontend/nginx.conf` already includes:

- ✅ Gzip compression for all text-based assets
- ✅ Long-term cache headers for hashed `/assets/*` files (`max-age=31536000, immutable`)
- ✅ No-cache headers for `index.html` and service worker
- ✅ Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`
- ✅ API proxy to `backend:8080` with 10 GB upload support and 600s timeouts
- ✅ WebSocket proxy with `Upgrade` header handling for `/ws/`
- ✅ SPA fallback: all non-asset routes serve `index.html`

**Additional production steps:**

1. Enable HSTS after SSL is confirmed stable:
   ```nginx
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
   ```

2. Enable Content Security Policy (customize `connect-src` for your domain):
   ```nginx
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; connect-src 'self' https://api.yourdomain.com wss://yourdomain.com;" always;
   ```

---

## 6. Backend Production Configuration

Update `backend/src/main/resources/application-prod.properties`:

```properties
# Server
server.port=8080

# Database — use environment variables, not hardcoded values
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}

# JPA — never use create/create-drop in prod
spring.jpa.hibernate.ddl-auto=validate

# Connection pool
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000

# Security — JWT
jwt.secret=${JWT_SECRET}
jwt.expiration=86400000

# MinIO
minio.endpoint=${MINIO_ENDPOINT}
minio.access-key=${MINIO_ACCESS_KEY}
minio.secret-key=${MINIO_SECRET_KEY}
minio.bucket=${MINIO_BUCKET}

# Logging
logging.level.root=WARN
logging.level.com.cloudstorage=INFO
logging.file.name=/var/log/cloudstorage/app.log

# Actuator (restrict in production)
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=when-authorized
```

---

## 7. MinIO Production Setup

### Create Production Buckets

After the stack starts, create and configure the storage bucket:

```bash
# Enter the MinIO container
docker compose exec minio mc alias set local http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

# Create the bucket
docker compose exec minio mc mb local/cloud-files

# Enable versioning (optional — for file version history)
docker compose exec minio mc version enable local/cloud-files

# Set lifecycle policy for deleted files (purge after 30 days)
docker compose exec minio mc ilm add --expiry-days 30 local/cloud-files
```

### MinIO Web Console

Access at `http://your-server:9001` with your `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`.

---

## 8. Database Backup & Restore

### Backup

```bash
# Export all tables
docker compose exec db mysqldump -u root -p${MYSQL_ROOT_PASSWORD} cloud_storage \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore

```bash
# Restore from dump
docker compose exec -T db mysql -u root -p${MYSQL_ROOT_PASSWORD} cloud_storage \
  < backup_20240101_120000.sql
```

### Automated Daily Backup (Cron)

```bash
0 3 * * * cd /path/to/project && docker compose exec -T db mysqldump -u root -p$MYSQL_ROOT_PASSWORD cloud_storage | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

---

## 9. Scaling Horizontally

The backend is designed to be **stateless** — JWT auth, shared Redis session cache, and shared MinIO storage allow running multiple backend instances behind a load balancer.

```yaml
# docker-compose.yml example for backend scaling
backend:
  image: cloud-file-storage-backend
  deploy:
    replicas: 3
  depends_on:
    - db
    - redis
    - minio
```

Use Nginx upstream load balancing or a reverse proxy like Traefik / HAProxy in front of the backend replicas.

---

## 10. Monitoring & Health Checks

### Built-in Health Endpoint

```bash
curl http://localhost:8080/actuator/health
```

Expected response:
```json
{
  "status": "UP",
  "components": {
    "db": { "status": "UP" },
    "redis": { "status": "UP" },
    "diskSpace": { "status": "UP" }
  }
}
```

### Prometheus Metrics

The backend exposes Prometheus metrics at `/actuator/prometheus`.

Add to your `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'cloud-storage'
    static_configs:
      - targets: ['backend:8080']
    metrics_path: '/actuator/prometheus'
```

### Docker Compose Health Checks

All critical services define health checks. Monitor with:

```bash
docker compose ps
# STATUS column shows "healthy" / "unhealthy"
```

---

## 11. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Connection refused` on port 8080 | Backend still starting | Wait 60s for JVM startup |
| `403 Forbidden` on file upload | MinIO bucket doesn't exist | Run MinIO bucket setup steps |
| `401 Unauthorized` on all requests | JWT secret mismatch after redeploy | Log out and log back in (token re-issued) |
| Slow uploads | Missing `client_max_body_size` in Nginx | Already set to 10g in `nginx.conf` |
| WebSocket disconnects | `proxy_read_timeout` too low | Already set to 3600s in `nginx.conf` |
| `Out of memory` on Java heap | Default heap too small | Add `JAVA_OPTS=-Xmx2g` to backend env |
| MinIO `S3 Error` | Bucket name mismatch | Match `MINIO_BUCKET` in `.env` to your bucket name |

### View Service Logs

```bash
docker compose logs backend --tail=100 -f
docker compose logs frontend --tail=50
docker compose logs db --tail=50
```

### Force Restart a Service

```bash
docker compose restart backend
```
