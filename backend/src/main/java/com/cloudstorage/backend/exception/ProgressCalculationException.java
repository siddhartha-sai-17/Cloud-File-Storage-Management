package com.cloudstorage.backend.exception;

public class ProgressCalculationException extends RuntimeException {
    public ProgressCalculationException(String message) {
        super(message);
    }
    public ProgressCalculationException(String message, Throwable cause) {
        super(message, cause);
    }
}
