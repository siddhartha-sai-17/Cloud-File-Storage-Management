package com.cloudstorage.backend.exception;

public class UploadQueueException extends RuntimeException {
    public UploadQueueException(String message) {
        super(message);
    }
    public UploadQueueException(String message, Throwable cause) {
        super(message, cause);
    }
}
