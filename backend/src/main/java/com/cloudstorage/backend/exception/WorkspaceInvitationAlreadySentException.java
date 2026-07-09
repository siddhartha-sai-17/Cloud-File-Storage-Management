package com.cloudstorage.backend.exception;

public class WorkspaceInvitationAlreadySentException extends RuntimeException {
    public WorkspaceInvitationAlreadySentException(String message) {
        super(message);
    }
}
