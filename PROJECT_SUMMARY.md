# Enterprise Cloud Storage System Portfolio Summary

This document serves as a comprehensive portfolio review, highlighting architectural design decisions, technical challenges, security mechanisms, performance optimization results, and resume talking points.

---

## Technical Highlights & Architecture

- **Clean Layered Architecture**: Establishes strict separations of concerns from HTTP request validation (Controller layer), transaction and domain rules (Service layer), and custom query specifications (Repository layer).
- **Stateless Clustering & Scalability**: The application backend utilizes JWT tokens signed with externalized symmetric keys, enabling horizontal scaling without sharing session state across nodes.
- **Microservice-Ready Storage**: Offloads heavy binary file streaming to a dedicated object storage service (MinIO) using AWS S3 API-compliant connections.
- **Asynchronous Task Workers**: Heavy processing tasks (e.g. OCR text extraction) run out-of-band in separate thread pools to avoid blocking client upload request threads.

---

## Technical Challenges & Solutions

### 1. Challenge: High-Throughput Parallel Chunk Merges
- **Problem**: Simultaneously uploading large files divided into 5MB chunks caused heavy disk usage and memory consumption when merging them sequentially.
- **Solution**: Implemented a thread-safe parallel chunk pipeline that streams chunks directly to MinIO temporary folders. When the upload completes, a single `ComposeObject` metadata merge request is executed directly on the storage server, achieving O(1) merge speed and avoiding container disk writes entirely.

### 2. Challenge: Distributed Cache Synchronization & Rate Limiting
- **Problem**: Implementing rate limit checks locally using simple JVM maps fails when scaled across multiple load-balanced nodes, leading to rate limit bypasses.
- **Solution**: Developed a sliding-window rate limiting interceptor backed by Redis cache storage. The interceptor dynamically loads IP limit configurations from the database and uses Redis key TTLs to enforce rate limits globally.

---

## Performance Optimizations

1. **Database Query Tuning**:
   - Analyzed slow queries and added table indexes on high-frequency query parameters: `AuditEvent(username, event_type, created_at)`, `FileMetadata(sha256)`, and `ShareLink(token)`.
   - Prevented N+1 database queries by using lazy-loaded fields and custom `JOIN FETCH` operations.
2. **JVM Container Optimization**:
   - Tuned memory footprints inside the alpine runtime container utilizing G1GC and dynamic MaxRAMPercentage constraints, matching container memory caps of 768MB.

---

## Resume Bullet Points

- **Designed and developed** an enterprise cloud file storage backend using Spring Boot, JPA, MySQL, Redis, and MinIO supporting shared workspaces, version tracking, and audit logging.
- **Architected** a high-throughput parallel chunk upload pipeline with SHA-256 integrity verification, parallel thread-pool workers, and O(1) direct object-storage compositions.
- **Implemented** a sliding-window rate limiter utilizing Redis and Caffeine caching, protecting endpoints from brute-force authentication and scraping.
- **Engineered** a trace-centric logging infrastructure using Logback and servlet filters injecting trace/correlation IDs into the MDC logging context.
- **Containerized** the application stack using multi-stage Docker builds running under non-root permissions, reducing the container image size to 160MB.
- **Configured** complete CI/CD pipelines via GitHub Actions automating build execution, dependency caching, integration testing, and Docker packaging.

---

## Technical Interview Talking Points

- *Explain parallel chunk uploads*: "To support large file uploads over unstable networks, we chunked the files client-side. Chunks are uploaded in parallel to temporary paths in object storage. We verify chunk MD5 checksums, and on completion, we execute a server-side merge. This eliminates local disk usage and reduces network overhead by allowing resumes from the last completed chunk."
- *Detail security access controls*: "We implemented workspace-level RBAC. Our security service intercepts requests to resolve the target workspace ID. It validates user membership roles (Owner, Manager, Editor, Viewer) before permitting actions, preventing IDOR vulnerabilities."
- *Discuss caching strategy*: "We use a two-level cache strategy. We use localized Caffeine caches for transient system configurations and token validation, and Redis for distributed sessions and rate-limiting counters."
- *MDC tracing context*: "We registered a high-precedence servlet filter that assigns a unique `requestId` and `traceId` to every request. By putting these in the SLF4J MDC context, our Logback console and file appenders print these IDs automatically with every log line, allowing us to trace request executions in a distributed cluster."
