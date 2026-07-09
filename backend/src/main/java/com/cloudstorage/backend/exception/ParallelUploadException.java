package com.cloudstorage.backend.exception;

public class ParallelUploadException extends RuntimeException {
    public ParallelUploadException(String message) {
        super(message);
    }
    public ParallelUploadException(String message, Throwable cause) {
        super(message, cause);
    }
}
