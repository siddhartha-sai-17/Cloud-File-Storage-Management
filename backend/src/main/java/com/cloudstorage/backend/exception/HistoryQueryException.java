package com.cloudstorage.backend.exception;

public class HistoryQueryException extends RuntimeException {
    public HistoryQueryException(String message) {
        super(message);
    }
    public HistoryQueryException(String message, Throwable cause) {
        super(message, cause);
    }
}
