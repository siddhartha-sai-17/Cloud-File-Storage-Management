package com.cloudstorage.backend.exception;

public class UploadCompletionException extends RuntimeException {
    public UploadCompletionException(String message) {
        super(message);
    }

    public UploadCompletionException(String message, Throwable cause) {
        super(message, cause);
    }
}
