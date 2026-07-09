package com.cloudstorage.backend.exception;

public class UploadSessionAlreadyCompletedException extends RuntimeException {
    public UploadSessionAlreadyCompletedException(String message) {
        super(message);
    }
}
