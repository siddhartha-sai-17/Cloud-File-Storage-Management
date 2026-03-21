package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.Folder;
import com.cloudstorage.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByUserAndParentFolderIsNull(User user);

    List<Folder> findByUserAndParentFolder(User user, Folder parentFolder);
}
