package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.Notification;
import com.cloudstorage.backend.entity.NotificationType;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class WebSocketNotificationChannel implements NotificationChannel {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketNotificationChannel.class);

    @Override
    public void send(Notification notification) {
        // In a full implementation, this would use SimpMessagingTemplate or a custom WebSocketSession manager
        // to push the notification to the connected client.
        logger.debug("WebSocket event dispatched for user {}: {}", notification.getUser().getId(), notification.getMessage());
    }

    @Override
    public boolean supports(NotificationType type) {
        // Push everything over WebSocket if connected
        return true; 
    }
}
