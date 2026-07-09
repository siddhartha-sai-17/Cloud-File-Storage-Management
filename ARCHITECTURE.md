# System Architecture — Enterprise Cloud File Storage System

## Overview

The Cloud File Storage System is a full-stack enterprise platform built for secure, scalable, and collaborative file management. It combines a Spring Boot microservice backend with a React 19 progressive web app frontend, wired together through an Nginx reverse proxy and orchestrated with Docker Compose.

---

## System Topology

```mermaid
graph TD
    Browser[Web Browser / PWA Client]
    Nginx[Nginx Reverse Proxy :80/:443]
    React[React 19 SPA Frontend]
    Spring[Spring Boot 3 Backend :8080]
    MySQL[(MySQL 8.0 Database)]
    MinIO[(MinIO Object Storage S3-compatible)]
    Redis[(Redis Cache + Session Store)]
    RabbitMQ[(RabbitMQ Message Queue)]

    Browser -->|HTTPS| Nginx
    Nginx -->|/| React
    Nginx -->|/api/| Spring
    Nginx -->|/ws/| Spring
    Nginx -->|/actuator/| Spring
    Spring -->|JPA / HikariCP| MySQL
    Spring -->|S3 API| MinIO
    Spring -->|Jedis / Lettuce| Redis
    Spring -->|AMQP| RabbitMQ
```

---

## Frontend Architecture

```mermaid
graph TD
    main[main.tsx] --> EB[ErrorBoundary AppRoot]
    EB --> QCP[QueryClientProvider]
    QCP --> TP[ThemeProvider]
    TP --> AP[AuthProvider]
    AP --> WP[WorkspaceProvider]
    WP --> Router[React Router v7]
    Router --> AuthLayout[AuthLayout]
    Router --> MainLayout[MainLayout]
    MainLayout --> RP[RealtimeProvider]
    MainLayout --> Outlet[Feature Pages via Suspense]
    Outlet --> Dashboard[DashboardPage]
    Outlet --> Files[FilesPage]
    Outlet --> Search[SearchPage]
    Outlet --> Workspaces[WorkspacesPage]
    Outlet --> Favorites[FavoritesPage]
    Outlet --> Trash[TrashPage]
    Outlet --> Recent[RecentPage]
    Outlet --> Analytics[AnalyticsPage]
    Outlet --> Admin[AdminPage]
```

---

## Request Lifecycle

```mermaid
sequenceDiagram
    participant C as React Client
    participant N as Nginx Proxy
    participant S as Spring Boot
    participant SEC as Spring Security
    participant SVC as Service Layer
    participant DB as MySQL / MinIO

    C->>N: HTTPS Request + Bearer JWT
    N->>S: Proxy to :8080
    S->>SEC: JWT Filter intercepts
    SEC->>SEC: Validate signature + expiry
    SEC->>S: SecurityContext populated
    S->>SVC: Controller delegates business logic
    SVC->>DB: JPA query or MinIO S3 call
    DB-->>SVC: Entity / Blob response
    SVC-->>S: DTO mapped
    S-->>N: HTTP 200 + JSON
    N-->>C: Response forwarded
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend /api/auth

    U->>F: Enter credentials
    F->>B: POST /api/auth/login { username, password }
    B->>B: Validate credentials via UserDetailsService
    B-->>F: 200 OK { token: "eyJ..." }
    F->>F: Store JWT in localStorage
    F->>F: Decode claims (sub, exp, roles)
    F->>F: Navigate to /dashboard
    Note over F: All subsequent requests use Authorization: Bearer {token}
    F->>B: GET /api/workspaces (with JWT)
    B->>B: JwtAuthenticationFilter validates token
    B-->>F: 200 OK workspace list
```

---

## Upload Pipeline

```mermaid
sequenceDiagram
    participant C as Client
    participant B as Backend
    participant Q as RabbitMQ
    participant M as MinIO
    participant DB as MySQL

    C->>B: POST /api/uploads/initiate { filename, size }
    B-->>C: { sessionId, uploadUrl }
    C->>B: POST /api/storage/upload (multipart form-data)
    B->>B: SHA-256 integrity check
    B->>M: PutObject(bucket, key, stream)
    M-->>B: ETag
    B->>Q: Publish UploadCompleteEvent
    B->>DB: Save FileMetadata (path, size, hash)
    B-->>C: 201 Created { fileId }
    Q->>B: Async OCR/dedup consumer
    B->>B: OCR index + duplicate detection
```

---

## WebSocket Realtime Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket /ws/upload-progress
    participant B as Backend

    C->>WS: Connect with ?token=JWT
    WS->>B: Validate JWT on handshake
    C->>WS: { action: "subscribe", sessionId: "..." }
    B->>WS: Push UploadProgressDto frames
    Note over C,WS: Heartbeat every 25s (ping/pong)
    WS-->>C: { sessionId, fileName, progress, speed, eta }
    C->>WS: { action: "unsubscribe", sessionId: "..." }
    Note over C: Exponential backoff reconnect on disconnect
