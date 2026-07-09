# Enterprise Cloud File Storage System

> A production-grade, full-stack cloud storage platform for teams and enterprises — built with Spring Boot 3, React 19, MinIO, PostgreSQL, Redis, and RabbitMQ.

[![Frontend CI](https://github.com/siddhartha-sai-17/Cloud-File-Storage-Management/actions/workflows/frontend.yml/badge.svg)](https://github.com/siddhartha-sai-17/Cloud-File-Storage-Management/actions/workflows/frontend.yml)
[![Backend CI](https://github.com/siddhartha-sai-17/Cloud-File-Storage-Management/actions/workflows/backend.yml/badge.svg)](https://github.com/siddhartha-sai-17/Cloud-File-Storage-Management/actions/workflows/backend.yml)

---

## ✨ Key Features

| Category | Features |
|---|---|
| **Authentication** | JWT-based auth, registration, password reset, role-based access control |
| **File Management** | Upload, download, preview, rename, move, delete, restore from trash |
| **Storage** | MinIO S3-compatible object storage, chunked uploads, resume support |
| **Search** | Full-text search, OCR extraction from PDFs and images, metadata filters |
| **Version History** | Unlimited file versions with diff viewer and one-click restore |
| **Collaboration** | Team workspaces, role-based membership, file comments and mentions |
| **Sharing** | Shareable links (public, password-protected, expiry-limited), view/download permissions |
| **Realtime** | WebSocket upload progress, live notifications, activity feed |
| **Analytics** | Storage usage charts, file type breakdown, team usage analytics |
| **Admin Panel** | User management, system health, quota management, audit logs |
| **Performance** | Redis caching, request deduplication, virtual scrolling, code splitting |
| **Accessibility** | WCAG 2.1 AA compliant, keyboard navigation, ARIA-labeled components |

---

## 🏗 Tech Stack

**Backend**
- Java 21, Spring Boot 3.x, Spring Security 6
- Spring Data JPA (Hibernate), HikariCP connection pooling
- MySQL 8.0 (primary DB), Redis (cache), RabbitMQ (async messaging)
- MinIO (S3-compatible object storage)
- Tesseract OCR via Tess4J
- Swagger/OpenAPI 3.0 documentation

**Frontend**
- React 19, TypeScript 5 (strict mode)
- React Router v7, TanStack Query v5
- TailwindCSS 3.x, shadcn/ui, Recharts
- Vite 6 with vendor chunk splitting
- Vitest + React Testing Library
- Playwright (E2E)

**Infrastructure**
- Docker, Docker Compose
- Nginx (reverse proxy, gzip, security headers)
- GitHub Actions (CI/CD)

---

## 🚀 Quick Start

### Prerequisites

| Tool | Minimum Version |
|---|---|
| Docker | 24.0+ |
| Docker Compose | 2.20+ |
| Node.js | 20.x LTS (frontend dev only) |
| Java | 21+ (backend dev only) |

### 1. Clone the Repository

```bash
git clone https://github.com/siddhartha-sai-17/Cloud-File-Storage-Management.git
cd Cloud-File-Storage-Management
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and fill in your secrets (JWT_SECRET, MinIO keys, DB password, etc.)
```

### 3. Start All Services

```bash
docker compose up --build -d
```

### 4. Access the Application

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 (dev) / http://localhost:80 (prod) |
| Backend API | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| MinIO Console | http://localhost:9001 |
| RabbitMQ Console | http://localhost:15672 |

### 5. Default Admin Credentials

Create your first admin account via `/register`, then promote via the Admin panel.

---

## 🔧 Local Development

### Backend (Spring Boot)

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

### Frontend Test Suite

```bash
# Unit tests (Vitest + RTL)
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Lint
npm run lint

# Type checking
npx tsc --noEmit

# Production build
npm run build
```

---

## 📁 Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system architecture and entity relationship diagram.

```
Cloud File Storage System/
├── backend/          # Spring Boot application
├── frontend/         # React 19 SPA
├── .github/          # CI/CD workflows
├── ARCHITECTURE.md   # Full system architecture
├── DEPLOYMENT.md     # Production deployment guide
├── USER_GUIDE.md     # End-user documentation
├── ADMIN_GUIDE.md    # Administrator documentation
├── API_REFERENCE.md  # REST API reference
├── .env.example      # Environment variable template
└── docker-compose.yml
```

---

## 🐳 Docker Compose Services

| Service | Port | Description |
|---|---|---|
| `backend` | 8080 | Spring Boot REST API |
| `frontend` | 80 | React SPA via Nginx |
| `db` | 3306 | MySQL 8.0 database |
| `minio` | 9000/9001 | Object storage |
| `redis` | 6379 | Cache + sessions |
| `rabbitmq` | 5672/15672 | Message queue |

---

## 🔐 Security

- All passwords stored as BCrypt hashes (cost factor 10+)
- JWT tokens signed with HS512 / 256-bit secrets
- Nginx enforces `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- CSRF protection via SameSite cookies and CORS allowlist
- Upload virus scanning hooks (configurable, pluggable)
- Audit log for all file operations (create/read/update/delete/share)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for SSL/TLS and production hardening steps.

---

## 📖 Documentation

| Document | Description |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, diagrams, data model |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Docker, Nginx, SSL, environment setup |
| [USER_GUIDE.md](./USER_GUIDE.md) | End-user guide: upload, share, search, workspaces |
| [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) | Admin panel, user management, monitoring |
| [API_REFERENCE.md](./API_REFERENCE.md) | Full REST endpoint reference |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request to `main`

All PRs are automatically verified by the CI pipeline (lint → type-check → build → test → Docker build).

---

## 📜 License

MIT License. See [LICENSE](./LICENSE) for details.
