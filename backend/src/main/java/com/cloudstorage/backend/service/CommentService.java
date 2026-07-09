package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.CommentDto;
import com.cloudstorage.backend.dto.CreateCommentRequest;
import com.cloudstorage.backend.dto.UpdateCommentRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommentService {

    CommentDto createComment(String username, Long fileId, CreateCommentRequest request);

    CommentDto editComment(String username, Long commentId, UpdateCommentRequest request);

    void deleteComment(String username, Long commentId);

    Page<CommentDto> getFileCommentThreads(String username, Long fileId, Pageable pageable);
}
