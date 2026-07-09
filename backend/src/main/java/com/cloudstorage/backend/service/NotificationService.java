package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.NotificationDto;
import com.cloudstorage.backend.entity.EntityType;
import com.cloudstorage.backend.entity.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificationService {

    void createNotification(Long userId, Long workspaceId, NotificationType type, String title, String message, EntityType referenceType, Long referenceId);

    void notifyMention(Long userId, Long workspaceId, String title, String message, EntityType referenceType, Long referenceId);

    Page<NotificationDto> getUserNotifications(Long userId, Long workspaceId, Pageable pageable);

    List<NotificationDto> getUnreadNotifications(Long userId, Long workspaceId);

    void markAsRead(Long notificationId, Long userId);

    void markAllAsRead(Long userId, Long workspaceId);

    long getUnreadCount(Long userId, Long workspaceId);

    void deleteNotification(Long notificationId, Long userId);
}
