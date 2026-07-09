package com.cloudstorage.backend.exception;

public class InvalidChunkChecksumException extends RuntimeException {
    public InvalidChunkChecksumException(String message) {
        super(message);
    }
}
