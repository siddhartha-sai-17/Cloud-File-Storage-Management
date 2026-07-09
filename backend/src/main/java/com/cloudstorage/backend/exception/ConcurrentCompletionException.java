package com.cloudstorage.backend.exception;

public class ConcurrentCompletionException extends ParallelUploadException {
    public ConcurrentCompletionException(String message) {
        super(message);
    }
}
