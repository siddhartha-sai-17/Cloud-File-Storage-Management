package com.cloudstorage.backend.websocket;

import com.cloudstorage.backend.config.UploadConfig;
import com.cloudstorage.backend.exception.ProgressSubscriptionException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@RequiredArgsConstructor
public class ProgressSubscriptionManager {

    private static final Logger logger = LoggerFactory.getLogger(ProgressSubscriptionManager.class);

    private final UploadConfig uploadConfig;

    // Mapping: sessionId -> Set of WebSocketSessions
    private final ConcurrentHashMap<String, Set<WebSocketSession>> subscriptions = new ConcurrentHashMap<>();

    // Total subscriber count across all sessions
    private final AtomicInteger totalSubscribers = new AtomicInteger(0);

    public void subscribe(String sessionId, WebSocketSession session) {
        if (totalSubscribers.get() >= uploadConfig.getProgressMaxSubscribers()) {
            throw new ProgressSubscriptionException("Maximum subscribers capacity reached (" 
                    + uploadConfig.getProgressMaxSubscribers() + ")");
        }

        subscriptions.compute(sessionId, (id, sessions) -> {
            if (sessions == null) {
                sessions = new CopyOnWriteArraySet<>();
            }
            if (sessions.add(session)) {
                totalSubscribers.incrementAndGet();
                logger.info("Session {} subscribed to progress updates. Total subscribers: {}", 
                        session.getId(), totalSubscribers.get());
            }
            return sessions;
        });
    }

    public void unsubscribe(String sessionId, WebSocketSession session) {
        subscriptions.computeIfPresent(sessionId, (id, sessions) -> {
            if (sessions.remove(session)) {
                totalSubscribers.decrementAndGet();
                logger.info("Session {} unsubscribed from progress updates for {}. Total subscribers: {}", 
                        session.getId(), sessionId, totalSubscribers.get());
            }
            return sessions.isEmpty() ? null : sessions;
        });
    }

    public void unsubscribeAll(WebSocketSession session) {
        subscriptions.forEach((sessionId, sessions) -> {
            if (sessions.remove(session)) {
                totalSubscribers.decrementAndGet();
                logger.info("Removed session {} from {} on disconnect.", session.getId(), sessionId);
            }
        });
        // Remove empty entries
        subscriptions.entrySet().removeIf(entry -> entry.getValue().isEmpty());
    }

    public Set<WebSocketSession> getSubscribers(String sessionId) {
        return subscriptions.getOrDefault(sessionId, Collections.emptySet());
    }

    public int getSubscriberCount() {
        return totalSubscribers.get();
    }
}
