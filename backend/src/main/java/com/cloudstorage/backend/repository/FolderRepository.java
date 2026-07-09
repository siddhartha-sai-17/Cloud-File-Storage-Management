package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.Folder;
import com.cloudstorage.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByUserAndParentFolderIsNullAndDeletedFalse(User user);

    List<Folder> findByUserAndParentFolderAndDeletedFalse(User user, Folder parentFolder);

    List<Folder> findByUserAndDeletedTrue(User user);

    List<Folder> findByUserAndWorkspaceIsNull(User user);

    List<Folder> findByWorkspaceAndParentFolderIsNullAndDeletedFalse(com.cloudstorage.backend.entity.Workspace workspace);

    List<Folder> findByWorkspaceAndParentFolderAndDeletedFalse(com.cloudstorage.backend.entity.Workspace workspace, Folder parentFolder);

    List<Folder> findByWorkspaceAndDeletedTrue(com.cloudstorage.backend.entity.Workspace workspace);
}

