package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.exception.PermissionDeniedException;
import com.cloudstorage.backend.repository.SharedUserRepository;
import com.cloudstorage.backend.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ShareValidationService {

    private final SharedUserRepository sharedUserRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final PasswordEncoder passwordEncoder;

    public void validateLink(ShareLink shareLink) {
        if (shareLink == null) {
            throw new PermissionDeniedException("Share link not found");
        }
        if (!shareLink.isActive()) {
            throw new PermissionDeniedException("Share link is inactive or has been revoked");
        }
        if (shareLink.getExpiresAt() != null && shareLink.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new PermissionDeniedException("Share link has expired");
        }
        if (shareLink.getDownloadLimit() != null && shareLink.getDownloadCount() >= shareLink.getDownloadLimit()) {
            throw new PermissionDeniedException("Download limit reached for this share link");
        }
        if (shareLink.getViewLimit() != null && shareLink.getViewCount() >= shareLink.getViewLimit()) {
            throw new PermissionDeniedException("View limit reached for this share link");
        }
    }

    public void validatePassword(ShareLink shareLink, String password) {
        if (shareLink.getPasswordHash() != null) {
            if (password == null || password.trim().isEmpty()) {
                throw new PermissionDeniedException("Password is required for this share link");
            }
            if (!passwordEncoder.matches(password, shareLink.getPasswordHash())) {
                throw new PermissionDeniedException("Invalid password provided for this share link");
            }
        }
    }

    public void validateUserPermission(ShareLink shareLink, User user) {
        // Owner/Creator of the share has full access
        if (user != null && shareLink.getCreatedBy() != null && shareLink.getCreatedBy().getId().equals(user.getId())) {
            return;
        }

        // Sysadmin has full access
        if (user != null && user.isSysAdmin()) {
            return;
        }

        switch (shareLink.getShareType()) {
            case PUBLIC:
            case ANONYMOUS:
                // Anyone can access (if they pass password/limits validation)
                return;

            case INTERNAL:
                // User must be authenticated (non-null)
                if (user == null) {
                    throw new PermissionDeniedException("Authentication is required to access this internal share");
                }
                return;

            case PRIVATE:
                // User must be explicitly listed in shared_users
                if (user == null) {
                    throw new PermissionDeniedException("Authentication is required to access this private share");
                }
                SharedUser sharedUser = sharedUserRepository.findByShareLinkAndUser(shareLink, user)
                        .orElseThrow(() -> new PermissionDeniedException("You do not have permission to access this private share"));
                // We could also check if the sharedUser accepted the invitation or just let them access it directly
                return;

            default:
                throw new PermissionDeniedException("Unsupported share type");
        }
    }

    public void validateWorkspaceMembership(ShareLink shareLink, User user) {
        // If workspace sharing, the user must be a member of the workspace for INTERNAL/PRIVATE workspace shares
        if (shareLink.getWorkspace() != null) {
            if (shareLink.getShareType() == ShareType.PRIVATE || shareLink.getShareType() == ShareType.INTERNAL) {
                if (user == null) {
                    throw new PermissionDeniedException("Authentication is required to access this workspace share");
                }
                if (user.isSysAdmin()) {
                    return;
                }
                boolean isMember = workspaceMemberRepository.existsByWorkspaceAndUser(shareLink.getWorkspace(), user);
                if (!isMember) {
                    throw new PermissionDeniedException("You are not a member of the shared workspace");
                }
            }
        }
    }
}