```

---

## Database Entity Relationship Diagram

```mermaid
erDiagram
    USER {
        bigint id PK
        string username
        string email
        string password_hash
        string role
        timestamp created_at
    }
    WORKSPACE {
        bigint id PK
        string name
        string workspace_type
        bigint owner_id FK
        timestamp created_at
    }
    WORKSPACE_MEMBER {
        bigint id PK
        bigint workspace_id FK
        bigint user_id FK
        string role
    }
    FOLDER {
        bigint id PK
        bigint workspace_id FK
        bigint parent_id FK
        string name
        string path
    }
    FILE_METADATA {
        bigint id PK
        bigint workspace_id FK
        bigint folder_id FK
        bigint owner_id FK
        string file_name
        string content_type
        bigint size_bytes
        string storage_path
        string sha256_hash
        boolean is_deleted
        boolean is_starred
        timestamp created_at
        timestamp deleted_at
    }
    FILE_VERSION {
        bigint id PK
        bigint file_id FK
        int version_number
        string storage_path
        bigint size_bytes
        string sha256_hash
        timestamp created_at
    }
    OCR_CONTENT {
        bigint id PK
        bigint file_id FK
        text extracted_text
        timestamp indexed_at
    }
    COMMENT {
        bigint id PK
        bigint file_id FK
        bigint author_id FK
        bigint parent_id FK
        text content
        timestamp created_at
    }
    SHARE_LINK {
        string id PK
        bigint file_id FK
        bigint creator_id FK
        string token
        string share_type
        string permission
        boolean password_protected
        int download_count
        timestamp expires_at
    }
    AUDIT_EVENT {
        bigint id PK
        bigint workspace_id FK
        bigint user_id FK
        string event_type
        string entity_type
        bigint entity_id
        text details
        timestamp created_at
    }
    NOTIFICATION {
        bigint id PK
        bigint recipient_id FK
        string type
        string message
        boolean is_read
        timestamp created_at
    }

    USER ||--o{ WORKSPACE : owns
    USER ||--o{ WORKSPACE_MEMBER : member_of
    WORKSPACE ||--o{ WORKSPACE_MEMBER : has
    WORKSPACE ||--o{ FOLDER : contains
    WORKSPACE ||--o{ FILE_METADATA : stores
    FOLDER ||--o{ FOLDER : parent_of
    FOLDER ||--o{ FILE_METADATA : holds
    FILE_METADATA ||--o{ FILE_VERSION : versions
    FILE_METADATA ||--o| OCR_CONTENT : indexed_by
    FILE_METADATA ||--o{ COMMENT : has
    FILE_METADATA ||--o{ SHARE_LINK : shared_via
    WORKSPACE ||--o{ AUDIT_EVENT : logged_by
    USER ||--o{ NOTIFICATION : receives
```

---

## Folder Structure

```
Cloud File Storage System/
├── .github/
│   └── workflows/
│       ├── backend.yml          # Backend CI: Maven build + Docker
│       └── frontend.yml         # Frontend CI: Lint, build, test, Docker
├── backend/
│   ├── src/main/java/com/cloudstorage/backend/
│   │   ├── config/              # Spring MVC, Security, WebSocket, CORS, Redis
│   │   ├── controller/          # 36 REST controllers + GlobalExceptionHandler
│   │   ├── dto/                 # Request/response data transfer objects
│   │   ├── entity/              # JPA entities (Hibernate)
│   │   ├── repository/          # Spring Data JPA repositories
│   │   ├── security/            # JWT filter, UserDetails, SecurityConfig
│   │   └── service/             # Business logic services
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   ├── application-dev.properties
│   │   ├── application-prod.properties
│   │   └── logback-spring.xml
│   └── Dockerfile               # Multi-stage Maven + JRE image
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── manifest.json        # PWA manifest
│   │   └── sw.js                # Service worker (stale-while-revalidate)
│   ├── src/
│   │   ├── api/                 # Axios client with timing + dedup
│   │   ├── components/          # Shared UI (ErrorBoundary, LoadingSpinner, shadcn)
│   │   ├── contexts/            # AuthProvider, ThemeProvider, WorkspaceProvider, RealtimeProvider
│   │   ├── features/            # Domain modules (storage, search, admin, realtime, offline...)
│   │   ├── hooks/               # useDebounce, useVirtualList
│   │   ├── layouts/             # AuthLayout, MainLayout
│   │   ├── pages/               # Lazy-loaded page components
│   │   ├── routes/              # React Router v7 route definitions
│   │   ├── test/                # Vitest setup + RTL utilities + baseline tests
│   │   └── utils/               # logger.ts, cn(), formatters
│   ├── Dockerfile               # Multi-stage Node build + Nginx serve
│   ├── nginx.conf               # Hardened Nginx config
│   ├── vite.config.ts           # Vendor chunk splitting
│   ├── vitest.config.ts         # Unit testing config
│   └── playwright.config.ts     # E2E testing config
├── .env.example                 # Environment variable template
├── docker-compose.yml           # Full stack compose (db, minio, redis, rabbitmq, backend, frontend)
├── docker-compose.override.yml  # Dev overrides (debug ports, dev profile)
└── README.md                    # Full-stack project overview
```

---

## Caching Strategy

| Layer           | Technology          | What Is Cached                          | TTL        |
|-----------------|---------------------|-----------------------------------------|------------|
| Browser         | Service Worker      | Static JS/CSS/HTML chunks               | 1 year     |
| Browser         | IndexedDB           | Recent files, favorites, workspaces     | Persistent |
| CDN / Nginx     | HTTP Cache-Control  | Hashed `/assets/*` files                | 1 year     |
| Application     | Caffeine / Redis    | Quota usage, search results, file meta  | 5 min      |
| API Layer       | TanStack Query      | Server state (query cache)              | staleTime  |

---

## Error Handling Architecture

```mermaid
graph TD
    Render[Component Render] -->|Throw| EB[ErrorBoundary]
    EB -->|Logs to| Logger[logger.error + errorId]
    EB -->|Shows| Fallback[Fallback UI with Retry button]
    API[API Call] -->|4xx/5xx| Interceptor[Axios Response Interceptor]
    Interceptor -->|401| Auth[Clear auth, redirect /login]
    Interceptor -->|Other| Toast[Sonner toast notification]
    Interceptor -->|Logs| Logger
```
