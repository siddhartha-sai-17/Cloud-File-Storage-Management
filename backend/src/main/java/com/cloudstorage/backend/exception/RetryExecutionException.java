package com.cloudstorage.backend.exception;

public class RetryExecutionException extends RuntimeException {
    public RetryExecutionException(String message) {
        super(message);
    }

    public RetryExecutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
