package com.cloudstorage.backend.security;

/**
 * Thread-local context holder to track the current active workspace ID for a request.
 */
public class WorkspaceContextHolder {

    private static final ThreadLocal<Long> currentWorkspaceId = new ThreadLocal<>();

    public static void setCurrentWorkspaceId(Long workspaceId) {
        currentWorkspaceId.set(workspaceId);
    }

    public static Long getCurrentWorkspaceId() {
        return currentWorkspaceId.get();
    }

    public static void clear() {
        currentWorkspaceId.remove();
    }
}
