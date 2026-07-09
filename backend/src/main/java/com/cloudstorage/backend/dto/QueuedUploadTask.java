package com.cloudstorage.backend.dto;

import com.cloudstorage.backend.entity.UploadPriority;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicLong;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueuedUploadTask implements Comparable<QueuedUploadTask> {

    private static final AtomicLong SEQUENCE = new AtomicLong(0);

    private String sessionId;
    private String username;
    private UploadPriority priority;
    private LocalDateTime enqueuedAt;
    private long sequenceNumber;
    private String clientUploadId;
    private String filename;
    private Long fileSize;

    public static QueuedUploadTask of(String sessionId, String username,
                                      UploadPriority priority, String clientUploadId,
                                      String filename, Long fileSize) {
        return QueuedUploadTask.builder()
                .sessionId(sessionId)
                .username(username)
                .priority(priority)
                .enqueuedAt(LocalDateTime.now())
                .sequenceNumber(SEQUENCE.incrementAndGet())
                .clientUploadId(clientUploadId)
                .filename(filename)
                .fileSize(fileSize)
                .build();
    }

    /**
     * Higher priority first; for same priority, earlier enqueue time wins (FIFO within priority).
     */
    @Override
    public int compareTo(QueuedUploadTask other) {
        int priorityCompare = Integer.compare(other.priority.getWeight(), this.priority.getWeight());
        if (priorityCompare != 0) return priorityCompare;
        return Long.compare(this.sequenceNumber, other.sequenceNumber);
    }
}
