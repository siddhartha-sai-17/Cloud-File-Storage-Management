package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.WorkspaceActivityDto;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkspaceActivityServiceImpl implements WorkspaceActivityService {

    private final WorkspaceActivityRepository workspaceActivityRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logActivity(Long workspaceId, Long userId, ActivityType activityType, String result) {
        HttpServletRequest request = getRequest();
        String ip = request != null ? request.getRemoteAddr() : "127.0.0.1";
        String userAgent = request != null ? request.getHeader("User-Agent") : "System";
        logActivityDetailed(workspaceId, userId, activityType, ip, userAgent, 0L, result);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logActivityDetailed(Long workspaceId, Long userId, ActivityType activityType, String ip, String userAgent, Long duration, String result) {
        Workspace workspace = workspaceRepository.findById(workspaceId).orElse(null);
        if (workspace == null) {
            return;
        }

        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        WorkspaceActivity activity = WorkspaceActivity.builder()
                .workspace(workspace)
                .user(user)
                .activityType(activityType)
                .ip(ip)
                .userAgent(userAgent)
                .duration(duration)
                .result(result)
                .build();

        workspaceActivityRepository.save(activity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceActivityDto> getWorkspaceActivity(Long workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found: " + workspaceId));

        return workspaceActivityRepository.findByWorkspaceOrderByCreatedAtDesc(workspace).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private HttpServletRequest getRequest() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return attributes != null ? attributes.getRequest() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private WorkspaceActivityDto mapToDto(WorkspaceActivity act) {
        return WorkspaceActivityDto.builder()
                .id(act.getId())
                .workspaceId(act.getWorkspace().getId())
                .username(act.getUser() != null ? act.getUser().getUsername() : "System")
                .activityType(act.getActivityType())
                .ip(act.getIp())
                .userAgent(act.getUserAgent())
                .duration(act.getDuration())
                .result(act.getResult())
                .createdAt(act.getCreatedAt())
                .build();
    }
}
