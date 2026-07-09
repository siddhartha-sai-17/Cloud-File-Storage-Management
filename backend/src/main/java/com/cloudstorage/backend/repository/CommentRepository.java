package com.cloudstorage.backend.repository;

import com.cloudstorage.backend.entity.Comment;
import com.cloudstorage.backend.entity.FileMetadata;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query(value = "SELECT c FROM Comment c LEFT JOIN FETCH c.user WHERE c.file = :file AND c.parentComment IS NULL",
           countQuery = "SELECT count(c) FROM Comment c WHERE c.file = :file AND c.parentComment IS NULL")
    Page<Comment> findRootCommentsByFile(@Param("file") FileMetadata file, Pageable pageable);

    @Query("SELECT c FROM Comment c LEFT JOIN FETCH c.user WHERE c.file.id = :fileId")
    List<Comment> findAllCommentsByFileId(@Param("fileId") Long fileId);

    @Query("SELECT c FROM Comment c WHERE c.content LIKE %:keyword% AND c.deleted = false")
    List<Comment> searchByKeyword(@Param("keyword") String keyword);
}
