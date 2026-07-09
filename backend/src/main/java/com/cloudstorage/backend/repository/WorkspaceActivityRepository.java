package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.Workspace;
import com.cloudstorage.backend.entity.WorkspaceActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkspaceActivityRepository extends JpaRepository<WorkspaceActivity, Long> {

    List<WorkspaceActivity> findByWorkspaceOrderByCreatedAtDesc(Workspace workspace);
}
