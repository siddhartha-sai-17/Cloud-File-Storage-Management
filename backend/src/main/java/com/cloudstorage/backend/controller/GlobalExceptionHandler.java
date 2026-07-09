package com.cloudstorage.backend.controller;

import com.cloudstorage.backend.dto.ApiErrorCode;
import com.cloudstorage.backend.dto.ErrorResponse;
import com.cloudstorage.backend.exception.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private ErrorResponse buildErrorResponse(HttpStatus status, String message, ApiErrorCode errorCode, HttpServletRequest request) {
        String reqId = UUID.randomUUID().toString();
        String traceId = UUID.randomUUID().toString();
        return ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(message) // Backward compatibility
                .message(message)
                .errorCode(errorCode)
                .requestId(reqId)
                .traceId(traceId)
                .path(request.getRequestURI())
                .build();
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ErrorResponse.ValidationError> validationErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> ErrorResponse.ValidationError.builder()
                        .field(fe.getField())
                        .message(fe.getDefaultMessage())
                        .rejectedValue(fe.getRejectedValue())
                        .build())
                .collect(Collectors.toList());

        String message = "Validation failed: " + ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + " " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));

        ErrorResponse err = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(message)
                .message(message)
                .errorCode(ApiErrorCode.VALIDATION_ERROR)
                .requestId(UUID.randomUUID().toString())
                .traceId(UUID.randomUUID().toString())
                .path(request.getRequestURI())
                .validationErrors(validationErrors)
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }

    @ExceptionHandler(UploadSessionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(UploadSessionNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), ApiErrorCode.NOT_FOUND, request));
    }

    @ExceptionHandler(UploadSessionExpiredException.class)
    public ResponseEntity<ErrorResponse> handleExpired(UploadSessionExpiredException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(buildErrorResponse(HttpStatus.GONE, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(InvalidUploadRequestException.class)
    public ResponseEntity<ErrorResponse> handleInvalidRequest(InvalidUploadRequestException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(InvalidChunkSizeException.class)
    public ResponseEntity<ErrorResponse> handleInvalidChunkSize(InvalidChunkSizeException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(UploadOwnershipException.class)
    public ResponseEntity<ErrorResponse> handleOwnership(UploadOwnershipException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage(), ApiErrorCode.FORBIDDEN, request));
    }

    @ExceptionHandler(UploadSessionAlreadyCompletedException.class)
    public ResponseEntity<ErrorResponse> handleAlreadyCompleted(UploadSessionAlreadyCompletedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(DuplicateChunkException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateChunk(DuplicateChunkException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(UploadSessionNotActiveException.class)
    public ResponseEntity<ErrorResponse> handleSessionNotActive(UploadSessionNotActiveException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(InvalidChunkException.class)
    public ResponseEntity<ErrorResponse> handleInvalidChunk(InvalidChunkException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(InvalidChunkChecksumException.class)
    public ResponseEntity<ErrorResponse> handleInvalidChunkChecksum(InvalidChunkChecksumException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(UploadIncompleteException.class)
    public ResponseEntity<ErrorResponse> handleUploadIncomplete(UploadIncompleteException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(FinalChecksumMismatchException.class)
    public ResponseEntity<ErrorResponse> handleFinalChecksumMismatch(FinalChecksumMismatchException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(UploadCompletionException.class)
    public ResponseEntity<ErrorResponse> handleUploadCompletion(UploadCompletionException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(ChunkMergeException.class)
    public ResponseEntity<ErrorResponse> handleChunkMerge(ChunkMergeException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), ApiErrorCode.INTERNAL_SERVER_ERROR, request));
    }

    @ExceptionHandler(ObjectStorageException.class)
    public ResponseEntity<ErrorResponse> handleObjectStorage(ObjectStorageException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), ApiErrorCode.INTERNAL_SERVER_ERROR, request));
    }

    @ExceptionHandler(ChunkCorruptedException.class)
    public ResponseEntity<ErrorResponse> handleChunkCorrupted(ChunkCorruptedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(RetryLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRetryLimitExceeded(RetryLimitExceededException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(RetryNotAllowedException.class)
    public ResponseEntity<ErrorResponse> handleRetryNotAllowed(RetryNotAllowedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(RetryInProgressException.class)
    public ResponseEntity<ErrorResponse> handleRetryInProgress(RetryInProgressException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(RetrySchedulingException.class)
    public ResponseEntity<ErrorResponse> handleRetryScheduling(RetrySchedulingException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), ApiErrorCode.INTERNAL_SERVER_ERROR, request));
    }

    @ExceptionHandler(RetryExecutionException.class)
    public ResponseEntity<ErrorResponse> handleRetryExecution(RetryExecutionException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), ApiErrorCode.INTERNAL_SERVER_ERROR, request));
    }

    @ExceptionHandler(UploadAlreadyPausedException.class)
    public ResponseEntity<ErrorResponse> handleUploadAlreadyPaused(UploadAlreadyPausedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(UploadNotPausedException.class)
    public ResponseEntity<ErrorResponse> handleUploadNotPaused(UploadNotPausedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(UploadPauseNotAllowedException.class)
    public ResponseEntity<ErrorResponse> handleUploadPauseNotAllowed(UploadPauseNotAllowedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(UploadResumeNotAllowedException.class)
    public ResponseEntity<ErrorResponse> handleUploadResumeNotAllowed(UploadResumeNotAllowedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(UploadLifecycleException.class)
    public ResponseEntity<ErrorResponse> handleUploadLifecycle(UploadLifecycleException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(ChunkAlreadyUploadingException.class)
    public ResponseEntity<ErrorResponse> handleChunkAlreadyUploading(ChunkAlreadyUploadingException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(ConcurrentCompletionException.class)
    public ResponseEntity<ErrorResponse> handleConcurrentCompletion(ConcurrentCompletionException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(UploadCoordinatorException.class)
    public ResponseEntity<ErrorResponse> handleUploadCoordinator(UploadCoordinatorException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), ApiErrorCode.INTERNAL_SERVER_ERROR, request));
    }

    @ExceptionHandler(ParallelUploadException.class)
    public ResponseEntity<ErrorResponse> handleParallelUpload(ParallelUploadException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler({
        org.springframework.dao.ConcurrencyFailureException.class,
        org.springframework.transaction.TransactionSystemException.class
    })
    public ResponseEntity<ErrorResponse> handleConcurrencyFailure(Exception ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, "Database transaction or concurrency failure. Please retry.", ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(UploadQueueFullException.class)
    public ResponseEntity<ErrorResponse> handleUploadQueueFull(UploadQueueFullException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(buildErrorResponse(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(UploadQueueNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUploadQueueNotFound(UploadQueueNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), ApiErrorCode.NOT_FOUND, request));
    }

    @ExceptionHandler(UploadQueueException.class)
    public ResponseEntity<ErrorResponse> handleUploadQueue(UploadQueueException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(ProgressTrackingException.class)
    public ResponseEntity<ErrorResponse> handleProgressTracking(ProgressTrackingException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), ApiErrorCode.INTERNAL_SERVER_ERROR, request));
    }

    @ExceptionHandler(ProgressCalculationException.class)
    public ResponseEntity<ErrorResponse> handleProgressCalculation(ProgressCalculationException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), ApiErrorCode.INTERNAL_SERVER_ERROR, request));
    }

    @ExceptionHandler(ProgressBroadcastException.class)
    public ResponseEntity<ErrorResponse> handleProgressBroadcast(ProgressBroadcastException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(buildErrorResponse(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage(), ApiErrorCode.INTERNAL_SERVER_ERROR, request));
    }

    @ExceptionHandler(ProgressSubscriptionException.class)
    public ResponseEntity<ErrorResponse> handleProgressSubscription(ProgressSubscriptionException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(AuditLoggingException.class)
    public ResponseEntity<ErrorResponse> handleAuditLogging(AuditLoggingException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), ApiErrorCode.AUDIT_ERROR, request));
    }

    @ExceptionHandler(HistoryQueryException.class)
    public ResponseEntity<ErrorResponse> handleHistoryQuery(HistoryQueryException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(WorkspaceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleWorkspaceNotFound(WorkspaceNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), ApiErrorCode.NOT_FOUND, request));
    }

    @ExceptionHandler(WorkspaceAccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleWorkspaceAccessDenied(WorkspaceAccessDeniedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage(), ApiErrorCode.FORBIDDEN, request));
    }

    @ExceptionHandler(WorkspaceQuotaExceededException.class)
    public ResponseEntity<ErrorResponse> handleWorkspaceQuotaExceeded(WorkspaceQuotaExceededException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(WorkspaceInvitationExpiredException.class)
    public ResponseEntity<ErrorResponse> handleWorkspaceInvitationExpired(WorkspaceInvitationExpiredException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(buildErrorResponse(HttpStatus.GONE, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(WorkspaceInvitationInvalidException.class)
    public ResponseEntity<ErrorResponse> handleWorkspaceInvitationInvalid(WorkspaceInvitationInvalidException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ApiErrorCode.BAD_REQUEST, request));
    }

    @ExceptionHandler(PermissionDeniedException.class)
    public ResponseEntity<ErrorResponse> handlePermissionDenied(PermissionDeniedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage(), ApiErrorCode.FORBIDDEN, request));
    }

    @ExceptionHandler(WorkspaceMemberAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleWorkspaceMemberAlreadyExists(WorkspaceMemberAlreadyExistsException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(WorkspaceInvitationAlreadySentException.class)
    public ResponseEntity<ErrorResponse> handleWorkspaceInvitationAlreadySent(WorkspaceInvitationAlreadySentException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), ApiErrorCode.CONFLICT, request));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex, HttpServletRequest request) {
        String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        HttpStatus status = HttpStatus.BAD_REQUEST;
        ApiErrorCode code = ApiErrorCode.BAD_REQUEST;

        if (msg.contains("unauthorized") || msg.contains("access denied") || msg.contains("access_denied")) {
            status = HttpStatus.FORBIDDEN;
            code = ApiErrorCode.FORBIDDEN;
        } else if (msg.contains("not found") || msg.contains("no value present") || msg.contains("no_value_present")) {
            status = HttpStatus.NOT_FOUND;
            code = ApiErrorCode.NOT_FOUND;
        } else if (msg.contains("already exists") || msg.contains("duplicate") || msg.contains("conflict")) {
            status = HttpStatus.CONFLICT;
            code = ApiErrorCode.CONFLICT;
        }

        return ResponseEntity.status(status)
                .body(buildErrorResponse(status, ex.getMessage(), code, request));
    }
}
