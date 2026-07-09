package com.cloudstorage.backend.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.io.File;

@Component
public class StorageHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        try {
            File path = new File(".");
            long freeSpace = path.getFreeSpace();
            long totalSpace = path.getTotalSpace();
            long usableSpace = path.getUsableSpace();

            Runtime runtime = Runtime.getRuntime();
            long maxMemory = runtime.maxMemory();
            long allocatedMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();

            Health.Builder builder = Health.up()
                    .withDetail("diskTotalSpaceBytes", totalSpace)
                    .withDetail("diskFreeSpaceBytes", freeSpace)
                    .withDetail("diskUsableSpaceBytes", usableSpace)
                    .withDetail("jvmMaxMemoryBytes", maxMemory)
                    .withDetail("jvmAllocatedMemoryBytes", allocatedMemory)
                    .withDetail("jvmFreeMemoryBytes", freeMemory);

            if (usableSpace < 104857600L) { // Less than 100MB
                return builder.down().withDetail("warning", "Low disk space").build();
            }
            return builder.build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
