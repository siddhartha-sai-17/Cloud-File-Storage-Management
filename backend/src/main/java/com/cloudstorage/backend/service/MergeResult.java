package com.cloudstorage.backend.service;

import lombok.Value;

@Value
public class MergeResult {
    String filePath;
    String sha256;
    long size;
}
