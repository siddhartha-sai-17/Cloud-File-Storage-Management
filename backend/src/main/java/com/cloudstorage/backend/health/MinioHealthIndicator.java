package com.cloudstorage.backend.health;

import io.minio.BucketExistsArgs;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MinioHealthIndicator implements HealthIndicator {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Override
    public Health health() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (exists) {
                return Health.up()
                        .withDetail("bucketName", bucketName)
                        .withDetail("status", "Reachable")
                        .build();
            } else {
                return Health.down()
                        .withDetail("bucketName", bucketName)
                        .withDetail("status", "Bucket does not exist")
                        .build();
            }
        } catch (Exception e) {
            return Health.down(e)
                    .withDetail("bucketName", bucketName)
                    .build();
        }
    }
}
