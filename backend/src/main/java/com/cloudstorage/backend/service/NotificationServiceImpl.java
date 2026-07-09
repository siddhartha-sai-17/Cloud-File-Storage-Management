package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.NotificationDto;
import com.cloudstorage.backend.entity.EntityType;
import com.cloudstorage.backend.entity.Notification;
import com.cloudstorage.backend.entity.NotificationType;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.entity.Workspace;
import com.cloudstorage.backend.repository.NotificationRepository;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final List<NotificationChannel> channels;

    @Override
    @Transactional
    public void createNotification(Long userId, Long workspaceId, NotificationType type, String title, String message, EntityType referenceType, Long referenceId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Workspace workspace = null;
        if (workspaceId != null) {
            workspace = workspaceRepository.findById(workspaceId)
                    .orElseThrow(() -> new IllegalArgumentException("Workspace not found"));
        }

        Notification notification = Notification.builder()
                .user(user)
                .workspace(workspace)
                .notificationType(type)
                .title(title)
                .message(message)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .read(false)
                .build();

        for (NotificationChannel channel : channels) {
            if (channel.supports(type)) {
                channel.send(notification);
            }
        }
    }

    @Override
    @Transactional
    public void notifyMention(Long userId, Long workspaceId, String title, String message, EntityType referenceType, Long referenceId) {
        createNotification(userId, workspaceId, NotificationType.MENTION, title, message, referenceType, referenceId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationDto> getUserNotifications(Long userId, Long workspaceId, Pageable pageable) {
        User user = userRepository.findById(userId).orElseThrow();
        Page<Notification> notifications;
        if (workspaceId != null) {
            Workspace workspace = workspaceRepository.findById(workspaceId).orElseThrow();
            notifications = notificationRepository.findByUserAndWorkspace(user, workspace, pageable);
        } else {
            notifications = notificationRepository.findByUser(user, pageable);
        }
        return notifications.map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDto> getUnreadNotifications(Long userId, Long workspaceId) {
        User user = userRepository.findById(userId).orElseThrow();
        List<Notification> notifications;
        if (workspaceId != null) {
            Workspace workspace = workspaceRepository.findById(workspaceId).orElseThrow();
            notifications = notificationRepository.findByUserAndWorkspaceAndReadFalse(user, workspace);
        } else {
            notifications = notificationRepository.findByUserAndReadFalse(user);
        }
        return notifications.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!notification.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Notification does not belong to user");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId, Long workspaceId) {
        User user = userRepository.findById(userId).orElseThrow();
        List<Notification> notifications;
        if (workspaceId != null) {
            Workspace workspace = workspaceRepository.findById(workspaceId).orElseThrow();
            notifications = notificationRepository.findByUserAndWorkspaceAndReadFalse(user, workspace);
        } else {
            notifications = notificationRepository.findByUserAndReadFalse(user);
        }
        
        for (Notification n : notifications) {
            n.setRead(true);
        }
        notificationRepository.saveAll(notifications);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId, Long workspaceId) {
        User user = userRepository.findById(userId).orElseThrow();
        if (workspaceId != null) {
            Workspace workspace = workspaceRepository.findById(workspaceId).orElseThrow();
            return notificationRepository.countByUserAndWorkspaceAndReadFalse(user, workspace);
        }
        return notificationRepository.countByUserAndReadFalse(user);
    }

    @Override
    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!notification.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Notification does not belong to user");
        }
        notificationRepository.delete(notification);
    }

    private NotificationDto mapToDto(Notification notification) {
        return NotificationDto.builder()
                .id(notification.getId())
                .userId(notification.getUser().getId())
                .workspaceId(notification.getWorkspace() != null ? notification.getWorkspace().getId() : null)
                .notificationType(notification.getNotificationType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .referenceType(notification.getReferenceType())
                .referenceId(notification.getReferenceId())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
