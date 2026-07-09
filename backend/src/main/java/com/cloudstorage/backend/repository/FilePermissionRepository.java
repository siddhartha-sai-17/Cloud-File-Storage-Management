package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.FileMetadata;
import com.cloudstorage.backend.entity.FilePermission;
import com.cloudstorage.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FilePermissionRepository extends JpaRepository<FilePermission, Long> {

    List<FilePermission> findByFile(FileMetadata file);

    List<FilePermission> findByUser(User user);

    Optional<FilePermission> findByFileAndUserAndPermission(FileMetadata file, User user, String permission);

    List<FilePermission> findByFileAndUser(FileMetadata file, User user);

    @Modifying
    @Query("DELETE FROM FilePermission fp WHERE fp.expiresAt IS NOT NULL AND fp.expiresAt < :now")
    int deleteExpiredPermissions(@Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM FilePermission fp WHERE fp.file = :file")
    void deleteByFile(@Param("file") FileMetadata file);
}
