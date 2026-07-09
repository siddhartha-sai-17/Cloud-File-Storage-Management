package com.cloudstorage.backend.exception;

public class ChunkCorruptedException extends RuntimeException {
    public ChunkCorruptedException(String message) {
        super(message);
    }
}
