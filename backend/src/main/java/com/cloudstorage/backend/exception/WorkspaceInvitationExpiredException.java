package com.cloudstorage.backend.exception;

public class WorkspaceInvitationExpiredException extends RuntimeException {
    public WorkspaceInvitationExpiredException(String message) {
        super(message);
    }
}
