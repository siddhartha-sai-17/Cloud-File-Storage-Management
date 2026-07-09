package com.cloudstorage.backend.exception;

public class UploadSessionExpiredException extends RuntimeException {
    public UploadSessionExpiredException(String message) {
        super(message);
    }
}
