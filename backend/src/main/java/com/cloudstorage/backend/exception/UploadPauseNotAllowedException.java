package com.cloudstorage.backend.exception;

public class UploadPauseNotAllowedException extends UploadLifecycleException {
    public UploadPauseNotAllowedException(String message) {
        super(message);
    }
}
