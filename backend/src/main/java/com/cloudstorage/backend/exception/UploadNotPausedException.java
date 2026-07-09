package com.cloudstorage.backend.exception;

public class UploadNotPausedException extends UploadLifecycleException {
    public UploadNotPausedException(String message) {
        super(message);
    }
}
