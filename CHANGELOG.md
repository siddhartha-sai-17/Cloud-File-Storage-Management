# Changelog

All notable changes and architectural releases for the Enterprise Cloud File Storage System project are documented below.

---

## [1.0.0] — Phase 9: Production Release & Hardening (2026-06-29)
### Added
- Created `application-dev.properties`, `application-test.properties`, and `application-prod.properties` profile configurations.
- Implemented MDC request tracing filter (`LoggingFilter.java`) generating `requestId`, `correlationId`, and `traceId`.
- Added Logback configuration (`logback-spring.xml`) supporting log rotation (max 10MB per file, 30 days retention history).
- Added OpenAPI Swagger annotations to all Phase 8 controllers.
- Created GitHub Actions workflow (`.github/workflows/backend.yml`).
### Changed
- Refactored `Dockerfile` using multi-stage builds, non-root user execution (`appuser`), and container healthchecks.
- Removed host ports mappings from `redis` and `rabbitmq` services in `docker-compose.yml` to prevent local development conflicts.

---

## [0.8.0] — Phase 8: System Administration & Analytics (2026-06-28)
### Added
- Created `/api/admin/config` endpoints for sysadmins to set runtime system configurations.
- Created `/api/trash/**` and `/api/favorites/**` endpoints for soft-deleted items and starred items.
- Developed Duplicate Detection reports, recent documents dashboards, and document previews.
- Implemented Actuator Prometheus metrics registry.
- Implemented sliding window rate limiting.

---

## [0.7.0] — Phase 7: Enterprise Sharing & Public Links (2026-06-27)
### Added
- Created public share links supporting view limits, expirations, and password protection (BCrypt).
- Developed HMAC-SHA256 time-limited signed download URLs.
- Integrated ZXing QR code generator.

---

## [0.6.0] — Phase 6: Collaboration & Auditing (2026-06-26)
### Added
- Created system-wide Audit logging records tracking user file operations.
- Added threaded Comments and Mentions (`@username`).
- Implemented user Notifications engine.

---

## [0.5.0] — Phase 5: RBAC & Workspaces (2026-06-25)
### Added
- Created shared Team Workspaces.
- Implemented RBAC security constraints (Workspace Owner, Manager, Editor, Viewer).

---

## [0.4.0] — Phase 4: OCR & Search (2026-06-24)
### Added
- Added text extraction (Apache PDFBox) and Tesseract OCR engine integration.
- Built Advanced Search ranking query parsers.

---

## [0.3.0] — Phase 3: Versioning (2026-06-22)
### Added
- Built multi-version file records tracking and system restore rollback capabilities.

---

## [0.2.0] — Phase 2: Advanced Pipeline (2026-06-20)
### Added
- Built parallel chunk upload processing worker pool.

---

## [0.1.0] — Phase 1: Core Engine (2026-06-18)
### Added
- Created user registration, JWT logins, chunk upload REST API, and MinIO storage integration.
