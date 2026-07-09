package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.Notification;
import com.cloudstorage.backend.entity.NotificationType;
import com.cloudstorage.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DatabaseNotificationChannel implements NotificationChannel {

    private final NotificationRepository notificationRepository;

    @Override
    public void send(Notification notification) {
        notificationRepository.save(notification);
    }

    @Override
    public boolean supports(NotificationType type) {
        return true; // All notifications are persisted to DB
    }
}
