package com.cloudstorage.backend.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class AuthorizationCache {

    private final Cache<String, Boolean> permissionCache;

    public AuthorizationCache(
            @Value("${auth.cache.max-size:10000}") int maxSize,
            @Value("${auth.cache.expire-minutes:5}") int expireMinutes) {
        this.permissionCache = Caffeine.newBuilder()
                .maximumSize(maxSize)
                .expireAfterWrite(expireMinutes, TimeUnit.MINUTES)
                .build();
    }

    public Boolean get(String username, Long workspaceId, String permission) {
        String key = buildKey(username, workspaceId, permission);
        return permissionCache.getIfPresent(key);
    }

    public Boolean getFilePerm(String username, Long fileId, String permission) {
        String key = buildFileKey(username, fileId, permission);
        return permissionCache.getIfPresent(key);
    }

    public void put(String username, Long workspaceId, String permission, boolean result) {
        String key = buildKey(username, workspaceId, permission);
        permissionCache.put(key, result);
    }

    public void putFilePerm(String username, Long fileId, String permission, boolean result) {
        String key = buildFileKey(username, fileId, permission);
        permissionCache.put(key, result);
    }

    public void evictUserPermissions(String username) {
        permissionCache.asMap().keySet().removeIf(key -> key.startsWith(username + ":"));
    }

    public void evictWorkspacePermissions(Long workspaceId) {
        String wsStr = ":" + workspaceId + ":";
        permissionCache.asMap().keySet().removeIf(key -> key.contains(wsStr));
    }

    public void evictFilePermissions(Long fileId) {
        String fileStr = ":file:" + fileId + ":";
        permissionCache.asMap().keySet().removeIf(key -> key.contains(fileStr));
    }

    public void clear() {
        permissionCache.invalidateAll();
    }

    private String buildKey(String username, Long workspaceId, String permission) {
        return username + ":" + (workspaceId != null ? workspaceId : "null") + ":" + permission;
    }

    private String buildFileKey(String username, Long fileId, String permission) {
        return username + ":file:" + fileId + ":" + permission;
    }
}
