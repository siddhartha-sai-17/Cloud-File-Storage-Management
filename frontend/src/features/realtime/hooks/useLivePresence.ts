import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { useWorkspace } from '@/contexts/WorkspaceProvider';
import type { PresenceUser } from '../types';

export function useLivePresence(currentPath = '/') {
  const { user } = useAuth();
  const { members } = useWorkspace();
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  // Local user's own status
  const [myStatus, setMyStatus] = useState<'VIEWING' | 'EDITING' | 'IDLE'>('VIEWING');

  const updateMyStatus = useCallback((status: 'VIEWING' | 'EDITING' | 'IDLE') => {
    setMyStatus(status);
  }, []);

  useEffect(() => {
    if (!user) {
      setPresenceUsers([]);
      return;
    }

    // Initialize list with "You" and workspace members
    const initUsers: PresenceUser[] = [
      {
        userId: Number(user.id),
        username: user.username,
        role: user.role,
        status: myStatus,
        currentPath,
        lastActive: new Date().toISOString(),
      },
    ];

    // Add other members as offline/idle initially
    members.forEach((m) => {
      if (m.username !== user.username) {
        initUsers.push({
          userId: m.userId,
          username: m.username,
          role: m.role,
          status: 'IDLE',
          lastActive: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
        });
      }
    });

    setPresenceUsers(initUsers);
  }, [user, members, currentPath, myStatus]);

  // Simulate remote user changes periodically
  useEffect(() => {
    if (presenceUsers.length <= 1) return;

    const interval = setInterval(() => {
      setPresenceUsers((prev) => {
        return prev.map((p, idx) => {
          // Keep current user untouched (managed by local state)
          if (idx === 0) return p;

          // 25% chance of changing status for this user
          if (Math.random() > 0.75) {
            const statuses: Array<'VIEWING' | 'EDITING' | 'IDLE'> = ['VIEWING', 'EDITING', 'IDLE'];
            const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const paths = [currentPath, '/Dashboard', '/Shared', undefined];
            const newPath = newStatus !== 'IDLE' ? paths[Math.floor(Math.random() * paths.length)] : undefined;

            return {
              ...p,
              status: newStatus,
              currentPath: newPath,
              lastActive: new Date().toISOString(),
            };
          }
          return p;
        });
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [presenceUsers.length, currentPath]);

  return {
    presenceUsers,
    myStatus,
    updateMyStatus,
  };
}
