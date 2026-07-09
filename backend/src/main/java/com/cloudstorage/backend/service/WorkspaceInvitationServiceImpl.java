package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.*;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.exception.*;
import com.cloudstorage.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkspaceInvitationServiceImpl implements WorkspaceInvitationService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceInvitationRepository workspaceInvitationRepository;
    private final UserRepository userRepository;
    private final WorkspaceActivityService workspaceActivityService;
    private final AuthorizationCache authorizationCache;

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    @Override
    @Transactional
    public WorkspaceInvitationDto inviteMember(String username, Long workspaceId, WorkspaceInvitationDto.InviteRequest request) {
        User operator = getUser(username);
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new WorkspaceNotFoundException("Workspace not found: " + workspaceId));

        // Authorization: manager/owner/admin
        Optional<WorkspaceMember> operatorMember = workspaceMemberRepository.findByWorkspaceAndUser(workspace, operator);
        boolean isAuthorized = operator.isSysAdmin() || workspace.getOwner().getId().equals(operator.getId()) ||
                (operatorMember.isPresent() && operatorMember.get().getRole().hasAtLeast(WorkspaceRole.MANAGER));

        if (!isAuthorized) {
            throw new WorkspaceAccessDeniedException("Only managers or owners can send invitations");
        }

        // Check if user is already a member
        Optional<User> targetUserOpt = userRepository.findByEmail(request.getEmail());
        if (targetUserOpt.isPresent() && workspaceMemberRepository.existsByWorkspaceAndUser(workspace, targetUserOpt.get())) {
            throw new WorkspaceMemberAlreadyExistsException("User is already a member of this workspace");
        }

        // Check for duplicate pending invitations
        if (workspaceInvitationRepository.existsByWorkspaceAndEmailAndStatus(workspace, request.getEmail(), InvitationStatus.PENDING)) {
            throw new WorkspaceInvitationAlreadySentException("Pending invitation already exists for this email");
        }

        WorkspaceInvitation invitation = WorkspaceInvitation.builder()
                .workspace(workspace)
                .email(request.getEmail())
                .token(UUID.randomUUID().toString())
                .expiresAt(LocalDateTime.now().plusDays(7)) // 7 days expiry
                .status(InvitationStatus.PENDING)
                .createdBy(operator)
                .build();

        invitation = workspaceInvitationRepository.save(invitation);

        workspaceActivityService.logActivity(
                workspaceId,
                operator.getId(),
                ActivityType.MEMBER_INVITED,
                "Invited email: " + request.getEmail()
        );

        return mapToDto(invitation);
    }

    @Override
    @Transactional
    public WorkspaceMemberDto acceptInvitation(String username, String token) {
        User user = getUser(username);
        WorkspaceInvitation invitation = workspaceInvitationRepository.findByToken(token)
                .orElseThrow(() -> new WorkspaceInvitationInvalidException("Invalid invitation token"));

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new WorkspaceInvitationInvalidException("Invitation is no longer pending");
        }

        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            workspaceInvitationRepository.save(invitation);
            throw new WorkspaceInvitationExpiredException("Invitation token has expired");
        }

        if (!invitation.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw new WorkspaceAccessDeniedException("Invitation is registered for a different email address");
        }

        Workspace workspace = invitation.getWorkspace();

        // Check member limit
        int currentMembers = workspaceMemberRepository.countByWorkspace(workspace);
        if (currentMembers >= workspace.getMemberLimit()) {
            throw new WorkspaceQuotaExceededException("Workspace member limit reached: limit=" + workspace.getMemberLimit());
        }

        // Add member
        if (workspaceMemberRepository.existsByWorkspaceAndUser(workspace, user)) {
            invitation.setStatus(InvitationStatus.ACCEPTED);
            workspaceInvitationRepository.save(invitation);
            throw new WorkspaceMemberAlreadyExistsException("User is already a member of this workspace");
        }

        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspace)
                .user(user)
                .role(WorkspaceRole.VIEWER) // default role for accepted invitation
                .status(WorkspaceMemberStatus.ACTIVE)
                .build();

        member = workspaceMemberRepository.save(member);

        invitation.setStatus(InvitationStatus.ACCEPTED);
        workspaceInvitationRepository.save(invitation);

        authorizationCache.evictUserPermissions(username);

        workspaceActivityService.logActivity(
                workspace.getId(),
                user.getId(),
                ActivityType.MEMBER_JOINED,
                "Joined workspace via invitation"
        );

        return mapToMemberDto(member);
    }

    @Override
    @Transactional
    public void rejectInvitation(String username, String token) {
        User user = getUser(username);
        WorkspaceInvitation invitation = workspaceInvitationRepository.findByToken(token)
                .orElseThrow(() -> new WorkspaceInvitationInvalidException("Invalid invitation token"));

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new WorkspaceInvitationInvalidException("Invitation is no longer pending");
        }

        if (!invitation.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw new WorkspaceAccessDeniedException("Invitation is registered for a different email address");
        }

        invitation.setStatus(InvitationStatus.REJECTED);
        workspaceInvitationRepository.save(invitation);
    }

    @Override
    @Transactional
    public void cancelInvitation(String username, Long invitationId) {
        User operator = getUser(username);
        WorkspaceInvitation invitation = workspaceInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new WorkspaceInvitationInvalidException("Invitation not found: " + invitationId));

        Workspace workspace = invitation.getWorkspace();

        // Authorization: manager/owner/admin
        Optional<WorkspaceMember> operatorMember = workspaceMemberRepository.findByWorkspaceAndUser(workspace, operator);
        boolean isAuthorized = operator.isSysAdmin() || workspace.getOwner().getId().equals(operator.getId()) ||
                (operatorMember.isPresent() && operatorMember.get().getRole().hasAtLeast(WorkspaceRole.MANAGER));

        if (!isAuthorized) {
            throw new WorkspaceAccessDeniedException("Only managers or owners can cancel invitations");
        }

        invitation.setStatus(InvitationStatus.CANCELLED);
        workspaceInvitationRepository.save(invitation);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceInvitationDto> listInvitations(String username, Long workspaceId) {
        User operator = getUser(username);
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new WorkspaceNotFoundException("Workspace not found: " + workspaceId));

        // Authorization: any active member can list invitations
        if (!operator.isSysAdmin() && !workspace.getOwner().getId().equals(operator.getId()) &&
                !workspaceMemberRepository.existsByWorkspaceAndUserAndStatus(workspace, operator, WorkspaceMemberStatus.ACTIVE)) {
            throw new WorkspaceAccessDeniedException("Must be a member of the workspace to list invitations");
        }

        return workspaceInvitationRepository.findByWorkspace(workspace).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private WorkspaceInvitationDto mapToDto(WorkspaceInvitation invitation) {
        return WorkspaceInvitationDto.builder()
                .id(invitation.getId())
                .workspaceId(invitation.getWorkspace().getId())
                .email(invitation.getEmail())
                .token(invitation.getToken())
                .expiresAt(invitation.getExpiresAt())
                .status(invitation.getStatus())
                .createdByUsername(invitation.getCreatedBy().getUsername())
                .createdAt(invitation.getCreatedAt())
                .build();
    }

    private WorkspaceMemberDto mapToMemberDto(WorkspaceMember member) {
        return WorkspaceMemberDto.builder()
                .id(member.getId())
                .workspaceId(member.getWorkspace().getId())
                .username(member.getUser().getUsername())
                .email(member.getUser().getEmail())
                .role(member.getRole())
                .status(member.getStatus())
                .joinedAt(member.getJoinedAt())
                .lastActive(member.getLastActive())
                .build();
    }
}
