package com.cloudstorage.backend.exception;

public class FinalChecksumMismatchException extends RuntimeException {
    public FinalChecksumMismatchException(String message) {
        super(message);
    }
}
