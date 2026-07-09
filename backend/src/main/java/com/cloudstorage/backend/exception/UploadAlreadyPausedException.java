package com.cloudstorage.backend.exception;

public class UploadAlreadyPausedException extends UploadLifecycleException {
    public UploadAlreadyPausedException(String message) {
        super(message);
    }
}
