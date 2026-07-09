package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.NotificationDto;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private Long getUserId(UserDetails userDetails) {
        return userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found")).getId();
    }

    @GetMapping
    public ResponseEntity<Page<NotificationDto>> getNotifications(
            @RequestParam(required = false) Long workspaceId,
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable) {
        Page<NotificationDto> notifications = notificationService.getUserNotifications(getUserId(userDetails), workspaceId, pageable);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread")
    public ResponseEntity<List<NotificationDto>> getUnreadNotifications(
            @RequestParam(required = false) Long workspaceId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<NotificationDto> notifications = notificationService.getUnreadNotifications(getUserId(userDetails), workspaceId);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread/count")
    public ResponseEntity<Long> getUnreadCount(
            @RequestParam(required = false) Long workspaceId,
            @AuthenticationPrincipal UserDetails userDetails) {
        long count = notificationService.getUnreadCount(getUserId(userDetails), workspaceId);
        return ResponseEntity.ok(count);
    }

    @RequestMapping(value = {"/{notificationId}/read", "/read/{notificationId}"}, method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAsRead(notificationId, getUserId(userDetails));
        return ResponseEntity.ok().build();
    }

    @RequestMapping(value = {"/read-all", "/read-all"}, method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseEntity<Void> markAllAsRead(
            @RequestParam(required = false) Long workspaceId,
            @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAllAsRead(getUserId(userDetails), workspaceId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Void> deleteNotification(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        notificationService.deleteNotification(notificationId, getUserId(userDetails));
        return ResponseEntity.noContent().build();
    }
}
