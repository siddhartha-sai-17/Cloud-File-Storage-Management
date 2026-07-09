package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import com.cloudstorage.backend.dto.QueuedUploadTask;
import com.cloudstorage.backend.dto.UploadQueueStatusDto;
import com.cloudstorage.backend.entity.UploadPriority;
import com.cloudstorage.backend.exception.UploadQueueFullException;
import com.cloudstorage.backend.exception.UploadQueueNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.PriorityBlockingQueue;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UploadQueueService {

    private static final Logger logger = LoggerFactory.getLogger(UploadQueueService.class);

    private final UploadConfig uploadConfig;
    private final UploadAuditService uploadAuditService;
    private UploadProgressService uploadProgressService;

    @org.springframework.beans.factory.annotation.Autowired
    public void setUploadProgressService(@org.springframework.context.annotation.Lazy UploadProgressService uploadProgressService) {
        this.uploadProgressService = uploadProgressService;
    }

    // Priority queue ordered by UploadPriority then FIFO sequence number
    private PriorityBlockingQueue<QueuedUploadTask> queue;

    // Track active (dequeued) tasks by sessionId
    private final ConcurrentHashMap<String, QueuedUploadTask> activeTasks = new ConcurrentHashMap<>();

    // Track all queued tasks by sessionId for O(1) status lookup
    private final ConcurrentHashMap<String, QueuedUploadTask> queuedTasks = new ConcurrentHashMap<>();

    @PostConstruct
    public void initialize() {
        queue = new PriorityBlockingQueue<>(Math.max(11, uploadConfig.getQueueMaxSize()));
        logger.info("UploadQueueService initialized. MaxSize={}, Enabled={}",
                uploadConfig.getQueueMaxSize(), uploadConfig.isQueueEnabled());
    }

    /**
     * Enqueue a new upload session with specified priority.
     */
    public QueuedUploadTask enqueue(String sessionId, String username,
                                    UploadPriority priority, String clientUploadId,
                                    String filename, Long fileSize) {
        if (!uploadConfig.isQueueEnabled()) {
            return null;
        }
        if (queuedTasks.containsKey(sessionId) || activeTasks.containsKey(sessionId)) {
            logger.info("Session {} already queued or active, returning existing task", sessionId);
            return queuedTasks.getOrDefault(sessionId, activeTasks.get(sessionId));
        }
        if (queue.size() >= uploadConfig.getQueueMaxSize()) {
            throw new UploadQueueFullException("Upload queue is full (max " + uploadConfig.getQueueMaxSize() + ")");
        }
        QueuedUploadTask task = QueuedUploadTask.of(sessionId, username, priority,
                clientUploadId, filename, fileSize);
        queue.put(task);
        queuedTasks.put(sessionId, task);
        if (uploadProgressService != null) {
            uploadProgressService.recordQueueState(sessionId, "QUEUED");
        }
        uploadAuditService.logEvent(sessionId, username, "QUEUE_ENTERED", "SUCCESS", "Priority: " + priority, null);
        uploadAuditService.logEvent(sessionId, username, "QUEUED", "SUCCESS", "Priority: " + priority, null);
        logger.info("Enqueued upload: sessionId={}, priority={}, queueSize={}", sessionId, priority, queue.size());
        return task;
    }

    /**
     * Dequeue the highest-priority task ready for execution.
     */
    public Optional<QueuedUploadTask> dequeue() {
        QueuedUploadTask task = queue.poll();
        if (task != null) {
            queuedTasks.remove(task.getSessionId());
            activeTasks.put(task.getSessionId(), task);
            if (uploadProgressService != null) {
                uploadProgressService.recordQueueState(task.getSessionId(), "ACTIVE");
            }
            long waitMs = Duration.between(task.getEnqueuedAt(), LocalDateTime.now()).toMillis();
            uploadAuditService.logEvent(task.getSessionId(), task.getUsername(), "QUEUE_DEQUEUED", "SUCCESS", "Priority: " + task.getPriority(), waitMs);
            uploadAuditService.logEvent(task.getSessionId(), task.getUsername(), "DEQUEUED", "SUCCESS", "Priority: " + task.getPriority(), waitMs);
            uploadAuditService.logEvent(task.getSessionId(), task.getUsername(), "UPLOAD_STARTED", "SUCCESS", "Priority: " + task.getPriority(), waitMs);
            logger.info("Dequeued upload: sessionId={}, priority={}, waitMs={}",
                    task.getSessionId(), task.getPriority(), waitMs);
        }
        return Optional.ofNullable(task);
    }

    /**
     * Mark a task as complete, removing it from the active map.
     */
    public void complete(String sessionId) {
        QueuedUploadTask removed = activeTasks.remove(sessionId);
        if (removed != null) {
            logger.info("Completed upload task: sessionId={}", sessionId);
        }
    }

    /**
     * Cancel and remove a session from the queue or active tasks.
     */
    public boolean cancel(String sessionId) {
        QueuedUploadTask queued = queuedTasks.remove(sessionId);
        if (queued != null) {
            queue.remove(queued);
            uploadAuditService.logEvent(sessionId, queued.getUsername(), "QUEUE_CANCELLED", "SUCCESS", "Removed from queue", null);
            uploadAuditService.logEvent(sessionId, queued.getUsername(), "CANCELLED", "SUCCESS", "Removed from queue", null);
            logger.info("Cancelled queued upload: sessionId={}", sessionId);
            return true;
        }
        QueuedUploadTask active = activeTasks.remove(sessionId);
        if (active != null) {
            uploadAuditService.logEvent(sessionId, active.getUsername(), "QUEUE_CANCELLED", "SUCCESS", "Removed active tasks", null);
            uploadAuditService.logEvent(sessionId, active.getUsername(), "CANCELLED", "SUCCESS", "Removed active tasks", null);
            logger.info("Cancelled active upload: sessionId={}", sessionId);
            return true;
        }
        return false;
    }

    /**
     * Promote a task to HIGH priority (anti-starvation).
     */
    public boolean promote(String sessionId) {
        QueuedUploadTask task = queuedTasks.get(sessionId);
        if (task == null) return false;
        if (task.getPriority() == UploadPriority.HIGH) return false;

        queue.remove(task);
        queuedTasks.remove(sessionId);

        QueuedUploadTask promoted = QueuedUploadTask.of(sessionId, task.getUsername(),
                UploadPriority.HIGH, task.getClientUploadId(), task.getFilename(), task.getFileSize());
        promoted.setEnqueuedAt(task.getEnqueuedAt());
        queue.put(promoted);
        queuedTasks.put(sessionId, promoted);

        uploadAuditService.logEvent(sessionId, task.getUsername(), "QUEUE_PROMOTED", "SUCCESS", "Promoted from " + task.getPriority() + " to HIGH", null);
        uploadAuditService.logEvent(sessionId, task.getUsername(), "PROMOTED", "SUCCESS", "Promoted from " + task.getPriority() + " to HIGH", null);
        logger.info("Promoted session {} from {} to HIGH priority due to starvation", sessionId, task.getPriority());
        return true;
    }

    /**
     * Get queue position and status for a specific session.
     */
    public UploadQueueStatusDto getStatus(String sessionId) {
        QueuedUploadTask task = queuedTasks.get(sessionId);
        if (task == null && !activeTasks.containsKey(sessionId)) {
            throw new UploadQueueNotFoundException("Session " + sessionId + " is not in the upload queue");
        }
        if (task == null) {
            // it's active/executing
            QueuedUploadTask active = activeTasks.get(sessionId);
            return UploadQueueStatusDto.builder()
                    .sessionId(sessionId)
                    .filename(active.getFilename())
                    .fileSize(active.getFileSize())
                    .priority(active.getPriority())
                    .queuePosition(0)
                    .enqueuedAt(active.getEnqueuedAt())
                    .waitTimeMs(Duration.between(active.getEnqueuedAt(), LocalDateTime.now()).toMillis())
                    .totalQueueSize(queue.size())
                    .highPriorityAhead(0)
                    .normalPriorityAhead(0)
                    .lowPriorityAhead(0)
                    .promoted(false)
                    .build();
        }

        List<QueuedUploadTask> sorted = new ArrayList<>(queue);
        Collections.sort(sorted);

        int position = 0;
        int highAhead = 0, normalAhead = 0, lowAhead = 0;
        for (QueuedUploadTask t : sorted) {
            if (t.getSessionId().equals(sessionId)) break;
            position++;
            switch (t.getPriority()) {
                case HIGH -> highAhead++;
                case NORMAL -> normalAhead++;
                case LOW -> lowAhead++;
            }
        }

        return UploadQueueStatusDto.builder()
                .sessionId(sessionId)
                .filename(task.getFilename())
                .fileSize(task.getFileSize())
                .priority(task.getPriority())
                .queuePosition(position + 1)
                .enqueuedAt(task.getEnqueuedAt())
                .waitTimeMs(Duration.between(task.getEnqueuedAt(), LocalDateTime.now()).toMillis())
                .totalQueueSize(queue.size())
                .highPriorityAhead(highAhead)
                .normalPriorityAhead(normalAhead)
                .lowPriorityAhead(lowAhead)
                .promoted(false)
                .build();
    }

    /**
     * Get all sessions in the queue, ordered by priority.
     */
    public List<UploadQueueStatusDto> getAllQueued() {
        List<QueuedUploadTask> sorted = new ArrayList<>(queue);
        Collections.sort(sorted);

        List<UploadQueueStatusDto> result = new ArrayList<>();
        int pos = 1;
        for (QueuedUploadTask t : sorted) {
            result.add(UploadQueueStatusDto.builder()
                    .sessionId(t.getSessionId())
                    .filename(t.getFilename())
                    .fileSize(t.getFileSize())
                    .priority(t.getPriority())
                    .queuePosition(pos++)
                    .enqueuedAt(t.getEnqueuedAt())
                    .waitTimeMs(Duration.between(t.getEnqueuedAt(), LocalDateTime.now()).toMillis())
                    .totalQueueSize(queue.size())
                    .build());
        }
        return result;
    }

    /**
     * Returns global queue statistics map.
     */
    public Map<String, Object> getStats() {
        List<QueuedUploadTask> all = new ArrayList<>(queue);
        long high = all.stream().filter(t -> t.getPriority() == UploadPriority.HIGH).count();
        long normal = all.stream().filter(t -> t.getPriority() == UploadPriority.NORMAL).count();
        long low = all.stream().filter(t -> t.getPriority() == UploadPriority.LOW).count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("queueSize", queue.size());
        stats.put("activeTasks", activeTasks.size());
        stats.put("highPriorityQueued", high);
        stats.put("normalPriorityQueued", normal);
        stats.put("lowPriorityQueued", low);
        stats.put("maxQueueSize", uploadConfig.getQueueMaxSize());
        stats.put("queueEnabled", uploadConfig.isQueueEnabled());
        return stats;
    }

    /**
     * Anti-starvation: Promote LOW/NORMAL tasks waiting longer than starvation threshold.
     */
    @Scheduled(fixedDelayString = "${upload.queue.starvation-threshold-ms:30000}")
    public void runStarvationCheck() {
        long thresholdMs = uploadConfig.getQueueStarvationThresholdMs();
        LocalDateTime now = LocalDateTime.now();
        int promoted = 0;
        for (Map.Entry<String, QueuedUploadTask> entry : queuedTasks.entrySet()) {
            QueuedUploadTask task = entry.getValue();
            if (task.getPriority() != UploadPriority.HIGH) {
                long waitMs = Duration.between(task.getEnqueuedAt(), now).toMillis();
                if (waitMs >= thresholdMs) {
                    if (promote(entry.getKey())) {
                        promoted++;
                    }
                }
            }
        }
        if (promoted > 0) {
            logger.info("Anti-starvation: promoted {} tasks to HIGH priority", promoted);
        }
    }

    public boolean isQueued(String sessionId) {
        return queuedTasks.containsKey(sessionId);
    }

    public boolean isActive(String sessionId) {
        return activeTasks.containsKey(sessionId);
    }

    public int getQueueSize() {
        return queue.size();
    }

    public int getActiveCount() {
        return activeTasks.size();
    }
}
