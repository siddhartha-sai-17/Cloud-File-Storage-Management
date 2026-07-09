package com.cloudstorage.backend.exception;

public class ProgressTrackingException extends RuntimeException {
    public ProgressTrackingException(String message) {
        super(message);
    }
    public ProgressTrackingException(String message, Throwable cause) {
        super(message, cause);
    }
}
