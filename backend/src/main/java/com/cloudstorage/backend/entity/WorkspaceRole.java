package com.cloudstorage.backend.entity;

/**
 * Workspace-scoped role enum with hierarchical ordering.
 * Higher ordinal = greater authority within a workspace.
 */
public enum WorkspaceRole {

    GUEST(1),
    VIEWER(2),
    EDITOR(3),
    MANAGER(4),
    WORKSPACE_OWNER(5),
    SYSTEM_ADMIN(6);

    private final int level;

    WorkspaceRole(int level) {
        this.level = level;
    }

    public int getLevel() {
        return level;
    }

    /** Returns true if this role is at least as powerful as the given minimum role. */
    public boolean hasAtLeast(WorkspaceRole minimum) {
        return this.level >= minimum.level;
    }

    /** Returns true if this role is strictly more powerful than the given role. */
    public boolean isHigherThan(WorkspaceRole other) {
        return this.level > other.level;
    }
}
