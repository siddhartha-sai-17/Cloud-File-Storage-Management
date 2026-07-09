package com.cloudstorage.backend.exception;

public class WorkspaceMemberAlreadyExistsException extends RuntimeException {
    public WorkspaceMemberAlreadyExistsException(String message) {
        super(message);
    }
}
