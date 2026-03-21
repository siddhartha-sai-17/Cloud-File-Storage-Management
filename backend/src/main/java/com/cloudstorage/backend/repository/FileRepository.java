package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.Folder;
import com.cloudstorage.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FileRepository extends JpaRepository<FileMetadata, Long> {
    List<FileMetadata> findByUserAndFolderIsNull(User user);

    List<FileMetadata> findByUserAndFolder(User user, Folder folder);
}
