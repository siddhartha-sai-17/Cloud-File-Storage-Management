package com.cloudstorage.backend.exception;

public class ChunkAlreadyUploadingException extends ParallelUploadException {
    public ChunkAlreadyUploadingException(String message) {
        super(message);
    }
}
