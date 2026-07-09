package com.cloudstorage.backend.exception;

public class UploadResumeNotAllowedException extends UploadLifecycleException {
    public UploadResumeNotAllowedException(String message) {
        super(message);
    }
}
