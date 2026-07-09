package com.cloudstorage.backend.exception;

public class InvalidChunkException extends RuntimeException {
    public InvalidChunkException(String message) {
        super(message);
    }
}
