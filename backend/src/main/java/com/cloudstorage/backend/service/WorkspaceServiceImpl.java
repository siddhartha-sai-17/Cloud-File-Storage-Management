package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.*;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.exception.*;
import com.cloudstorage.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkspaceServiceImpl implements WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;
    private final WorkspaceActivityService workspaceActivityService;
    private final AuthorizationCache authorizationCache;
    private final RoleHierarchyService roleHierarchyService;
    private final AuditService auditService;

    private final ConcurrentHashMap<Long, Object> workspaceLocks = new ConcurrentHashMap<>();

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    private Workspace getWorkspaceEntity(Long id) {
        return workspaceRepository.findById(id)
                .orElseThrow(() -> new WorkspaceNotFoundException("Workspace not found: " + id));
    }

    @Override
    @Transactional
    public WorkspaceDto createWorkspace(String username, WorkspaceDto.CreateRequest request) {
        User owner = getUser(username);

        Workspace workspace = Workspace.builder()
                .name(request.getName())
                .description(request.getDescription())
                .owner(owner)
                .workspaceType(request.getWorkspaceType() != null ? request.getWorkspaceType() : WorkspaceType.TEAM)
                .storageQuota(10737418240L) // Default 10GB
                .storageUsed(0L)
                .memberLimit(20)
                .status(WorkspaceStatus.ACTIVE)
                .build();

        workspace = workspaceRepository.save(workspace);

        // Add owner as a member with WORKSPACE_OWNER role
        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspace)
                .user(owner)
                .role(WorkspaceRole.WORKSPACE_OWNER)
                .status(WorkspaceMemberStatus.ACTIVE)
                .build();
        workspaceMemberRepository.save(member);

        workspaceActivityService.logActivity(
                workspace.getId(),
                owner.getId(),
                ActivityType.WORKSPACE_CREATED,
                "Workspace created: " + workspace.getName()
        );

        auditService.logEvent(workspace.getId(), owner.getId(), owner.getUsername(),
            com.cloudstorage.backend.entity.AuditEventType.WORKSPACE_CREATED,
            com.cloudstorage.backend.entity.EntityType.WORKSPACE, workspace.getId(),
            "Workspace created: " + workspace.getName(), "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());

        return mapToDto(workspace);
    }

    @Override
    @Transactional
    public WorkspaceDto updateWorkspace(String username, Long workspaceId, WorkspaceDto.UpdateRequest request) {
        User user = getUser(username);
        Workspace workspace = getWorkspaceEntity(workspaceId);

        // Authorization check: Owner or ADMIN
        if (!workspace.getOwner().getId().equals(user.getId()) && !user.isSysAdmin()) {
            throw new WorkspaceAccessDeniedException("Only the workspace owner or admin can update workspace settings");
        }

        Object lock = workspaceLocks.computeIfAbsent(workspaceId, k -> new Object());
        synchronized (lock) {
            if (request.getName() != null) workspace.setName(request.getName());
            if (request.getDescription() != null) workspace.setDescription(request.getDescription());
            if (request.getStatus() != null) workspace.setStatus(request.getStatus());
            if (request.getStorageQuota() != null) workspace.setStorageQuota(request.getStorageQuota());
            if (request.getMemberLimit() != null) workspace.setMemberLimit(request.getMemberLimit());

            workspace = workspaceRepository.save(workspace);
            authorizationCache.evictWorkspacePermissions(workspaceId);

            workspaceActivityService.logActivity(
                    workspaceId,
                    user.getId(),
                    ActivityType.WORKSPACE_UPDATED,
                    "Workspace settings updated"
            );

            auditService.logEvent(workspace.getId(), user.getId(), user.getUsername(),
                com.cloudstorage.backend.entity.AuditEventType.WORKSPACE_UPDATED,
                com.cloudstorage.backend.entity.EntityType.WORKSPACE, workspace.getId(),
                "Workspace settings updated", "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());
        }

        return mapToDto(workspace);
    }

    @Override
    @Transactional
    public void deleteWorkspace(String username, Long workspaceId) {
        User user = getUser(username);
        Workspace workspace = getWorkspaceEntity(workspaceId);

        if (!workspace.getOwner().getId().equals(user.getId()) && !user.isSysAdmin()) {
            throw new WorkspaceAccessDeniedException("Only the workspace owner or admin can delete a workspace");
        }

        Object lock = workspaceLocks.computeIfAbsent(workspaceId, k -> new Object());
        synchronized (lock) {
            // Remove members first
            List<WorkspaceMember> members = workspaceMemberRepository.findByWorkspace(workspace);
            workspaceMemberRepository.deleteAll(members);

            workspaceRepository.delete(workspace);
            authorizationCache.evictWorkspacePermissions(workspaceId);

            workspaceActivityService.logActivity(
                    workspaceId,
                    user.getId(),
                    ActivityType.WORKSPACE_DELETED,
                    "Workspace deleted: " + workspace.getName()
            );
        }
    }

    @Override
    @Transactional
    public WorkspaceDto transferOwnership(String username, Long workspaceId, WorkspaceDto.TransferRequest request) {
        User currentOwner = getUser(username);
        Workspace workspace = getWorkspaceEntity(workspaceId);

        if (!workspace.getOwner().getId().equals(currentOwner.getId()) && !currentOwner.isSysAdmin()) {
            throw new WorkspaceAccessDeniedException("Only the owner can transfer workspace ownership");
        }

        User newOwner = userRepository.findByUsername(request.getNewOwnerUsername())
                .orElseThrow(() -> new RuntimeException("New owner user not found: " + request.getNewOwnerUsername()));

        Object lock = workspaceLocks.computeIfAbsent(workspaceId, k -> new Object());
        synchronized (lock) {
            workspace.setOwner(newOwner);
            workspace = workspaceRepository.save(workspace);

            // Promote new owner to WORKSPACE_OWNER role in members if they are in members, otherwise add them
            Optional<WorkspaceMember> newOwnerMemberOpt = workspaceMemberRepository.findByWorkspaceAndUser(workspace, newOwner);
            if (newOwnerMemberOpt.isPresent()) {
                WorkspaceMember member = newOwnerMemberOpt.get();
                member.setRole(WorkspaceRole.WORKSPACE_OWNER);
                workspaceMemberRepository.save(member);
            } else {
                WorkspaceMember member = WorkspaceMember.builder()
                        .workspace(workspace)
                        .user(newOwner)
                        .role(WorkspaceRole.WORKSPACE_OWNER)
                        .status(WorkspaceMemberStatus.ACTIVE)
                        .build();
                workspaceMemberRepository.save(member);
            }

            // Demote old owner to MANAGER
            Optional<WorkspaceMember> oldOwnerMemberOpt = workspaceMemberRepository.findByWorkspaceAndUser(workspace, currentOwner);
            if (oldOwnerMemberOpt.isPresent()) {
                WorkspaceMember member = oldOwnerMemberOpt.get();
                member.setRole(WorkspaceRole.MANAGER);
                workspaceMemberRepository.save(member);
            }

            authorizationCache.evictWorkspacePermissions(workspaceId);

            workspaceActivityService.logActivity(
                    workspaceId,
                    currentOwner.getId(),
                    ActivityType.OWNERSHIP_TRANSFERRED,
                    "Ownership transferred to " + newOwner.getUsername()
            );
        }

        return mapToDto(workspace);
    }

    @Override
    @Transactional
    public WorkspaceDto archiveWorkspace(String username, Long workspaceId) {
        User user = getUser(username);
        Workspace workspace = getWorkspaceEntity(workspaceId);

        if (!workspace.getOwner().getId().equals(user.getId()) && !user.isSysAdmin()) {
            throw new WorkspaceAccessDeniedException("Only owner or admin can archive workspace");
        }

        workspace.setStatus(WorkspaceStatus.ARCHIVED);
        workspace = workspaceRepository.save(workspace);
        authorizationCache.evictWorkspacePermissions(workspaceId);

        workspaceActivityService.logActivity(
                workspaceId,
                user.getId(),
                ActivityType.WORKSPACE_UPDATED,
                "Workspace archived"
        );

        return mapToDto(workspace);
    }

    @Override
    @Transactional
    public WorkspaceDto restoreWorkspace(String username, Long workspaceId) {
        User user = getUser(username);
        Workspace workspace = getWorkspaceEntity(workspaceId);

        if (!workspace.getOwner().getId().equals(user.getId()) && !user.isSysAdmin()) {
            throw new WorkspaceAccessDeniedException("Only owner or admin can restore workspace");
        }

        workspace.setStatus(WorkspaceStatus.ACTIVE);
        workspace = workspaceRepository.save(workspace);
        authorizationCache.evictWorkspacePermissions(workspaceId);

        workspaceActivityService.logActivity(
                workspaceId,
                user.getId(),
                ActivityType.WORKSPACE_UPDATED,
                "Workspace restored to active"
        );

        return mapToDto(workspace);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceMemberDto> listMembers(String username, Long workspaceId) {
        Workspace workspace = getWorkspaceEntity(workspaceId);
        // Any active member can list members
        User user = getUser(username);
        if (!user.isSysAdmin() && !workspace.getOwner().getId().equals(user.getId()) &&
                !workspaceMemberRepository.existsByWorkspaceAndUserAndStatus(workspace, user, WorkspaceMemberStatus.ACTIVE)) {
            throw new WorkspaceAccessDeniedException("Must be a member of the workspace to list members");
        }

        return workspaceMemberRepository.findByWorkspace(workspace).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WorkspaceMemberDto addMember(String username, Long workspaceId, WorkspaceMemberDto.AddRequest request) {
        User operator = getUser(username);
        Workspace workspace = getWorkspaceEntity(workspaceId);

        // Check if operator is manager/owner/admin
        Optional<WorkspaceMember> operatorMember = workspaceMemberRepository.findByWorkspaceAndUser(workspace, operator);
        boolean isAuthorized = operator.isSysAdmin() || workspace.getOwner().getId().equals(operator.getId()) ||
                (operatorMember.isPresent() && operatorMember.get().getRole().hasAtLeast(WorkspaceRole.MANAGER));

        if (!isAuthorized) {
            throw new WorkspaceAccessDeniedException("Only managers or owners can add team members");
        }

        User targetUser = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found: " + request.getUsername()));

        Object lock = workspaceLocks.computeIfAbsent(workspaceId, k -> new Object());
        synchronized (lock) {
            // Check member limit
            int currentMembers = workspaceMemberRepository.countByWorkspace(workspace);
            if (currentMembers >= workspace.getMemberLimit()) {
                throw new WorkspaceQuotaExceededException("Workspace member limit reached: limit=" + workspace.getMemberLimit());
            }

            if (workspaceMemberRepository.existsByWorkspaceAndUser(workspace, targetUser)) {
                throw new WorkspaceMemberAlreadyExistsException("User is already a member of this workspace");
            }

            WorkspaceMember newMember = WorkspaceMember.builder()
                    .workspace(workspace)
                    .user(targetUser)
                    .role(request.getRole() != null ? request.getRole() : WorkspaceRole.VIEWER)
                    .status(WorkspaceMemberStatus.ACTIVE)
                    .build();

            newMember = workspaceMemberRepository.save(newMember);
            authorizationCache.evictUserPermissions(targetUser.getUsername());

            workspaceActivityService.logActivity(
                    workspaceId,
                    operator.getId(),
                    ActivityType.MEMBER_JOINED,
                    "Added user " + targetUser.getUsername() + " as " + newMember.getRole()
            );

            auditService.logEvent(workspace.getId(), operator.getId(), operator.getUsername(),
                com.cloudstorage.backend.entity.AuditEventType.MEMBER_ADDED,
                com.cloudstorage.backend.entity.EntityType.WORKSPACE_MEMBER, newMember.getId(),
                "Added user " + targetUser.getUsername() + " as " + newMember.getRole(), "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());

            return mapToDto(newMember);
        }
    }

    @Override
    @Transactional
    public void removeMember(String username, Long workspaceId, Long memberUserId) {
        User operator = getUser(username);
        Workspace workspace = getWorkspaceEntity(workspaceId);

        Optional<WorkspaceMember> operatorMember = workspaceMemberRepository.findByWorkspaceAndUser(workspace, operator);
        boolean isAuthorized = operator.isSysAdmin() || workspace.getOwner().getId().equals(operator.getId()) ||
                (operatorMember.isPresent() && operatorMember.get().getRole().hasAtLeast(WorkspaceRole.MANAGER));

        if (!isAuthorized) {
            throw new WorkspaceAccessDeniedException("Only managers or owners can remove team members");
        }

        User targetUser = userRepository.findById(memberUserId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + memberUserId));

        if (workspace.getOwner().getId().equals(targetUser.getId())) {
            throw new WorkspaceAccessDeniedException("Cannot remove the workspace owner");
        }

        Object lock = workspaceLocks.computeIfAbsent(workspaceId, k -> new Object());
        synchronized (lock) {
            WorkspaceMember member = workspaceMemberRepository.findByWorkspaceAndUser(workspace, targetUser)
                    .orElseThrow(() -> new RuntimeException("User is not a member of this workspace"));

            workspaceMemberRepository.delete(member);
            authorizationCache.evictUserPermissions(targetUser.getUsername());

            workspaceActivityService.logActivity(
                    workspaceId,
                    operator.getId(),
                    ActivityType.MEMBER_REMOVED,
                    "Removed member " + targetUser.getUsername()
            );

            auditService.logEvent(workspace.getId(), operator.getId(), operator.getUsername(),
                com.cloudstorage.backend.entity.AuditEventType.MEMBER_REMOVED,
                com.cloudstorage.backend.entity.EntityType.WORKSPACE_MEMBER, member.getId(),
                "Removed member " + targetUser.getUsername(), "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());
        }
    }

    @Override
    @Transactional
    public WorkspaceMemberDto updateMemberRole(String username, Long workspaceId, Long memberUserId, WorkspaceMemberDto.RoleUpdateRequest request) {
        User operator = getUser(username);
        Workspace workspace = getWorkspaceEntity(workspaceId);

        Optional<WorkspaceMember> operatorMember = workspaceMemberRepository.findByWorkspaceAndUser(workspace, operator);
        boolean isAuthorized = operator.isSysAdmin() || workspace.getOwner().getId().equals(operator.getId()) ||
                (operatorMember.isPresent() && operatorMember.get().getRole().hasAtLeast(WorkspaceRole.MANAGER));

        if (!isAuthorized) {
            throw new WorkspaceAccessDeniedException("Only managers or owners can update member roles");
        }

        User targetUser = userRepository.findById(memberUserId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + memberUserId));

        if (workspace.getOwner().getId().equals(targetUser.getId())) {
            throw new WorkspaceAccessDeniedException("Cannot change role of the workspace owner");
        }

        Object lock = workspaceLocks.computeIfAbsent(workspaceId, k -> new Object());
        synchronized (lock) {
            WorkspaceMember member = workspaceMemberRepository.findByWorkspaceAndUser(workspace, targetUser)
                    .orElseThrow(() -> new RuntimeException("User is not a member of this workspace"));

            member.setRole(request.getRole());
            member = workspaceMemberRepository.save(member);
            authorizationCache.evictUserPermissions(targetUser.getUsername());

            workspaceActivityService.logActivity(
                    workspaceId,
                    operator.getId(),
                    ActivityType.ROLE_CHANGED,
                    "Updated role of " + targetUser.getUsername() + " to " + request.getRole()
            );

            auditService.logEvent(workspace.getId(), operator.getId(), operator.getUsername(),
                com.cloudstorage.backend.entity.AuditEventType.ROLE_UPDATED,
                com.cloudstorage.backend.entity.EntityType.WORKSPACE_MEMBER, member.getId(),
                "Updated role of " + targetUser.getUsername() + " to " + request.getRole(), "SUCCESS", com.cloudstorage.backend.dto.AuditMetadata.builder().build());

            return mapToDto(member);
        }
    }

    @Override
    @Transactional
    public void leaveWorkspace(String username, Long workspaceId) {
        User user = getUser(username);
        Workspace workspace = getWorkspaceEntity(workspaceId);

        if (workspace.getOwner().getId().equals(user.getId())) {
            throw new WorkspaceAccessDeniedException("Owner cannot leave the workspace. Transfer ownership first.");
        }

        Object lock = workspaceLocks.computeIfAbsent(workspaceId, k -> new Object());
        synchronized (lock) {
            WorkspaceMember member = workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                    .orElseThrow(() -> new RuntimeException("You are not a member of this workspace"));

            workspaceMemberRepository.delete(member);
            authorizationCache.evictUserPermissions(username);

            workspaceActivityService.logActivity(
                    workspaceId,
                    user.getId(),
                    ActivityType.MEMBER_REMOVED,
                    "Member left workspace: " + username
            );
        }
    }

    @Override
    @Transactional
    public List<WorkspaceDto> listWorkspaces(String username) {
        User user = getUser(username);

        if (user.isSysAdmin()) {
            return workspaceRepository.findAll().stream()
                    .map(this::mapToDto)
                    .collect(Collectors.toList());
        }

        // Ensure personal workspace exists (auto-create on first list call)
        getOrCreatePersonalWorkspace(username);

        List<Workspace> owned = workspaceRepository.findByOwner(user);
        List<Workspace> memberOf = workspaceRepository.findWorkspacesUserIsMemberOf(user);

        List<Workspace> all = new ArrayList<>(owned);
        for (Workspace w : memberOf) {
            if (all.stream().noneMatch(ex -> ex.getId().equals(w.getId()))) {
                all.add(w);
            }
        }

        return all.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceDto getWorkspace(String username, Long workspaceId) {
        Workspace workspace = getWorkspaceEntity(workspaceId);
        User user = getUser(username);

        if (!user.isSysAdmin() && !workspace.getOwner().getId().equals(user.getId()) &&
                !workspaceMemberRepository.existsByWorkspaceAndUserAndStatus(workspace, user, WorkspaceMemberStatus.ACTIVE)) {
            throw new WorkspaceAccessDeniedException("Access denied to workspace");
        }

        return mapToDto(workspace);
    }

    @Override
    @Transactional(readOnly = true)
    public WorkspaceQuotaDto getWorkspaceQuota(String username, Long workspaceId) {
        Workspace workspace = getWorkspaceEntity(workspaceId);
        User user = getUser(username);

        if (!user.isSysAdmin() && !workspace.getOwner().getId().equals(user.getId()) &&
                !workspaceMemberRepository.existsByWorkspaceAndUserAndStatus(workspace, user, WorkspaceMemberStatus.ACTIVE)) {
            throw new WorkspaceAccessDeniedException("Access denied to workspace quota statistics");
        }

        int count = workspaceMemberRepository.countByWorkspace(workspace);
        double usagePct = workspace.getStorageQuota() > 0 ? ((double) workspace.getStorageUsed() / workspace.getStorageQuota()) * 100 : 0;

        return WorkspaceQuotaDto.builder()
                .workspaceId(workspaceId)
                .workspaceName(workspace.getName())
                .storageQuota(workspace.getStorageQuota())
                .storageUsed(workspace.getStorageUsed())
                .usagePercentage(usagePct)
                .memberLimit(workspace.getMemberLimit())
                .memberCount(count)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceActivityDto> getWorkspaceActivity(String username, Long workspaceId) {
        Workspace workspace = getWorkspaceEntity(workspaceId);
        User user = getUser(username);

        // Only manager, owner, or system admin can view activity audit logs
        Optional<WorkspaceMember> operatorMember = workspaceMemberRepository.findByWorkspaceAndUser(workspace, user);
        boolean isAuthorized = user.isSysAdmin() || workspace.getOwner().getId().equals(user.getId()) ||
                (operatorMember.isPresent() && operatorMember.get().getRole().hasAtLeast(WorkspaceRole.MANAGER));

        if (!isAuthorized) {
            throw new WorkspaceAccessDeniedException("Only managers, owners or admins can view activity logs");
        }

        return workspaceActivityService.getWorkspaceActivity(workspaceId);
    }

    @Override
    @Transactional
    public Workspace getOrCreatePersonalWorkspace(String username) {
        User user = getUser(username);
        Optional<Workspace> personalOpt = workspaceRepository.findByOwnerAndWorkspaceType(user, WorkspaceType.PERSONAL);
        if (personalOpt.isPresent()) {
            return personalOpt.get();
        }

        Workspace personal = Workspace.builder()
                .name(user.getUsername() + "'s Personal Workspace")
                .description("Default personal workspace")
                .owner(user)
                .workspaceType(WorkspaceType.PERSONAL)
                .storageQuota(5368709120L) // 5GB personal quota
                .storageUsed(0L)
                .memberLimit(1)
                .status(WorkspaceStatus.ACTIVE)
                .build();

        personal = workspaceRepository.save(personal);

        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(personal)
                .user(user)
                .role(WorkspaceRole.WORKSPACE_OWNER)
                .status(WorkspaceMemberStatus.ACTIVE)
                .build();
        workspaceMemberRepository.save(member);

        workspaceActivityService.logActivity(
                personal.getId(),
                user.getId(),
                ActivityType.WORKSPACE_CREATED,
                "Personal workspace auto-created"
        );

        return personal;
    }

    private WorkspaceDto mapToDto(Workspace workspace) {
        return WorkspaceDto.builder()
                .id(workspace.getId())
                .name(workspace.getName())
                .description(workspace.getDescription())
                .ownerUsername(workspace.getOwner().getUsername())
                .workspaceType(workspace.getWorkspaceType())
                .storageQuota(workspace.getStorageQuota())
                .storageUsed(workspace.getStorageUsed())
                .memberLimit(workspace.getMemberLimit())
                .status(workspace.getStatus())
                .createdAt(workspace.getCreatedAt())
                .updatedAt(workspace.getUpdatedAt())
                .build();
    }

    private WorkspaceMemberDto mapToDto(WorkspaceMember member) {
        return WorkspaceMemberDto.builder()
                .id(member.getId())
                .workspaceId(member.getWorkspace().getId())
                .userId(member.getUser().getId())
                .username(member.getUser().getUsername())
                .email(member.getUser().getEmail())
                .role(member.getRole())
                .status(member.getStatus())
                .joinedAt(member.getJoinedAt())
                .lastActive(member.getLastActive())
                .build();
    }
}
