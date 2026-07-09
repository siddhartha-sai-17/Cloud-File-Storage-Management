package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.StatisticsSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface StatisticsSnapshotRepository extends JpaRepository<StatisticsSnapshot, Long> {
    List<StatisticsSnapshot> findBySnapshotDate(LocalDate date);
}
