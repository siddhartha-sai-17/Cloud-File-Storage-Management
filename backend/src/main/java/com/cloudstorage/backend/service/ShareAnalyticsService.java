package com.cloudstorage.backend.service;

import com.cloudstorage.backend.dto.AccessLogDto;
import com.cloudstorage.backend.dto.ShareStatisticsDto;
import com.cloudstorage.backend.entity.*;
import com.cloudstorage.backend.repository.ShareAccessLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShareAnalyticsService {

    private final ShareAccessLogRepository accessLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAccess(ShareLink shareLink, User user, String ipAddress, String userAgent,
                          AccessOperation operation, String status, long processingTimeMs) {
        try {
            ShareAccessLog log = ShareAccessLog.builder()
                    .shareLink(shareLink)
                    .user(user)
                    .ipAddress(ipAddress != null ? ipAddress : "unknown")
                    .userAgent(userAgent != null ? userAgent : "unknown")
                    .operation(operation)
                    .timestamp(LocalDateTime.now())
                    .status(status)
                    .processingTimeMs(processingTimeMs)
                    .build();

            accessLogRepository.save(log);
        } catch (Exception e) {
            // Never let analytics logging failure disrupt the main flow
            System.err.println("Failed to log share access analytics: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public ShareStatisticsDto getStatistics(UUID shareLinkId) {
        long totalViews = accessLogRepository.countByShareLinkIdAndOperationAndStatus(shareLinkId, AccessOperation.VIEW, "SUCCESS") +
                accessLogRepository.countByShareLinkIdAndOperationAndStatus(shareLinkId, AccessOperation.PREVIEW, "SUCCESS");
        long totalDownloads = accessLogRepository.countByShareLinkIdAndOperationAndStatus(shareLinkId, AccessOperation.DOWNLOAD, "SUCCESS");
        long totalPreviews = accessLogRepository.countByShareLinkIdAndOperationAndStatus(shareLinkId, AccessOperation.PREVIEW, "SUCCESS");
        long totalUploads = accessLogRepository.countByShareLinkIdAndOperationAndStatus(shareLinkId, AccessOperation.UPLOAD, "SUCCESS");
        long uniqueVisitors = accessLogRepository.countUniqueUserByShareLinkId(shareLinkId);
        long uniqueIps = accessLogRepository.countUniqueIpByShareLinkId(shareLinkId);
        Double avgSize = accessLogRepository.getAverageDownloadSize(shareLinkId);

        List<ShareAccessLog> logs = accessLogRepository.findByShareLinkId(shareLinkId);

        Map<String, Long> browserStats = new HashMap<>();
        Map<String, Long> deviceStats = new HashMap<>();
        Map<String, Long> countryStats = new HashMap<>();

        for (ShareAccessLog log : logs) {
            if (!"SUCCESS".equals(log.getStatus())) {
                continue;
            }
            String ua = log.getUserAgent();
            String ip = log.getIpAddress();

            String browser = parseBrowser(ua);
            String device = parseDevice(ua);
            String country = parseCountry(ip);

            browserStats.put(browser, browserStats.getOrDefault(browser, 0L) + 1);
            deviceStats.put(device, deviceStats.getOrDefault(device, 0L) + 1);
            countryStats.put(country, countryStats.getOrDefault(country, 0L) + 1);
        }

        List<AccessLogDto> recentActivity = accessLogRepository.findTop10ByShareLinkIdOrderByTimestampDesc(shareLinkId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        return ShareStatisticsDto.builder()
                .shareLinkId(shareLinkId)
                .totalViews(totalViews)
                .totalDownloads(totalDownloads)
                .totalPreviews(totalPreviews)
                .totalUploads(totalUploads)
                .uniqueVisitors(uniqueVisitors > 0 ? uniqueVisitors : uniqueIps) // fallback to IPs if guest visitors
                .uniqueIps(uniqueIps)
                .averageDownloadSize(avgSize != null ? avgSize : 0.0)
                .browserStats(browserStats)
                .deviceStats(deviceStats)
                .countryStats(countryStats)
                .recentActivity(recentActivity)
                .build();
    }

    public AccessLogDto mapToDto(ShareAccessLog log) {
        return AccessLogDto.builder()
                .id(log.getId())
                .shareLinkId(log.getShareLink().getId())
                .username(log.getUser() != null ? log.getUser().getUsername() : "Guest")
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .operation(log.getOperation().name())
                .timestamp(log.getTimestamp())
                .status(log.getStatus())
                .processingTimeMs(log.getProcessingTimeMs())
                .build();
    }

    private String parseBrowser(String ua) {
        if (ua == null) return "Unknown";
        String lower = ua.toLowerCase();
        if (lower.contains("postman")) return "Postman";
        if (lower.contains("edge") || lower.contains("edg/")) return "Edge";
        if (lower.contains("chrome") && !lower.contains("chromium")) return "Chrome";
        if (lower.contains("safari") && !lower.contains("chrome")) return "Safari";
        if (lower.contains("firefox")) return "Firefox";
        if (lower.contains("msie") || lower.contains("trident")) return "Internet Explorer";
        if (lower.contains("python")) return "Python Script";
        return "Other";
    }

    private String parseDevice(String ua) {
        if (ua == null) return "Unknown";
        String lower = ua.toLowerCase();
        if (lower.contains("mobile") || lower.contains("android") || lower.contains("iphone") || lower.contains("ipad")) {
            return "Mobile/Tablet";
        }
        return "Desktop";
    }

    private String parseCountry(String ip) {
        if (ip == null) return "Unknown";
        if (ip.equals("127.0.0.1") || ip.equals("0:0:0:0:0:0:0:1") || ip.equalsIgnoreCase("localhost")) {
            return "Localhost";
        }
        // Consistent hash-based mock country mapping
        int hash = Math.abs(ip.hashCode());
        switch (hash % 5) {
            case 0: return "United States";
            case 1: return "Germany";
            case 2: return "India";
            case 3: return "Canada";
            default: return "United Kingdom";
        }
    }
}
