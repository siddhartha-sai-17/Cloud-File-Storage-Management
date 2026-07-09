package com.cloudstorage.backend.exception;

public class RetryInProgressException extends RuntimeException {
    public RetryInProgressException(String message) {
        super(message);
    }
}
