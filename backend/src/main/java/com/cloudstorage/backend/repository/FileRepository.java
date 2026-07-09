package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.Folder;
import com.cloudstorage.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;

public interface FileRepository extends JpaRepository<FileMetadata, Long>, JpaSpecificationExecutor<FileMetadata> {
    List<FileMetadata> findByUserAndFolderIsNullAndDeletedFalse(User user);

    List<FileMetadata> findByUserAndFolderAndDeletedFalse(User user, Folder folder);

    List<FileMetadata> findByUserAndDeletedTrue(User user);

    List<FileMetadata> findByUserAndStarredTrueAndDeletedFalse(User user);

    java.util.Optional<FileMetadata> findFirstBySha256AndDeletedFalse(String sha256);

    java.util.Optional<FileMetadata> findByUserAndFilenameAndFolderIsNullAndDeletedFalse(User user, String filename);

    java.util.Optional<FileMetadata> findByUserAndFilenameAndFolderAndDeletedFalse(User user, String filename, Folder folder);

    List<FileMetadata> findByUser_UsernameAndDeletedFalse(String username);

    List<FileMetadata> findByUserAndWorkspaceIsNull(User user);

    List<FileMetadata> findByWorkspaceAndFolderIsNullAndDeletedFalse(com.cloudstorage.backend.entity.Workspace workspace);

    List<FileMetadata> findByWorkspaceAndFolderAndDeletedFalse(com.cloudstorage.backend.entity.Workspace workspace, Folder folder);

    List<FileMetadata> findByWorkspaceAndDeletedTrue(com.cloudstorage.backend.entity.Workspace workspace);

    List<FileMetadata> findByWorkspaceAndStarredTrueAndDeletedFalse(com.cloudstorage.backend.entity.Workspace workspace);
}

