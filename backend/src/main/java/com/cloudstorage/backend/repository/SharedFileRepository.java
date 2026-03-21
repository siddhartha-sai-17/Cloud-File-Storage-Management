package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.SharedFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SharedFileRepository extends JpaRepository<SharedFile, Long> {
    Optional<SharedFile> findByToken(String token);

    List<SharedFile> findByFile_User_Username(String username);
}
