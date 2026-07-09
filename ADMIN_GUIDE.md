# Administrator Guide — Enterprise Cloud File Storage System

## Table of Contents

1. [Admin Access](#1-admin-access)
2. [Admin Panel Overview](#2-admin-panel-overview)
3. [User Management](#3-user-management)
4. [Storage & Quotas](#4-storage--quotas)
5. [System Configuration](#5-system-configuration)
6. [Audit Logs](#6-audit-logs)
7. [Health Monitoring](#7-health-monitoring)
8. [Analytics Dashboard](#8-analytics-dashboard)
9. [Duplicate Detection](#9-duplicate-detection)
10. [Security Management](#10-security-management)
11. [Maintenance Tasks](#11-maintenance-tasks)

---

## 1. Admin Access

### Admin Role Assignment

Admin accounts must be assigned the `ROLE_ADMIN` role directly in the database:

```sql
UPDATE users SET role = 'ROLE_ADMIN' WHERE email = 'admin@yourdomain.com';
```

Or via the Admin Panel if you already have an admin account:
1. Go to **Admin** → **User Management**.
2. Find the user and click **Edit**.
3. Change their role to **Admin**.
4. Click **Save**.

### Accessing the Admin Panel

The Admin Panel is available from the sidebar navigation for users with the Admin role. Non-admin users cannot see or access this section.

---

## 2. Admin Panel Overview

The Admin Panel has the following sections:

| Section | URL | Description |
|---|---|---|
| **Dashboard** | `/admin` | System health overview, key metrics |
| **Users** | `/admin/users` | User list, search, role management |
| **Storage** | `/admin/storage` | Disk usage, quota management |
| **Audit Logs** | `/admin/audit` | Full audit trail of all operations |
| **System Config** | `/admin/config` | Upload limits, system settings |
| **Analytics** | `/analytics` | Storage and usage reporting |

---

## 3. User Management

### Viewing Users

Navigate to **Admin → Users** to see a paginated list of all registered users with:
- Name and email
- Role (USER, ADMIN)
- Account status (Active, Disabled)
- Registration date
- Storage used

### Searching Users

Use the search box at the top of the Users list to filter by name or email in real time.

### Editing a User

1. Click **Edit** (pencil icon) next to any user.
2. Modify their **role** and/or **account status**.
3. Click **Save Changes**.

### Disabling a User Account

Disabling a user account prevents them from logging in without deleting their files:

1. Go to **Admin → Users**.
2. Click **Edit** on the target user.
3. Set status to **Disabled**.
4. Click **Save**.

The user will receive a `401 Unauthorized` on their next API request and be logged out automatically.

### Deleting a User

1. Click **Delete** (trash icon) next to a user.
2. Confirm the deletion dialog.
3. The user account is removed. Their files remain in storage (orphaned, accessible by admins).

> ⚠️ **Caution**: User deletion is irreversible. Consider disabling instead.

---

## 4. Storage & Quotas

### Viewing Storage Usage

Navigate to **Analytics** or **Admin → Storage** to see:
- Total disk used across all users
- Per-user storage breakdown
- Storage usage trend over time
- File type distribution chart

### Setting User Quotas

The system allows configuring maximum storage per user via `SystemConfig`. Update via **Admin → System Config** or directly via the API:

```http
PUT /api/admin/system-config
Content-Type: application/json
Authorization: Bearer {admin-jwt}

{
  "maxUploadSizeMb": 5120,
  "defaultUserQuotaGb": 50,
  "trashRetentionDays": 30
}
```

### Storage Cleanup

To reclaim disk space:
1. Go to **Trash** and permanently delete old items.
2. Check **Analytics → Duplicate Files** to identify and remove duplicates.
3. MinIO itself handles deduplication at the object level if versioning is disabled.

---

## 5. System Configuration

Navigate to **Admin → System Config** to view and modify:

| Setting | Default | Description |
|---|---|---|
| `maxUploadSizeMb` | 5120 (5 GB) | Maximum file size for a single upload |
| `defaultUserQuotaGb` | 50 | Default storage quota per user (GB) |
| `trashRetentionDays` | 30 | Days before trash items are auto-purged |
| `sessionTimeoutMinutes` | 1440 (24h) | JWT token expiry |
| `ocrEnabled` | true | Enable/disable OCR indexing on upload |

Changes take effect immediately. No restart required.

---

## 6. Audit Logs

### Overview

Every file operation is logged with full context:
- **Who**: User who performed the action
- **What**: Event type (UPLOAD, DOWNLOAD, DELETE, SHARE, MOVE, RENAME, etc.)
- **When**: Timestamp with millisecond precision
- **Where**: Workspace and file/folder affected
- **Details**: Additional context (IP address, share link ID, etc.)

### Accessing Audit Logs

Navigate to **Admin → Audit Logs**.

### Filtering Logs

| Filter | Options |
|---|---|
| **Date Range** | From / To date pickers |
| **User** | Select a specific user or all users |
| **Event Type** | UPLOAD, DOWNLOAD, DELETE, SHARE, MOVE, RENAME, RESTORE, LOGIN, etc. |
| **Workspace** | Filter by workspace |

### Exporting Audit Logs

Click **Export to CSV** to download a filtered audit log for compliance reporting.

### REST API Access

```http
GET /api/audit/events?page=0&size=50&eventType=UPLOAD&userId=42&startDate=2024-01-01
Authorization: Bearer {admin-jwt}
```

---

## 7. Health Monitoring

### Spring Boot Actuator Endpoints

| Endpoint | Description |
|---|---|
| `GET /actuator/health` | Overall system health (DB, Redis, disk) |
| `GET /actuator/metrics` | JVM, memory, HTTP request metrics |
| `GET /actuator/info` | Application version and build info |
| `GET /actuator/prometheus` | Prometheus metrics scrape endpoint |

### Custom Health Endpoint

```http
GET /api/health
```

Returns:
```json
{
  "status": "UP",
  "database": "UP",
  "redis": "UP",
  "storage": "UP",
  "uptime": "2d 4h 32m"
}
```

### Docker Service Health

```bash
docker compose ps
```

Services will show `healthy` or `unhealthy` in the status column.

---

## 8. Analytics Dashboard

Navigate to **Analytics** in the sidebar to access the full analytics dashboard.

### Storage Overview

- **Total Storage Used**: Across all workspaces and users
- **Storage Trend**: Daily/weekly growth chart
- **File Type Distribution**: Doughnut chart (Documents, Images, Video, Audio, Archives)
- **Top Users by Storage**: Ranked list

### Usage Analytics

- **Upload Activity**: Number of uploads per day over the last 30 days
- **Download Activity**: File access patterns
- **Search Activity**: Most common search terms

### REST API Access (for custom reporting)

```http
GET /api/storage/analytics
Authorization: Bearer {admin-jwt}
```

Returns aggregated storage analytics for all workspaces.

---

## 9. Duplicate Detection

The system automatically detects duplicate files using **SHA-256 content hashing**.

### How it Works

1. When a file is uploaded, its SHA-256 hash is computed.
2. The hash is checked against all existing files in the same workspace.
3. If a duplicate is detected, the uploader is notified.
4. Optionally, the system can deduplicate at the storage level by pointing duplicate entries to the same MinIO object.

### Finding Duplicates

```http
GET /api/duplicates
Authorization: Bearer {token}
```

Returns groups of files that have identical content.

### Admin View

Navigate to **Admin → Storage → Duplicate Files** to see a table of duplicate file groups across all users. Select duplicates to merge or delete.

---

## 10. Security Management

### JWT Secret Rotation

To rotate the JWT signing secret without invalidating all user sessions immediately:

1. Update `JWT_SECRET` in your `.env`.
2. Restart the backend: `docker compose restart backend`.
3. All existing tokens will be invalidated. Users must log in again.

For zero-downtime rotation (requires configuration changes — consult the ARCHITECTURE.md).

### Failed Login Monitoring

Monitor failed login attempts via audit logs:

```http
GET /api/audit/events?eventType=LOGIN_FAILED
Authorization: Bearer {admin-jwt}
```

Set up rate limiting in Nginx (already pre-configured in `nginx.conf` for `/api/auth/login`).

### Share Link Revocation

Admins can revoke any share link:

1. Navigate to the file.
2. Open **Share** → **Manage Links**.
3. Click **Revoke All** to immediately invalidate all links for this file.

Or via API:
```http
DELETE /api/sharing/admin/{shareId}
Authorization: Bearer {admin-jwt}
```

### Role-Based Access Control Summary

| Operation | USER | ADMIN |
|---|---|---|
| Upload files | ✅ | ✅ |
| Download own files | ✅ | ✅ |
| Share files | ✅ | ✅ |
| Create workspaces | ✅ | ✅ |
| View audit logs | ❌ | ✅ |
| Manage all users | ❌ | ✅ |
| Change system config | ❌ | ✅ |
| View all workspaces | ❌ | ✅ |
| Delete any file | ❌ | ✅ |
| Export reports | ❌ | ✅ |

---

## 11. Maintenance Tasks

### Manual Trash Purge

To purge all items in trash older than 30 days immediately:

```bash
# Trigger the scheduled job manually (if scheduler API exposed)
curl -X POST http://localhost:8080/api/admin/maintenance/purge-trash \
  -H "Authorization: Bearer {admin-jwt}"
```

Or connect to the MySQL database:

```sql
-- Preview what will be deleted
SELECT * FROM file_metadata WHERE is_deleted = 1 AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Permanent delete
DELETE FROM file_metadata WHERE is_deleted = 1 AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Reindex OCR Content

If OCR indexes are out of date:

```bash
# Via API (if OCR re-index endpoint exists)
curl -X POST http://localhost:8080/api/admin/maintenance/reindex-ocr \
  -H "Authorization: Bearer {admin-jwt}"
```

### Database Maintenance

```sql
-- Analyze slow queries
SHOW PROCESSLIST;

-- Optimize tables after large deletes
OPTIMIZE TABLE file_metadata;
OPTIMIZE TABLE audit_events;

-- Check index usage
SHOW INDEX FROM file_metadata;
```

### Log Rotation

Application logs (if mounted via Docker volume) can be rotated with:

```bash
# logrotate config for /var/log/cloudstorage/app.log
/var/log/cloudstorage/*.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
}
```

### Backup Before Upgrades

Always backup before upgrading:

```bash
# Database backup
docker compose exec db mysqldump -u root -p${MYSQL_ROOT_PASSWORD} cloud_storage > pre_upgrade_backup.sql

# MinIO backup (mirror bucket to local)
docker compose exec minio mc mirror local/cloud-files /backups/minio-pre-upgrade
```
