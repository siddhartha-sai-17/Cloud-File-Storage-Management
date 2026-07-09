# Security Architecture & Hardening Review

This document reviews security controls, OWASP Top 10 mitigations, encryption standards, and threat prevention designs implemented.

---

## OWASP Top 10 Mitigation Matrix

### A01:2021 — Broken Access Control
- **Mitigation**: Implemented a comprehensive Workspace Role-Based Access Control (RBAC) security matrix. The `AuthorizationService` interceptor asserts target workspace access permissions prior to resource edits (releasing files, editing comments, setting public share configs). It blocks unauthorized users (403 Forbidden) and isolates cross-tenant workspaces.

### A02:2021 — Cryptographic Failures
- **Mitigation**: Passwords are never stored in plain text; they are encrypted utilizing BCrypt (12-round work factor) during registration and login matches. Transport security is achieved by enforcing HTTPS configurations via the reverse proxy (Nginx). Time-limited signed sharing URLs are protected using HMAC-SHA256 signatures with base64 tokens.

### A03:2021 — Injection
- **Mitigation**: Relational database operations utilize Spring Data JPA Repositories and JPQL parameter binding. Precompiled SQL statements prevent SQL Injection (SQLi) attacks. User comments inputs are verified and sanitized to prevent Cross-Site Scripting (XSS) code insertions.

### A04:2021 — Insecure Design
- **Mitigation**: Standardized API response wrappers (`ErrorResponse.java`) map errors globally. It prevents java stack traces, DB credentials, or class names from leaking to client interfaces.

### A05:2021 — Security Misconfiguration
- **Mitigation**: Multi-stage Docker files are configured to run under a dedicated, low-privilege system user (`appuser`), avoiding container escalation threats. Default credentials are isolated in active profiles configuration files.

### A07:2021 — Identification and Authentication Failures
- **Mitigation**: Authentication is verified using stateless JSON Web Tokens (JWT) signed with a dynamic HMAC key (`jwt.secret`). Authentication routes reject brute force credentials checks.

### A08:2021 — Software and Data Integrity Failures
- **Mitigation**: File chunk uploads require a SHA-256 hash payload. The backend re-hashes complete files upon merge to verify transfer integrity and block corrupted payload injections.

---

## Core Security Hardening Details

### 1. Sliding Window Rate Limiting Interceptor
A custom Spring Handler Interceptor tracks IP traffic frequencies. It blocks brute force login attempts or scraping requests exceeding thresholds, returning `429 Too Many Requests`.

### 2. Path Traversal & Unsafe File Upload Prevention
- Uploaded files are renamed to unique UUID strings when written to MinIO, preventing path traversal attacks (e.g. `../../filename`).
- Original filenames are sanitized prior to database entry. File metadata stores mime-type classifications detected by binary signatures, blocking executable uploads masquerading as document extensions.

### 3. Password Hashing (BCrypt)
- Direct BCrypt verification prevents database leaks from compromising active user accounts:
  ```java
  String hashedPassword = passwordEncoder.encode(plainPassword);
  ```
