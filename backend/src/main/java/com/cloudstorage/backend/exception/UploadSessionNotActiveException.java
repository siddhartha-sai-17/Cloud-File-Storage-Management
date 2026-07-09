package com.cloudstorage.backend.exception;

public class UploadSessionNotActiveException extends RuntimeException {
    public UploadSessionNotActiveException(String message) {
        super(message);
    }
}
