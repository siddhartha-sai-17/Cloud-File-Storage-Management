package com.cloudstorage.backend.exception;

public class DuplicateChunkException extends RuntimeException {
    public DuplicateChunkException(String message) {
        super(message);
    }
}
