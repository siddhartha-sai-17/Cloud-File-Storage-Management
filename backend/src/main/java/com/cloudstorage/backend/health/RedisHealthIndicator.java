package com.cloudstorage.backend.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component("redisHealth")
public class RedisHealthIndicator implements HealthIndicator {
    @Override
    public Health health() {
        // Redis not in this stack, report UP with detail
        return Health.up()
                .withDetail("status", "NOT_CONFIGURED")
                .withDetail("description", "Redis is not configured in this environment")
                .build();
    }
}
