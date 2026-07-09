package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.exception.PermissionDeniedException;
import com.cloudstorage.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthorizationService {

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final FilePermissionRepository filePermissionRepository;
    private final WorkspacePermissionResolver workspacePermissionResolver;
    private final AuthorizationCache authorizationCache;
    private final ShareLinkRepository shareLinkRepository;
    private final SharedUserRepository sharedUserRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new PermissionDeniedException("User not found: " + username));
    }

    private String getPermissionName(String action) {
        switch (action.toUpperCase()) {
            case "READ":
            case "DOWNLOAD":
                return "FILE_READ";
            case "WRITE":
                return "FILE_WRITE";
            case "DELETE":
                return "FILE_DELETE";
            case "UPLOAD":
                return "UPLOAD_CREATE";
            case "RESTORE":
                return "FILE_RESTORE";
            case "VERSION":
                return "FILE_VERSION";
            case "OCR":
                return "OCR_VIEW";
            case "SEARCH":
                return "SEARCH_VIEW";
            case "SHARE":
                return "FILE_SHARE";
            case "ADMIN":
                return "WORKSPACE_ADMIN";
            default:
                return action;
        }
    }

    private boolean hasSharedPermission(PermissionLevel granted, String permission) {
        if (granted == null) return false;
        switch (permission.toUpperCase()) {
            case "FILE_READ":
            case "OCR_VIEW":
            case "SEARCH_VIEW":
                return true; // VIEW is enough for read/preview
            case "UPLOAD_CREATE":
                return granted == PermissionLevel.UPLOAD || granted == PermissionLevel.EDIT || granted == PermissionLevel.MANAGE;
            case "FILE_WRITE":
            case "FILE_VERSION":
            case "COMMENT":
                return granted == PermissionLevel.EDIT || granted == PermissionLevel.MANAGE;
            case "FILE_DELETE":
            case "FILE_SHARE":
            case "WORKSPACE_ADMIN":
                return granted == PermissionLevel.MANAGE;
            default:
                return false;
        }
    }

    @Transactional(readOnly = true)
    public boolean isAuthorizedForWorkspace(String username, Long workspaceId, String action) {
        User user = getUser(username);
        if (user.isSysAdmin()) {
            return true;
        }

        String permission = getPermissionName(action);

        Boolean cached = authorizationCache.get(username, workspaceId, permission);
        if (cached != null) {
            return cached;
        }

        Workspace workspace = workspaceRepository.findById(workspaceId).orElse(null);
        if (workspace == null) {
            authorizationCache.put(username, workspaceId, permission, false);
            return false;
        }

        boolean result = workspacePermissionResolver.hasPermission(workspace, user, permission);
        if (result) {
            authorizationCache.put(username, workspaceId, permission, true);
            return true;
        }

        // Check workspace sharing (private)
        List<SharedUser> sharedWorkspaceUsers = sharedUserRepository.findByUserUsername(username);
        for (SharedUser su : sharedWorkspaceUsers) {
            ShareLink link = su.getShareLink();
            if (link.isActive() && (link.getExpiresAt() == null || link.getExpiresAt().isAfter(LocalDateTime.now()))) {
                if (link.getWorkspace() != null && link.getWorkspace().getId().equals(workspaceId)) {
                    if (hasSharedPermission(su.getPermission(), permission)) {
                        authorizationCache.put(username, workspaceId, permission, true);
                        return true;
                    }
                }
            }
        }

        // Check internal workspace sharing
        List<ShareLink> internalWorkspaceLinks = shareLinkRepository.findByWorkspaceId(workspaceId);
        for (ShareLink link : internalWorkspaceLinks) {
            if (link.isActive() && link.getShareType() == ShareType.INTERNAL) {
                if (link.getExpiresAt() == null || link.getExpiresAt().isAfter(LocalDateTime.now())) {
                    if (hasSharedPermission(link.getPermission(), permission)) {
                        authorizationCache.put(username, workspaceId, permission, true);
                        return true;
                    }
                }
            }
        }

        authorizationCache.put(username, workspaceId, permission, false);
        return false;
    }

    @Transactional(readOnly = true)
    public boolean isAuthorizedForFile(String username, Long fileId, String action) {
        User user = getUser(username);
        if (user.isSysAdmin()) {
            return true;
        }

        String permission = getPermissionName(action);

        Boolean cached = authorizationCache.getFilePerm(username, fileId, permission);
        if (cached != null) {
            return cached;
        }

        FileMetadata file = fileRepository.findById(fileId).orElse(null);
        if (file == null) {
            authorizationCache.putFilePerm(username, fileId, permission, false);
            return false;
        }

        if (file.getUser().getId().equals(user.getId())) {
            authorizationCache.putFilePerm(username, fileId, permission, true);
            return true;
        }

        if (file.getWorkspace() != null) {
            if (workspacePermissionResolver.hasPermission(file.getWorkspace(), user, permission)) {
                authorizationCache.putFilePerm(username, fileId, permission, true);
                return true;
            }
        }

        Optional<FilePermission> explicitPerm = filePermissionRepository.findByFileAndUserAndPermission(file, user, permission);
        if (explicitPerm.isPresent()) {
            FilePermission fp = explicitPerm.get();
            if (fp.getExpiresAt() == null || fp.getExpiresAt().isAfter(LocalDateTime.now())) {
                authorizationCache.putFilePerm(username, fileId, permission, true);
                return true;
            }
        }

        if (file.getFolder() != null) {
            Folder folder = file.getFolder();
            if (folder.getWorkspace() != null) {
                if (workspacePermissionResolver.hasPermission(folder.getWorkspace(), user, permission)) {
                    authorizationCache.putFilePerm(username, fileId, permission, true);
                    return true;
                }
            }
        }

        // Check if there is an active ShareLink shared with this user (via SharedUser)
        List<SharedUser> sharedUsers = sharedUserRepository.findByUserUsername(username);
        for (SharedUser su : sharedUsers) {
            ShareLink link = su.getShareLink();
            if (link.isActive() && (link.getExpiresAt() == null || link.getExpiresAt().isAfter(LocalDateTime.now()))) {
                boolean fileMatches = (link.getFileMetadata() != null && link.getFileMetadata().getId().equals(fileId));
                boolean workspaceMatches = (link.getWorkspace() != null && file.getWorkspace() != null && link.getWorkspace().getId().equals(file.getWorkspace().getId()));
                
                if (fileMatches || workspaceMatches) {
                    if (hasSharedPermission(su.getPermission(), permission)) {
                        authorizationCache.putFilePerm(username, fileId, permission, true);
                        return true;
                    }
                }
            }
        }
        
        // Check if there is an active ShareLink of type INTERNAL (shared with all authenticated users)
        List<ShareLink> internalLinks = shareLinkRepository.findByFileMetadataId(fileId);
        for (ShareLink link : internalLinks) {
            if (link.isActive() && link.getShareType() == ShareType.INTERNAL) {
                if (link.getExpiresAt() == null || link.getExpiresAt().isAfter(LocalDateTime.now())) {
                    if (hasSharedPermission(link.getPermission(), permission)) {
                        authorizationCache.putFilePerm(username, fileId, permission, true);
                        return true;
                    }
                }
            }
        }
        if (file.getWorkspace() != null) {
            List<ShareLink> internalWsLinks = shareLinkRepository.findByWorkspaceId(file.getWorkspace().getId());
            for (ShareLink link : internalWsLinks) {
                if (link.isActive() && link.getShareType() == ShareType.INTERNAL) {
                    if (link.getExpiresAt() == null || link.getExpiresAt().isAfter(LocalDateTime.now())) {
                        if (hasSharedPermission(link.getPermission(), permission)) {
                            authorizationCache.putFilePerm(username, fileId, permission, true);
                            return true;
                        }
                    }
                }
            }
        }

        authorizationCache.putFilePerm(username, fileId, permission, false);
        return false;
    }

    @Transactional(readOnly = true)
    public boolean isAuthorizedForFolder(String username, Long folderId, String action) {
        User user = getUser(username);
        if (user.isSysAdmin()) {
            return true;
        }

        String permission = getPermissionName(action);

        Folder folder = folderRepository.findById(folderId).orElse(null);
        if (folder == null) {
            return false;
        }

        if (folder.getUser().getId().equals(user.getId())) {
            return true;
        }

        if (folder.getWorkspace() != null) {
            if (workspacePermissionResolver.hasPermission(folder.getWorkspace(), user, permission)) {
                return true;
            }
            // Check workspace sharing
            Long workspaceId = folder.getWorkspace().getId();
            List<SharedUser> sharedWorkspaceUsers = sharedUserRepository.findByUserUsername(username);
            for (SharedUser su : sharedWorkspaceUsers) {
                ShareLink link = su.getShareLink();
                if (link.isActive() && (link.getExpiresAt() == null || link.getExpiresAt().isAfter(LocalDateTime.now()))) {
                    if (link.getWorkspace() != null && link.getWorkspace().getId().equals(workspaceId)) {
                        if (hasSharedPermission(su.getPermission(), permission)) {
                            return true;
                        }
                    }
                }
            }
            List<ShareLink> internalWorkspaceLinks = shareLinkRepository.findByWorkspaceId(workspaceId);
            for (ShareLink link : internalWorkspaceLinks) {
                if (link.isActive() && link.getShareType() == ShareType.INTERNAL) {
                    if (link.getExpiresAt() == null || link.getExpiresAt().isAfter(LocalDateTime.now())) {
                        if (hasSharedPermission(link.getPermission(), permission)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    public void checkWorkspacePermission(String username, Long workspaceId, String action) {
        if (!isAuthorizedForWorkspace(username, workspaceId, action)) {
            throw new PermissionDeniedException("User " + username + " is not authorized to perform " + action + " on workspace " + workspaceId);
        }
    }

    public void checkFilePermission(String username, Long fileId, String action) {
        if (!isAuthorizedForFile(username, fileId, action)) {
            throw new PermissionDeniedException("User " + username + " is not authorized to perform " + action + " on file " + fileId);
        }
    }

    public void checkFolderPermission(String username, Long folderId, String action) {
        if (!isAuthorizedForFolder(username, folderId, action)) {
            throw new PermissionDeniedException("User " + username + " is not authorized to perform " + action + " on folder " + folderId);
        }
    }
}
