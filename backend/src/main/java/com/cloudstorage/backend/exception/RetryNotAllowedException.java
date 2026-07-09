package com.cloudstorage.backend.exception;

public class RetryNotAllowedException extends RuntimeException {
    public RetryNotAllowedException(String message) {
        super(message);
    }
}
