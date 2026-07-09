package com.cloudstorage.backend.exception;

public class UploadSessionNotFoundException extends RuntimeException {
    public UploadSessionNotFoundException(String message) {
        super(message);
    }
}
