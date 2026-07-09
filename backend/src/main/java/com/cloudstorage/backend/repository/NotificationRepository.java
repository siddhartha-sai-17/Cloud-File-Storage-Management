package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.Notification;
import com.cloudstorage.backend.entity.User;
import com.cloudstorage.backend.entity.Workspace;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUser(User user, Pageable pageable);

    Page<Notification> findByUserAndWorkspace(User user, Workspace workspace, Pageable pageable);

    List<Notification> findByUserAndReadFalse(User user);

    List<Notification> findByUserAndWorkspaceAndReadFalse(User user, Workspace workspace);

    long countByUserAndReadFalse(User user);

    long countByUserAndWorkspaceAndReadFalse(User user, Workspace workspace);
}
