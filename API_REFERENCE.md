# API Reference — Enterprise Cloud File Storage System

> **Base URL**: `http://localhost:8080/api`  
> **Authentication**: All protected endpoints require `Authorization: Bearer {jwt_token}` header.  
> **Content-Type**: `application/json` unless specified as `multipart/form-data`.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User Management](#2-user-management)
3. [File Storage](#3-file-storage)
4. [Folder Management](#4-folder-management)
5. [Search & OCR](#5-search--ocr)
6. [Version History](#6-version-history)
7. [File Sharing](#7-file-sharing)
8. [Workspaces](#8-workspaces)
9. [Workspace Members](#9-workspace-members)
10. [Comments](#10-comments)
11. [Favorites](#11-favorites)
12. [Recent Files](#12-recent-files)
13. [Trash](#13-trash)
14. [Notifications](#14-notifications)
15. [Activity Timeline](#15-activity-timeline)
16. [Storage Analytics](#16-storage-analytics)
17. [Admin — User Management](#17-admin--user-management)
18. [Admin — Audit Logs](#18-admin--audit-logs)
19. [Admin — System Config](#19-admin--system-config)
20. [Health & Monitoring](#20-health--monitoring)

---

## 1. Authentication

### POST /api/auth/register

Register a new user account.

**Request:**
```json
{
  "username": "john.doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response: 201 Created**
```json
{
  "id": 42,
  "username": "john.doe",
  "email": "john@example.com",
  "role": "ROLE_USER",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### POST /api/auth/login

Authenticate and receive a JWT token.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response: 200 OK**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "type": "Bearer",
  "id": 42,
  "username": "john.doe",
  "email": "john@example.com",
  "role": "ROLE_USER"
}
```

---

### POST /api/auth/forgot-password

Request a password reset link.

**Request:**
```json
{ "email": "john@example.com" }
```

**Response: 200 OK**
```json
{ "message": "Password reset email sent" }
```

---

### POST /api/auth/reset-password

Reset password using the token from the email.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass456!"
}
```

**Response: 200 OK**

---

## 2. User Management

### GET /api/users/me

Get the current authenticated user's profile.

**Response: 200 OK**
```json
{
  "id": 42,
  "username": "john.doe",
  "email": "john@example.com",
  "role": "ROLE_USER",
  "storageUsedBytes": 1073741824,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### PUT /api/users/me

Update the current user's profile.

**Request:**
```json
{
  "username": "john.updated"
}
```

---

### PUT /api/users/me/password

Change the current user's password.

**Request:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

---

## 3. File Storage

### POST /api/storage/upload

Upload a file. **Content-Type: multipart/form-data**

**Form Fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | ✅ | The file to upload |
| `folderId` | Long | ❌ | Destination folder ID |
| `workspaceId` | Long | ✅ | Target workspace ID |

**Response: 201 Created**
```json
{
  "id": 123,
  "fileName": "report.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 2048000,
  "workspaceId": 7,
  "folderId": 15,
  "storagePath": "workspaces/7/files/report.pdf",
  "sha256Hash": "e3b0c44298fc1c149afb...",
  "uploadedAt": "2024-01-15T10:35:00Z"
}
```

---

### GET /api/storage/files

List files in a workspace folder.

**Query Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `workspaceId` | Long | — | Required. Workspace ID |
| `folderId` | Long | null | Folder ID (null = root) |
| `page` | int | 0 | Page number (0-indexed) |
| `size` | int | 20 | Page size |
| `sort` | string | `createdAt,desc` | Sort field and direction |

---

### GET /api/storage/files/{fileId}

Get metadata for a specific file.

**Response: 200 OK** — Returns `FileMetadataDto`.

---

### GET /api/storage/download/{fileId}

Download a file. Returns the file as an octet-stream.

**Response: 200 OK** — `Content-Disposition: attachment; filename="report.pdf"`

---

### DELETE /api/storage/files/{fileId}

Move a file to trash (soft delete).

**Response: 204 No Content**

---

### PUT /api/storage/files/{fileId}/rename

Rename a file.

**Request:**
```json
{ "newName": "Q4-Report-2024.pdf" }
```

---

### POST /api/storage/files/{fileId}/move

Move a file to a different folder.

**Request:**
```json
{ "targetFolderId": 22 }
```

---

### POST /api/uploads/initiate

Initiate a resumable upload session.

**Request:**
```json
{
  "fileName": "large-video.mp4",
  "fileSize": 4294967296,
  "contentType": "video/mp4",
  "workspaceId": 7
}
```

**Response: 200 OK**
```json
{
  "sessionId": "sess_abc123",
  "uploadUrl": "/api/storage/upload"
}
```

---

## 4. Folder Management

### POST /api/folders

Create a new folder.

**Request:**
```json
{
  "name": "Q4 Reports",
  "parentId": null,
  "workspaceId": 7
}
```

**Response: 201 Created**
```json
{
  "id": 15,
  "name": "Q4 Reports",
  "path": "/Q4 Reports",
  "workspaceId": 7,
  "parentId": null,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### GET /api/folders/{folderId}

Get folder details and its children.

---

### PUT /api/folders/{folderId}

Rename or move a folder.

**Request:**
```json
{
  "name": "Q4 Reports - Final",
  "parentId": 20
}
```

---

### DELETE /api/folders/{folderId}

Delete a folder and all its contents (moves to trash).

---

## 5. Search & OCR

### GET /api/search

Full-text search across file names and OCR content.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `q` | string | Search query (required) |
| `workspaceId` | Long | Filter by workspace |
| `fileType` | string | Filter: `document`, `image`, `video`, `audio` |
| `page` | int | Page number |
| `size` | int | Page size (default 20) |

**Response: 200 OK**
```json
{
  "content": [
    {
      "id": 123,
      "fileName": "contract.pdf",
      "contentType": "application/pdf",
      "sizeBytes": 1024000,
      "highlight": "...payment terms <em>invoice</em> #12345...",
      "score": 0.95
    }
  ],
  "totalElements": 42,
  "totalPages": 3
}
```

---

### GET /api/ocr/{fileId}

Get the extracted OCR text for a file.

**Response: 200 OK**
```json
{
  "fileId": 123,
  "extractedText": "Invoice #12345\nDate: January 15, 2024\n...",
  "indexedAt": "2024-01-15T10:36:00Z"
}
```

---

## 6. Version History

### GET /api/versions/file/{fileId}

Get all versions of a file.

**Response: 200 OK**
```json
[
  {
    "id": 5,
    "fileId": 123,
    "versionNumber": 3,
    "sizeBytes": 2048000,
    "sha256Hash": "abc123...",
    "uploadedBy": "john.doe",
    "createdAt": "2024-01-20T09:00:00Z"
  }
]
```

---

### POST /api/versions/{versionId}/restore

Restore a specific file version as the current version.

**Response: 200 OK** — Returns updated `FileMetadataDto`.

---

### GET /api/versions/{versionId}/download

Download a specific version of a file.

---

## 7. File Sharing

### POST /api/sharing

Create a share link for a file.

**Request:**
```json
{
  "fileId": 123,
  "shareType": "PUBLIC",
  "permission": "DOWNLOAD",
  "expiresAt": "2024-02-15T23:59:59Z",
  "password": "optional-password"
}
```

**Response: 201 Created**
```json
{
  "id": "sh_xyz789",
  "token": "a1b2c3d4e5f6",
  "shareUrl": "https://yourdomain.com/shared/a1b2c3d4e5f6",
  "shareType": "PUBLIC",
  "permission": "DOWNLOAD",
  "expiresAt": "2024-02-15T23:59:59Z",
  "passwordProtected": true,
  "downloadCount": 0,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### GET /api/sharing/file/{fileId}

Get all share links for a file.

---

### DELETE /api/sharing/{shareId}

Revoke a share link.

---

### GET /api/sharing/access/{token}

Access a shared file by its token (public endpoint, no auth required).

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `password` | string | Required only if the link is password-protected |

---

## 8. Workspaces

### POST /api/workspaces

Create a new workspace.

**Request:**
```json
{
  "name": "Engineering Team",
  "description": "Shared workspace for the engineering department",
  "workspaceType": "TEAM"
}
```

**Response: 201 Created**

---

### GET /api/workspaces

List all workspaces the current user belongs to.

---

### GET /api/workspaces/{workspaceId}

Get workspace details.

---

### PUT /api/workspaces/{workspaceId}

Update workspace name or description. (Admin/Owner only)

---

### DELETE /api/workspaces/{workspaceId}

Delete a workspace. (Owner only)

---

## 9. Workspace Members

### POST /api/workspaces/{workspaceId}/members/invite

Invite a user to a workspace.

**Request:**
```json
{
  "email": "jane@example.com",
  "role": "EDITOR"
}
```

**Roles**: `VIEWER`, `EDITOR`, `ADMIN`

---

### GET /api/workspaces/{workspaceId}/members

List all members of a workspace.

---

### PUT /api/workspaces/{workspaceId}/members/{userId}

Update a member's role.

**Request:**
```json
{ "role": "ADMIN" }
```

---

### DELETE /api/workspaces/{workspaceId}/members/{userId}

Remove a member from the workspace.

---

### POST /api/invitations/accept

Accept a workspace invitation.

**Request:**
```json
{ "token": "invitation-token-from-email" }
```

---

## 10. Comments

### POST /api/comments

Add a comment to a file.

**Request:**
```json
{
  "fileId": 123,
  "content": "Please review the pricing section. @jane",
  "parentId": null
}
```

---

### GET /api/comments/file/{fileId}

Get all comments for a file.

---

### PUT /api/comments/{commentId}

Edit a comment.

**Request:**
```json
{ "content": "Updated comment text." }
```

---

### DELETE /api/comments/{commentId}

Delete a comment.

---

## 11. Favorites

### POST /api/favorites/{fileId}

Add a file to favorites.

**Response: 200 OK**

---

### DELETE /api/favorites/{fileId}

Remove a file from favorites.

---

### GET /api/favorites

Get all favorited files for the current user.

**Query Parameters:** `page`, `size`

---

### GET /api/favorites/{fileId}/status

Check if a file is favorited.

**Response:**
```json
{ "isFavorited": true }
```

---

## 12. Recent Files

### GET /api/recent

Get recently accessed files.

**Query Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 0 | Page number |
| `size` | int | 20 | Page size (max 50) |

---

## 13. Trash

### GET /api/trash

List all files in trash for the current user.

**Query Parameters:** `workspaceId`, `page`, `size`

---

### POST /api/trash/{fileId}/restore

Restore a file from trash.

**Response: 200 OK**

---

### DELETE /api/trash/{fileId}

Permanently delete a file from trash.

> ⚠️ Irreversible operation.

---

### DELETE /api/trash/empty

Permanently delete all items in trash for the current user.

---

## 14. Notifications

### GET /api/notifications

Get notifications for the current user.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `unreadOnly` | boolean | If true, return only unread notifications |
| `page` | int | Page number |
| `size` | int | Page size |

---

### PUT /api/notifications/{notificationId}/read

Mark a notification as read.

---

### PUT /api/notifications/read-all

Mark all notifications as read.

---

### GET /api/notifications/unread-count

Get the count of unread notifications.

**Response:**
```json
{ "count": 5 }
```

---

## 15. Activity Timeline

### GET /api/activity

Get activity timeline for a workspace.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `workspaceId` | Long | Required |
| `page` | int | Page number |
| `size` | int | Page size |

---

## 16. Storage Analytics

### GET /api/storage/analytics

Get storage usage analytics.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `workspaceId` | Long | Optional — filter by workspace |

**Response:**
```json
{
  "totalStorageUsedBytes": 53687091200,
  "fileCount": 1247,
  "fileTypeBreakdown": {
    "document": 340,
    "image": 587,
    "video": 120,
    "audio": 45,
    "archive": 95,
    "other": 60
  },
  "storageByWorkspace": [
    { "workspaceId": 1, "name": "Engineering", "usedBytes": 30000000000 }
  ]
}
```

---

## 17. Admin — User Management

> 🔒 Requires `ROLE_ADMIN`.

### GET /api/admin/users

List all users (paginated).

**Query Parameters:** `page`, `size`, `search` (name/email filter)

---

### PUT /api/admin/users/{userId}

Update user role or status.

**Request:**
```json
{
  "role": "ROLE_ADMIN",
  "enabled": true
}
```

---

### DELETE /api/admin/users/{userId}

Delete a user account.

---

### GET /api/admin/stats

Get system-wide statistics.

**Response:**
```json
{
  "totalUsers": 142,
  "activeUsers": 127,
  "totalFiles": 8923,
  "totalStorageBytes": 107374182400,
  "uploadsToday": 47,
  "downloadsToday": 203
}
```

---

## 18. Admin — Audit Logs

> 🔒 Requires `ROLE_ADMIN`.

### GET /api/audit/events

Retrieve audit events with filtering.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `eventType` | string | e.g., `UPLOAD`, `DELETE`, `LOGIN` |
| `userId` | Long | Filter by user |
| `workspaceId` | Long | Filter by workspace |
| `startDate` | ISO 8601 | From date |
| `endDate` | ISO 8601 | To date |
| `page` | int | Page number |
| `size` | int | Page size |

---

## 19. Admin — System Config

> 🔒 Requires `ROLE_ADMIN`.

### GET /api/admin/system-config

Get current system configuration.

---

### PUT /api/admin/system-config

Update system configuration.

**Request:**
```json
{
  "maxUploadSizeMb": 5120,
  "defaultUserQuotaGb": 50,
  "trashRetentionDays": 30,
  "ocrEnabled": true
}
```

---

## 20. Health & Monitoring

### GET /api/health

Application health check (no auth required).

**Response:**
```json
{
  "status": "UP",
  "database": "UP",
  "redis": "UP",
  "storage": "UP"
}
```

---

### GET /actuator/health

Detailed Spring Boot Actuator health. Auth required in production.

---

### GET /actuator/metrics

JVM, HTTP, and application metrics.

---

### GET /actuator/prometheus

Prometheus metrics scrape endpoint.

---

## WebSocket: Upload Progress

**Endpoint**: `ws://localhost:8080/ws/upload-progress?token={jwt}`

### Subscribe to upload progress

**Send:**
```json
{
  "action": "subscribe",
  "sessionId": "sess_abc123"
}
```

**Receive frames:**
```json
{
  "sessionId": "sess_abc123",
  "fileName": "large-video.mp4",
  "progress": 65,
  "uploadedBytes": 2684354560,
  "totalBytes": 4294967296,
  "speedBytesPerSecond": 20971520,
  "etaSeconds": 77,
  "status": "UPLOADING"
}
```

**Status values**: `PENDING`, `UPLOADING`, `COMPLETED`, `FAILED`, `CANCELLED`

---

## Error Responses

All error responses follow this format:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "File name cannot be empty",
  "path": "/api/storage/upload"
}
```

| HTTP Status | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `204` | No Content (successful delete) |
| `400` | Bad Request — validation error |
| `401` | Unauthorized — missing or invalid JWT |
| `403` | Forbidden — insufficient permissions |
| `404` | Not Found — resource doesn't exist |
| `409` | Conflict — duplicate resource |
| `413` | Payload Too Large — file exceeds size limit |
| `500` | Internal Server Error |
