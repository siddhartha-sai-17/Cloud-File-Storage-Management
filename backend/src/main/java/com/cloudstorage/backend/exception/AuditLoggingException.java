package com.cloudstorage.backend.exception;

public class AuditLoggingException extends RuntimeException {
    public AuditLoggingException(String message) {
        super(message);
    }
    public AuditLoggingException(String message, Throwable cause) {
        super(message, cause);
    }
}
