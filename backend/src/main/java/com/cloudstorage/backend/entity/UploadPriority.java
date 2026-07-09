package com.cloudstorage.backend.entity;

public enum UploadPriority {
    HIGH(3),
    NORMAL(2),
    LOW(1);

    private final int weight;

    UploadPriority(int weight) {
        this.weight = weight;
    }

    public int getWeight() {
        return weight;
    }
}
