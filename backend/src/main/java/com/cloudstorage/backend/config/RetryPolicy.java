package com.cloudstorage.backend.config;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetryPolicy {
    private int maxAttempts;
    private long initialDelay;
    private double multiplier;
    private long maxDelay;
    private boolean jitterEnabled;
}
