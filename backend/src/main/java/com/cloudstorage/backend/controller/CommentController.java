package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.CommentDto;
import com.cloudstorage.backend.dto.CreateCommentRequest;
import com.cloudstorage.backend.dto.UpdateCommentRequest;
import com.cloudstorage.backend.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping({"/api/workspaces/{workspaceId}/files/{fileId}/comments", "/api/files/{fileId}/comments"})
    public ResponseEntity<CommentDto> addComment(
            @PathVariable(required = false) Long workspaceId,
            @PathVariable Long fileId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        CommentDto comment = commentService.createComment(userDetails.getUsername(), fileId, request);
        return ResponseEntity.ok(comment);
    }

    @PutMapping({"/api/workspaces/{workspaceId}/files/{fileId}/comments/{commentId}", "/api/comments/{commentId}"})
    public ResponseEntity<CommentDto> editComment(
            @PathVariable(required = false) Long workspaceId,
            @PathVariable(required = false) Long fileId,
            @PathVariable Long commentId,
            @Valid @RequestBody UpdateCommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        CommentDto comment = commentService.editComment(userDetails.getUsername(), commentId, request);
        return ResponseEntity.ok(comment);
    }

    @DeleteMapping({"/api/workspaces/{workspaceId}/files/{fileId}/comments/{commentId}", "/api/comments/{commentId}"})
    public ResponseEntity<Void> deleteComment(
            @PathVariable(required = false) Long workspaceId,
            @PathVariable(required = false) Long fileId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal UserDetails userDetails) {

        commentService.deleteComment(userDetails.getUsername(), commentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping({"/api/workspaces/{workspaceId}/files/{fileId}/comments", "/api/files/{fileId}/comments"})
    public ResponseEntity<Page<CommentDto>> getFileComments(
            @PathVariable(required = false) Long workspaceId,
            @PathVariable Long fileId,
            Pageable pageable,
            @AuthenticationPrincipal UserDetails userDetails) {

        Page<CommentDto> comments = commentService.getFileCommentThreads(userDetails.getUsername(), fileId, pageable);
        return ResponseEntity.ok(comments);
    }
}
