package com.cloudstorage.backend.health;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component("ocrQueueHealth")
public class OcrQueueHealthIndicator implements HealthIndicator {

    @Value("${ocr.enabled:true}")
    private boolean ocrEnabled;

    @Value("${ocr.queue-capacity:500}")
    private int queueCapacity;

    @Override
    public Health health() {
        if (!ocrEnabled) {
            return Health.outOfService()
                    .withDetail("enabled", false)
                    .build();
        }
        return Health.up()
                .withDetail("enabled", true)
                .withDetail("queueCapacity", queueCapacity)
                .withDetail("status", "Active")
                .build();
    }
}
