# Milestone 2.9 — Upload Progress Tracking

## Background

This milestone introduces a production-grade progress tracking subsystem that aggregates real-time upload metrics from all active sub-systems (parallel upload engine, retry engine, queue scheduler, pause/resume lifecycle, completion pipeline) and broadcasts them to subscribed clients via WebSocket and polling REST APIs.

Progress data is throttled before database writes and WebSocket broadcasts to prevent write amplification under high concurrency.

---

## User Review Required

> [!IMPORTANT]
> **WebSocket Transport Decision**: This plan uses Spring's built-in `WebSocketHandler` (raw WebSocket, no STOMP/SockJS) for maximum performance and simplicity. If STOMP/SockJS is preferred for client compatibility, please confirm before implementation.

> [!IMPORTANT]
> **SSE vs WebSocket**: Server-Sent Events (SSE) are mentioned in the spec as optional. This plan implements WebSocket as the primary push channel and SSE as a secondary REST-stream endpoint. If SSE should be primary, confirm.

> [!WARNING]
> **Database Column Additions**: This milestone adds 8 new columns to `upload_sessions`. Hibernate DDL auto-update will apply them automatically on restart with no data loss since all new columns are nullable or have defaults.

> [!NOTE]
> **Progress Version**: An optimistic `progressVersion` counter is used to resolve concurrent progress update conflicts without exclusive locks. Updates that arrive with a stale version are silently discarded, preserving the most recent state.

---

## Open Questions

1. **WebSocket Authentication**: Should WebSocket connections be authenticated via JWT query parameter or HTTP session cookie? (Plan: JWT query param `/ws/upload-progress?token=...`)
2. **Broadcast Granularity**: Should all subscribers receive all session updates, or only the updates for sessions they have explicitly subscribed to? (Plan: per-session subscription model)
3. **Historical Progress**: Should completed sessions preserve their final progress snapshot indefinitely, or be pruned after N days? (Plan: never pruned by this milestone — addressed in Milestone 2.10)

---

## Key Architecture Decisions

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      Upload Pipeline Events                       │
│  UploadChunkService ─┐                                            │
│  UploadRetryService  ├──► ProgressAggregator ──► UploadProgressService
│  UploadQueueService  │           │                        │       │
│  UploadLifecycle     ┘           │               (throttled DB write)
└───────────────────────────────── │ ──────────────────────────────┘
                                   │
                            ProgressBroadcaster
                            ┌──────┴───────┐
                       WebSocket          REST Polling
                  (push, per-session)  (GET /progress)
