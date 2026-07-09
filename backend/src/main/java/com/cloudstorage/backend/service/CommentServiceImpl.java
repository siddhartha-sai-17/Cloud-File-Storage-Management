package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.AuditMetadata;
import com.cloudstorage.backend.dto.CommentDto;
import com.cloudstorage.backend.dto.CreateCommentRequest;
import com.cloudstorage.backend.dto.UpdateCommentRequest;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.exception.PermissionDeniedException;
import com.cloudstorage.backend.repository.CommentRepository;
import com.cloudstorage.backend.repository.FileRepository;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;
    private final MentionService mentionService;

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    private FileMetadata getFile(Long fileId) {
        return fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found: " + fileId));
    }

    private Comment getComment(Long commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found: " + commentId));
    }

    private WorkspaceRole getWorkspaceRole(Workspace workspace, User user) {
        if (workspace == null) {
            return WorkspaceRole.GUEST;
        }
        if (workspace.getOwner().getId().equals(user.getId())) {
            return WorkspaceRole.WORKSPACE_OWNER;
        }
        return workspaceMemberRepository.findByWorkspaceAndUser(workspace, user)
                .map(WorkspaceMember::getRole)
                .orElse(WorkspaceRole.GUEST);
    }

    private void validateWritePermission(User user, FileMetadata file) {
        if (user.isSysAdmin()) {
            return;
        }
        Workspace workspace = file.getWorkspace();
        if (workspace != null) {
            if (workspace.getWorkspaceType() == WorkspaceType.PERSONAL) {
                if (!workspace.getOwner().getId().equals(user.getId())) {
                    throw new PermissionDeniedException("Access denied to personal workspace");
                }
            } else {
                WorkspaceRole role = getWorkspaceRole(workspace, user);
                if (!role.hasAtLeast(WorkspaceRole.EDITOR)) {
                    throw new PermissionDeniedException("Only editors or managers can write comments");
                }
            }
        } else {
            if (!file.getUser().getId().equals(user.getId())) {
                throw new PermissionDeniedException("Access denied to file");
            }
        }
    }

    private void validateReadPermission(User user, FileMetadata file) {
        if (user.isSysAdmin()) {
            return;
        }
        authorizationService.checkFilePermission(user.getUsername(), file.getId(), "READ");
    }

    private String sanitizeAndValidate(String content) {
        if (content == null || content.trim().isEmpty()) {
            throw new RuntimeException("Comment content cannot be empty");
        }
        if (content.length() > 5000) {
            throw new RuntimeException("Comment content exceeds maximum length of 5000 characters");
        }
        // HTML escaping for XSS protection
        return HtmlUtils.htmlEscape(content.trim());
    }

    @Override
    @Transactional
    public CommentDto createComment(String username, Long fileId, CreateCommentRequest request) {
        User user = getUser(username);
        FileMetadata file = getFile(fileId);
        validateWritePermission(user, file);

        String sanitizedContent = sanitizeAndValidate(request.getContent());

        Comment parent = null;
        if (request.getParentCommentId() != null) {
            parent = getComment(request.getParentCommentId());
            if (!parent.getFile().getId().equals(fileId)) {
                throw new RuntimeException("Parent comment does not belong to the requested file");
            }
        }

        Comment comment = Comment.builder()
                .file(file)
                .workspace(file.getWorkspace())
                .user(user)
                .parentComment(parent)
                .content(sanitizedContent)
                .edited(false)
                .deleted(false)
                .build();

        comment = commentRepository.save(comment);

        // Process @mentions
        mentionService.parseAndProcessMentions(comment);

        // Centralized audit logging
        AuditMetadata metadata = AuditMetadata.builder()
                .workspaceId(file.getWorkspace() != null ? file.getWorkspace().getId() : null)
                .fileId(fileId)
                .build();
        auditService.logEvent(
                file.getWorkspace() != null ? file.getWorkspace().getId() : null,
                user.getId(),
                username,
                AuditEventType.COMMENT_CREATED,
                EntityType.COMMENT,
                comment.getId(),
                "Comment created on file " + file.getFilename(),
                "SUCCESS",
                metadata
        );

        return mapToDtoRecursive(comment);
    }

    @Override
    @Transactional
    public CommentDto editComment(String username, Long commentId, UpdateCommentRequest request) {
        User user = getUser(username);
        Comment comment = getComment(commentId);
        FileMetadata file = comment.getFile();

        // Validate edit permission: workspace manager/owner/sysadmin OR author who is at least an editor
        boolean isAuthor = comment.getUser().getId().equals(user.getId());
        WorkspaceRole role = getWorkspaceRole(file.getWorkspace(), user);
        boolean canEdit = user.isSysAdmin() || 
                          role.hasAtLeast(WorkspaceRole.MANAGER) || 
                          (isAuthor && role.hasAtLeast(WorkspaceRole.EDITOR));

        if (!canEdit) {
            throw new PermissionDeniedException("You do not have permission to edit this comment");
        }

        String sanitizedContent = sanitizeAndValidate(request.getContent());

        comment.setContent(sanitizedContent);
        comment.setEdited(true);
        comment = commentRepository.save(comment);

        // Process mentions for the edited content
        mentionService.parseAndProcessMentions(comment);

        AuditMetadata metadata = AuditMetadata.builder()
                .workspaceId(file.getWorkspace() != null ? file.getWorkspace().getId() : null)
                .fileId(file.getId())
                .build();
        auditService.logEvent(
                file.getWorkspace() != null ? file.getWorkspace().getId() : null,
                user.getId(),
                username,
                AuditEventType.COMMENT_UPDATED,
                EntityType.COMMENT,
                comment.getId(),
                "Comment edited on file " + file.getFilename(),
                "SUCCESS",
                metadata
        );

        return mapToDtoRecursive(comment);
    }

    @Override
    @Transactional
    public void deleteComment(String username, Long commentId) {
        User user = getUser(username);
        Comment comment = getComment(commentId);
        FileMetadata file = comment.getFile();

        // Validate delete permission: manager/owner/sysadmin OR author
        boolean isAuthor = comment.getUser().getId().equals(user.getId());
        WorkspaceRole role = getWorkspaceRole(file.getWorkspace(), user);
        boolean canDelete = user.isSysAdmin() || 
                            role.hasAtLeast(WorkspaceRole.MANAGER) || 
                            (isAuthor && role.hasAtLeast(WorkspaceRole.EDITOR));

        if (!canDelete) {
            throw new PermissionDeniedException("You do not have permission to delete this comment");
        }

        // Soft deletion
        comment.setDeleted(true);
        comment.setContent("This comment has been deleted.");
        commentRepository.save(comment);

        AuditMetadata metadata = AuditMetadata.builder()
                .workspaceId(file.getWorkspace() != null ? file.getWorkspace().getId() : null)
                .fileId(file.getId())
                .build();
        auditService.logEvent(
                file.getWorkspace() != null ? file.getWorkspace().getId() : null,
                user.getId(),
                username,
                AuditEventType.COMMENT_DELETED,
                EntityType.COMMENT,
                comment.getId(),
                "Comment deleted on file " + file.getFilename(),
                "SUCCESS",
                metadata
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CommentDto> getFileCommentThreads(String username, Long fileId, Pageable pageable) {
        User user = getUser(username);
        FileMetadata file = getFile(fileId);
        validateReadPermission(user, file);

        // Fetch all comments in a single query to prevent N+1 queries
        List<Comment> allComments = commentRepository.findAllCommentsByFileId(fileId);

        // Construct tree structures in memory
        Map<Long, CommentDto> dtoMap = new HashMap<>();
        List<CommentDto> roots = new ArrayList<>();

        // Map all comments to DTOs
        for (Comment c : allComments) {
            CommentDto dto = mapToDto(c);
            dtoMap.put(c.getId(), dto);
            if (c.getParentComment() == null) {
                roots.add(dto);
            }
        }

        // Populate replies recursively in memory
        for (Comment c : allComments) {
            if (c.getParentComment() != null) {
                CommentDto parentDto = dtoMap.get(c.getParentComment().getId());
                if (parentDto != null) {
                    parentDto.getReplies().add(dtoMap.get(c.getId()));
                }
            }
        }

        // Paginate the root comment list
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), roots.size());
        List<CommentDto> paginatedRoots = new ArrayList<>();
        if (start < roots.size()) {
            paginatedRoots = roots.subList(start, end);
        }

        return new PageImpl<>(paginatedRoots, pageable, roots.size());
    }

    private CommentDto mapToDto(Comment c) {
        return CommentDto.builder()
                .id(c.getId())
                .fileId(c.getFile().getId())
                .workspaceId(c.getWorkspace() != null ? c.getWorkspace().getId() : null)
                .userId(c.getUser().getId())
                .username(c.getUser().getUsername())
                .parentCommentId(c.getParentComment() != null ? c.getParentComment().getId() : null)
                .content(c.getContent())
                .edited(c.isEdited())
                .deleted(c.isDeleted())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .replies(new ArrayList<>())
                .build();
    }

    private CommentDto mapToDtoRecursive(Comment c) {
        CommentDto dto = mapToDto(c);
        if (c.getReplies() != null) {
            dto.setReplies(c.getReplies().stream()
                    .map(this::mapToDtoRecursive)
                    .collect(Collectors.toList()));
        }
        return dto;
    }
}
