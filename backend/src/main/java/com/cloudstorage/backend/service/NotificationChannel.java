package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.Notification;
import com.cloudstorage.backend.entity.NotificationType;

public interface NotificationChannel {
    void send(Notification notification);
    boolean supports(NotificationType type);
}
