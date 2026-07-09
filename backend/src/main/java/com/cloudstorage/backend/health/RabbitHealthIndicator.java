package com.cloudstorage.backend.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component("rabbitHealth")
public class RabbitHealthIndicator implements HealthIndicator {
    @Override
    public Health health() {
        // RabbitMQ not in this stack, report UP with detail
        return Health.up()
                .withDetail("status", "NOT_CONFIGURED")
                .withDetail("description", "RabbitMQ is not configured in this environment")
                .build();
    }
}
