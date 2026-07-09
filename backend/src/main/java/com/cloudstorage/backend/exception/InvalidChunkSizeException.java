package com.cloudstorage.backend.exception;

public class InvalidChunkSizeException extends RuntimeException {
    public InvalidChunkSizeException(String message) {
        super(message);
    }
}
