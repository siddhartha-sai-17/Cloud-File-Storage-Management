package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class DuplicateGroupDto {
    private String sha256;
    private int fileCount;
    private long totalSize;
    private long potentialSavings;
    private List<StorageDto.Item> duplicates;
}
