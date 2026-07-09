package com.cloudstorage.backend.exception;

public class InvalidUploadRequestException extends RuntimeException {
    public InvalidUploadRequestException(String message) {
        super(message);
    }
}
