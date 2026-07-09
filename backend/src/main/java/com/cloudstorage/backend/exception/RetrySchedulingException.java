package com.cloudstorage.backend.exception;

public class RetrySchedulingException extends RuntimeException {
    public RetrySchedulingException(String message) {
        super(message);
    }

    public RetrySchedulingException(String message, Throwable cause) {
        super(message, cause);
    }
}
