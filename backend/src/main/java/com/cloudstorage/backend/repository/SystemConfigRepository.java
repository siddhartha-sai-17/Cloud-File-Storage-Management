package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.SystemConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SystemConfigRepository extends JpaRepository<SystemConfig, String> {
}
