package com.cloudstorage.backend.exception;

public class ProgressBroadcastException extends RuntimeException {
    public ProgressBroadcastException(String message) {
        super(message);
    }
    public ProgressBroadcastException(String message, Throwable cause) {
        super(message, cause);
    }
}
