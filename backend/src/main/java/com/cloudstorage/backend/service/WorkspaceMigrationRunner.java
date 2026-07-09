package com.cloudstorage.backend.service;

import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class WorkspaceMigrationRunner implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(WorkspaceMigrationRunner.class);

    private final UserRepository userRepository;
    private final WorkspaceService workspaceService;
    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UploadSessionRepository uploadSessionRepository;
    private final WorkspaceQuotaService workspaceQuotaService;

    @Override
    public void run(String... args) throws Exception {
        logger.info("Starting personal workspace migration...");
        try {
            migrateAllUsers();
            logger.info("Personal workspace migration completed successfully.");
        } catch (Exception e) {
            logger.error("Error during personal workspace migration", e);
        }
    }

    @Transactional
    public void migrateAllUsers() {
        List<User> users = userRepository.findAll();
        for (User user : users) {
            Workspace personal = workspaceService.getOrCreatePersonalWorkspace(user.getUsername());
            
            int filesMigrated = migrateFilesForUser(user, personal);
            int foldersMigrated = migrateFoldersForUser(user, personal);
            int sessionsMigrated = migrateSessionsForUser(user, personal);

            if (filesMigrated > 0 || foldersMigrated > 0 || sessionsMigrated > 0) {
                logger.info("Migrated user {}: {} files, {} folders, {} upload sessions to personal workspace {}",
                        user.getUsername(), filesMigrated, foldersMigrated, sessionsMigrated, personal.getId());
            }

            workspaceQuotaService.recalculateWorkspaceStorage(personal.getId());
        }
    }

    private int migrateFilesForUser(User user, Workspace workspace) {
        List<FileMetadata> files = fileRepository.findByUserAndWorkspaceIsNull(user);
        for (FileMetadata file : files) {
            file.setWorkspace(workspace);
        }
        fileRepository.saveAll(files);
        return files.size();
    }

    private int migrateFoldersForUser(User user, Workspace workspace) {
        List<Folder> folders = folderRepository.findByUserAndWorkspaceIsNull(user);
        for (Folder folder : folders) {
            folder.setWorkspace(workspace);
        }
        folderRepository.saveAll(folders);
        return folders.size();
    }

    private int migrateSessionsForUser(User user, Workspace workspace) {
        List<UploadSession> sessions = uploadSessionRepository.findByUserAndWorkspaceIdIsNull(user);
        for (UploadSession session : sessions) {
            session.setWorkspaceId(workspace.getId());
        }
        uploadSessionRepository.saveAll(sessions);
        return sessions.size();
    }
}
