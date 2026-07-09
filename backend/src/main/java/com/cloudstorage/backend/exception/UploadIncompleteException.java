package com.cloudstorage.backend.exception;

public class UploadIncompleteException extends RuntimeException {
    public UploadIncompleteException(String message) {
        super(message);
    }
}
