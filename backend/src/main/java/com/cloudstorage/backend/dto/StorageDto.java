package com.cloudstorage.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

public class StorageDto {

    @Data
    @Builder
    public static class Item {
        private Long id;
        private String name;
        private String type; // "FILE" or "FOLDER"
        private Long size;
        private LocalDateTime createdDate;
    }
}
