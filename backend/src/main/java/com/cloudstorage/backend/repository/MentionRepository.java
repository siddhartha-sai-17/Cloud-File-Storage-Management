package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.Comment;
import com.cloudstorage.backend.entity.Mention;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MentionRepository extends JpaRepository<Mention, Long> {
    List<Mention> findByComment(Comment comment);
}
