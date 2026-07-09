package com.cloudstorage.backend.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChunkWriteResult {
    private String checksum;
    private long size;
    private String filePath;
}