```

### 1. In-Memory Progress Cache

All live progress is stored in a `ConcurrentHashMap<String, UploadProgressSnapshot>` keyed by `sessionId`. This provides lock-free reads for the REST polling endpoint and the WebSocket broadcaster.

### 2. Write Throttling

Two separate `ScheduledExecutorService` tasks flush progress to the database and WebSocket broadcast at configurable intervals:
- **DB flush**: every `upload.progress.db-update-interval-ms` (default 1000ms)
- **WebSocket broadcast**: every `upload.progress.broadcast-interval-ms` (default 500ms)

This decouples progress calculation (happens on every chunk upload) from persistence and broadcast, preventing database write amplification.

### 3. Atomic Progress Updates

`ProgressAggregator.recordChunkComplete(sessionId, chunkBytes, chunkDurationMs)` uses a `synchronized` block on the snapshot object to atomically update:
- `uploadedBytes`
- `uploadedChunks`
- `speedSamples` (ring buffer of recent chunk throughputs)
- `progressVersion`

This follows the same pattern as `UploadChunkService`'s per-session lock.

### 4. Speed Calculation

Speed is calculated using a sliding window of the last **10 chunk completion events** stored in a fixed-size `ArrayDeque` (ring buffer) within each `UploadProgressSnapshot`. This produces smooth, accurate speed estimates without requiring database access.

ETA = `remainingBytes / currentSpeedBps`

### 5. WebSocket Subscription Model

`ProgressSubscriptionManager` maintains a `ConcurrentHashMap<String, Set<WebSocketSession>>` mapping `sessionId → Set<WebSocketSession>`. Each WebSocket connection:
1. Sends `{"action":"subscribe","sessionId":"..."}` on open
2. Receives periodic progress JSON updates
3. Sends `{"action":"unsubscribe","sessionId":"..."}` to stop

Disconnection is handled via `afterConnectionClosed`.

---

## Proposed Changes

### Database Changes

#### [MODIFY] `upload_sessions` table

8 new nullable columns added via Hibernate DDL auto-update:

| Column | Type | Description |
|---|---|---|
| `progress_version` | BIGINT | Optimistic version for concurrent updates |
| `upload_percentage` | DOUBLE | Computed upload percentage |
| `current_speed_bps` | BIGINT | Most recent chunk speed (bytes/sec) |
| `average_speed_bps` | BIGINT | Rolling average speed (bytes/sec) |
| `peak_speed_bps` | BIGINT | Highest speed seen for session |
| `eta_seconds` | BIGINT | Estimated time remaining |
| `last_progress_update` | DATETIME | Timestamp of last progress snapshot DB write |
| `last_chunk_completed` | DATETIME | Timestamp of last successful chunk |

---

### Entity Changes

#### [MODIFY] [UploadSession.java](file:///d:/Docker/Cloud File Storage System/backend/src/main/java/com/cloudstorage/backend/entity/UploadSession.java)

Add the 8 new fields listed above to the entity.

---

### Configuration Changes

#### [MODIFY] [application.properties](file:///d:/Docker/Cloud File Storage System/backend/src/main/resources/application.properties)

```properties
upload.progress.enabled=true
upload.progress.broadcast-interval-ms=500
upload.progress.db-update-interval-ms=1000
upload.progress.websocket.enabled=true
upload.progress.max-subscribers=5000
```

#### [MODIFY] [UploadConfig.java](file:///d:/Docker/Cloud File Storage System/backend/src/main/java/com/cloudstorage/backend/config/UploadConfig.java)

Bind the 5 new progress properties.

---

### New Files

---

#### [NEW] `dto/UploadProgressDto.java`

Response DTO containing all progress metrics exposed via REST and WebSocket:

```java
sessionId, filename, fileSize, uploadedBytes, remainingBytes,
uploadedChunks, remainingChunks, totalChunks, uploadPercentage,
currentSpeedBps, averageSpeedBps, peakSpeedBps, etaSeconds,
lastActivityAt, lastChunkCompletedAt, status, retryState, queueState,
parallelActiveChunks, progressVersion
```

---

#### [NEW] `dto/UploadProgressSnapshot.java`

Internal in-memory snapshot (not a JPA entity) used for thread-safe progress aggregation:

```java
// Mutable fields protected by synchronized(this)
volatile long uploadedBytes
volatile int uploadedChunks
volatile double progressVersion
ArrayDeque<Long> recentChunkSpeeds // ring buffer, max 10 entries
long peakSpeedBps
// Computed fields
double currentSpeedBps
double averageSpeedBps
long etaSeconds
```

---

#### [NEW] `service/UploadProgressService.java`

Central coordinator. Responsibilities:
- `recordChunkComplete(sessionId, bytes, durationMs)` — called by `UploadChunkService` after each chunk
- `getProgress(sessionId)` — REST read, served from in-memory cache
- `getAllActiveProgress()` — returns all in-flight sessions
- `recoverProgressFromDb()` — `@PostConstruct` rebuilds in-memory cache from DB on restart
- `flushProgressToDb()` — `@Scheduled` writes snapshots to DB
- `getSessionStatistics(sessionId)` — extended stats including speed history

---

#### [NEW] `service/ProgressAggregator.java`

Stateless bean. Accepts raw chunk events and updates the `UploadProgressSnapshot` atomically. Called from within upload worker threads, so must be fully thread-safe.

---

#### [NEW] `service/ProgressBroadcaster.java`

`@Scheduled` bean that iterates active in-memory snapshots and broadcasts JSON to subscribed WebSocket sessions. Applies backpressure: if a session's WebSocket send queue is full, that specific send is skipped (non-blocking).

---

#### [NEW] `service/UploadStatisticsService.java`

Computes and persists extended statistics:
- Peak speed per session
- Upload speed histogram
- Retry progress continuity (reset vs. cumulative bytes)

---

#### [NEW] `websocket/UploadProgressWebSocketHandler.java`

Extends `TextWebSocketHandler`. Handles:
- `afterConnectionEstablished` — authenticate JWT from query param, register session
- `handleTextMessage` — parse `subscribe`/`unsubscribe` commands
- `afterConnectionClosed` — remove all subscriptions for this socket

---

#### [NEW] `websocket/ProgressSubscriptionManager.java`

Manages `sessionId → Set<WebSocketSession>`. Thread-safe using `ConcurrentHashMap` + `CopyOnWriteArraySet`.

---

#### [NEW] `config/WebSocketConfig.java`

Registers `UploadProgressWebSocketHandler` at `/ws/upload-progress`.

---

#### [NEW] `controller/UploadProgressController.java`

REST endpoints:

| Method | Path | Description |
|---|---|---|
| GET | `/api/uploads/session/{sessionId}/progress` | Current progress snapshot |
| GET | `/api/uploads/session/{sessionId}/statistics` | Extended stats |
| GET | `/api/uploads/progress/active` | All active sessions |
| GET | `/api/uploads/progress/history` | Paginated completed sessions |

---

#### [NEW] `exception/ProgressTrackingException.java`
#### [NEW] `exception/ProgressCalculationException.java`
#### [NEW] `exception/ProgressBroadcastException.java`
#### [NEW] `exception/ProgressSubscriptionException.java`

HTTP mappings in `GlobalExceptionHandler`:
- `ProgressTrackingException` → 500
- `ProgressCalculationException` → 500
- `ProgressBroadcastException` → 503
- `ProgressSubscriptionException` → 400

---

### Modified Files

#### [MODIFY] [UploadChunkService.java](file:///d:/Docker/Cloud File Storage System/backend/src/main/java/com/cloudstorage/backend/service/UploadChunkService.java)

Inject `UploadProgressService`. After each successful chunk write:
```java
progressService.recordChunkComplete(sessionId, chunkBytes, durationMs);
```

#### [MODIFY] [UploadCompletionService.java](file:///d:/Docker/Cloud File Storage System/backend/src/main/java/com/cloudstorage/backend/service/UploadCompletionService.java)

After session is marked `COMPLETED`: call `progressService.markComplete(sessionId)`.

#### [MODIFY] [UploadLifecycleService.java](file:///d:/Docker/Cloud File Storage System/backend/src/main/java/com/cloudstorage/backend/service/UploadLifecycleService.java)

On `pauseUpload`: call `progressService.markPaused(sessionId)`.  
On `resumeUpload`: call `progressService.markResumed(sessionId)`.

#### [MODIFY] [UploadRetryService.java](file:///d:/Docker/Cloud File Storage System/backend/src/main/java/com/cloudstorage/backend/service/UploadRetryService.java)

On retry execution: call `progressService.recordRetry(sessionId, attempt)`.

---

## Concurrency Strategy

| Concern | Approach |
|---|---|
| Snapshot reads | `volatile` fields — lock-free |
| Snapshot writes (chunk events) | `synchronized(snapshot)` — minimal critical section |
| Subscriber map reads | `ConcurrentHashMap` — lock-free |
| Subscriber set mutations | `CopyOnWriteArraySet` — thread-safe iteration |
| DB flush | `@Scheduled` single-threaded — no contention |
| WebSocket broadcast | `@Scheduled` single-threaded — non-blocking sends |
| Optimistic progress version | Atomic increment inside `synchronized` block |

---

## Transaction Boundaries

Progress recording (`recordChunkComplete`) runs **outside** database transactions — it only mutates in-memory state. DB persistence is done asynchronously via the `@Scheduled` flush job in a **new independent transaction** (`Propagation.REQUIRES_NEW`).

This prevents progress tracking from extending or polluting chunk upload transactions.

---

## Failure Recovery

On application restart:
- `@PostConstruct` in `UploadProgressService` queries all non-completed sessions from DB and rebuilds in-memory snapshots from `uploadedBytes`, `uploadedChunks`, `averageSpeedBps`, and `peakSpeedBps` columns
- WebSocket subscribers are cleared (clients must reconnect)
- No progress data is lost for sessions with at least one DB flush

---

## Verification Plan

### Verification Script: `verify_milestone_2_9.py`

Covers 18 test cases:

| # | Test |
|---|---|
| 1 | Progress percentage accuracy |
| 2 | Uploaded bytes calculation |
| 3 | Uploaded chunk count tracking |
| 4 | ETA calculation |
| 5 | Upload speed calculation |
| 6 | Peak speed tracking |
| 7 | Parallel upload aggregation |
| 8 | Retry progress continuity |
| 9 | Queue integration state |
| 10 | Pause/Resume continuity |
| 11 | WebSocket connection & subscribe |
| 12 | WebSocket broadcast received |
| 13 | Subscriber management |
| 14 | High concurrency (1000+ chunks) |
| 15 | DB consistency after flush |
| 16 | Transaction rollback |
| 17 | API contract verification |
| 18 | Performance stress test |

### Automated Regression

All previous suites (`verify_phase1_advanced.py` through `verify_milestone_2_8.py`) must pass 100% before marking this milestone complete.

---

## Performance Requirements

| Metric | Target |
|---|---|
| Progress record latency | < 1ms per chunk event |
| WebSocket broadcast per cycle | < 50ms for 5000 sessions |
| DB flush per cycle | < 200ms for 1000 dirty snapshots |
| REST polling latency | < 5ms (memory read) |
| Memory overhead | < 2 KB per active session |
