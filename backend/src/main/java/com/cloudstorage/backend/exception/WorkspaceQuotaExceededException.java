package com.cloudstorage.backend.exception;

public class WorkspaceQuotaExceededException extends RuntimeException {
    public WorkspaceQuotaExceededException(String message) {
        super(message);
    }
}
