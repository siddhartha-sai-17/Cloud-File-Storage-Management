package com.cloudstorage.backend.exception;

public class UploadQueueFullException extends UploadQueueException {
    public UploadQueueFullException(String message) {
        super(message);
    }
}
