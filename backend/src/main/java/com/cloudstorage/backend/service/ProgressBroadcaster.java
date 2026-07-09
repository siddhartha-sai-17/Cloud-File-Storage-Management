package com.cloudstorage.backend.service;

import com.cloudstorage.backend.config.UploadConfig;
import com.cloudstorage.backend.dto.UploadProgressDto;
import com.cloudstorage.backend.websocket.ProgressSubscriptionManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProgressBroadcaster {

    private static final Logger logger = LoggerFactory.getLogger(ProgressBroadcaster.class);

    private final UploadConfig uploadConfig;
    private final UploadProgressService uploadProgressService;
    private final ProgressSubscriptionManager subscriptionManager;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
            .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Scheduled(fixedDelayString = "${upload.progress.broadcast-interval-ms:500}")
    public void broadcastProgressUpdates() {
        if (!uploadConfig.isProgressEnabled() || !uploadConfig.isProgressWebsocketEnabled()) {
            return;
        }

        List<UploadProgressDto> activeAlerts = uploadProgressService.getAllActiveProgress();
        for (UploadProgressDto dto : activeAlerts) {
            String sessionId = dto.getSessionId();
            Set<WebSocketSession> sessions = subscriptionManager.getSubscribers(sessionId);
            if (sessions.isEmpty()) {
                continue;
            }

            try {
                String jsonPayload = objectMapper.writeValueAsString(dto);
                TextMessage textMessage = new TextMessage(jsonPayload);

                for (WebSocketSession session : sessions) {
                    if (session.isOpen()) {
                        try {
                            session.sendMessage(textMessage);
                        } catch (Exception e) {
                            logger.warn("Failed to send WebSocket progress broadcast to session {}: {}", 
                                    session.getId(), e.getMessage());
                        }
                    }
                }
            } catch (Exception e) {
                logger.error("Error serializing upload progress for broadcasting", e);
            }
        }
    }
}
