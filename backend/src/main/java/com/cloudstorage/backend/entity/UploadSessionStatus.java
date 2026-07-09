package com.cloudstorage.backend.entity;

public enum UploadSessionStatus {
    INITIALIZED,
    UPLOADING,
    PAUSED,
    VERIFYING,
    FINALIZING,
    COMPLETED,
    FAILED,
    CANCELLED,
    EXPIRED
}
