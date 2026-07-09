package com.cloudstorage.backend.exception;

public class ProgressSubscriptionException extends RuntimeException {
    public ProgressSubscriptionException(String message) {
        super(message);
    }
    public ProgressSubscriptionException(String message, Throwable cause) {
        super(message, cause);
    }
}
