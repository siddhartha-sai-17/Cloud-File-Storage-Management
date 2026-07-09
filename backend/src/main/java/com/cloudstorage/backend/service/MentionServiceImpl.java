package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.AuditMetadata;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.repository.MentionRepository;
import com.cloudstorage.backend.repository.UserRepository;
import com.cloudstorage.backend.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class MentionServiceImpl implements MentionService {

    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final MentionRepository mentionRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    private static final Pattern MENTION_PATTERN = Pattern.compile("\\B@([a-zA-Z0-9_]{3,30})");

    @Override
    @Transactional
    public void parseAndProcessMentions(Comment comment) {
        String content = comment.getContent();
        if (content == null || content.isEmpty()) {
            return;
        }

        // 1. Extract usernames using Regex
        Set<String> extractedUsernames = new HashSet<>();
        Matcher matcher = MENTION_PATTERN.matcher(content);
        while (matcher.find()) {
            extractedUsernames.add(matcher.group(1));
        }

        // 2. Remove self-mentions
        extractedUsernames.remove(comment.getUser().getUsername());

        if (extractedUsernames.isEmpty()) {
            return;
        }

        // 3. Batch load target users
        List<User> targetUsers = userRepository.findByUsernameIn(extractedUsernames);

        for (User user : targetUsers) {
            // 4. Validate workspace membership
            boolean isMember = false;
            Workspace workspace = comment.getWorkspace();
            if (workspace == null) {
                // If it is personal/null workspace context, only allow mentioning the file owner
                isMember = comment.getFile().getUser().getId().equals(user.getId());
            } else {
                if (workspace.getWorkspaceType() == WorkspaceType.PERSONAL) {
                    isMember = workspace.getOwner().getId().equals(user.getId());
                } else {
                    isMember = workspaceMemberRepository.existsByWorkspaceAndUser(workspace, user);
                }
            }

            if (!isMember) {
                continue; // Ignore users who aren't workspace members
            }

            // 5. Store Mention
            Mention mention = Mention.builder()
                    .comment(comment)
                    .mentionedUser(user)
                    .read(false)
                    .build();
            mentionRepository.save(mention);

            // 6. Generate Notification
            notificationService.createNotification(
                    user.getId(),
                    workspace != null ? workspace.getId() : null,
                    NotificationType.MENTION,
                    "You were mentioned",
                    "@" + comment.getUser().getUsername() + " mentioned you in a comment on file: " + comment.getFile().getFilename(),
                    EntityType.COMMENT,
                    comment.getId()
            );

            // 7. Log Audit Event
            AuditMetadata metadata = AuditMetadata.builder()
                    .workspaceId(workspace != null ? workspace.getId() : null)
                    .fileId(comment.getFile().getId())
                    .build();

            auditService.logEvent(
                    workspace != null ? workspace.getId() : null,
                    comment.getUser().getId(),
                    comment.getUser().getUsername(),
                    AuditEventType.MENTION_CREATED,
                    EntityType.COMMENT,
                    comment.getId(),
                    "Mentioned user @" + user.getUsername() + " in comment",
                    "SUCCESS",
                    metadata
            );
        }
    }
}
