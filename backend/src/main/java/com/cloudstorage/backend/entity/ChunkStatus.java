package com.cloudstorage.backend.entity;

public enum ChunkStatus {
    PENDING,
    UPLOADED,
    VERIFIED,
    MERGED,
    FAILED,
    MISSING,
    RETRY_PENDING,
    RETRYING,
    RETRY_FAILED
}
