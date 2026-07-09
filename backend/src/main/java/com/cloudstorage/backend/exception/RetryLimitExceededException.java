package com.cloudstorage.backend.exception;

public class RetryLimitExceededException extends RuntimeException {
    public RetryLimitExceededException(String message) {
        super(message);
    }
}
