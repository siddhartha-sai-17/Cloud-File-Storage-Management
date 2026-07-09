package com.cloudstorage.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final com.cloudstorage.backend.service.SystemConfigService systemConfigService;

    public RateLimitInterceptor(com.cloudstorage.backend.service.SystemConfigService systemConfigService) {
        this.systemConfigService = systemConfigService;
    }

    // Map to store request timestamps: Key is either IP or username
    private final Map<String, List<Long>> requestLog = new ConcurrentHashMap<>();
    
    private static final long TIME_WINDOW_MS = 60000;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String key = request.getRemoteAddr();
        
        Principal principal = request.getUserPrincipal();
        if (principal != null && principal.getName() != null && !principal.getName().isEmpty()) {
            key = principal.getName();
        }

        int limit = systemConfigService.getValueAsInt("rate-limit.limit", 100);
        long now = System.currentTimeMillis();
        List<Long> timestamps = requestLog.computeIfAbsent(key, k -> Collections.synchronizedList(new ArrayList<>()));

        synchronized (timestamps) {
            timestamps.removeIf(t -> t < now - TIME_WINDOW_MS);
            if (timestamps.size() >= limit) {
                response.setStatus(429); // Too Many Requests
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Too Many Requests\", \"message\": \"Rate limit exceeded. Please try again later.\"}");
                return false;
            }
            timestamps.add(now);
        }

        return true;
    }
}
