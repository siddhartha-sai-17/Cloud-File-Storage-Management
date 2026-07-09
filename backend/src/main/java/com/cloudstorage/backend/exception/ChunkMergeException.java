package com.cloudstorage.backend.exception;

public class ChunkMergeException extends RuntimeException {
    public ChunkMergeException(String message) {
        super(message);
    }

    public ChunkMergeException(String message, Throwable cause) {
        super(message, cause);
    }
}
