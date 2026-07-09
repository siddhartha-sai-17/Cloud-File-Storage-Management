import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2, Loader2, BellOff } from 'lucide-react';
import { cn } from '@/utils/utils';
import { notificationService } from '@/features/notifications/services/notificationService';
import type { NotificationDto } from '@/features/notifications/services/notificationService';

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 15 seconds
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 15_000,
  });

  // Load notifications when dropdown opens
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => notificationService.getNotifications(0, 15),
    enabled: isOpen,
  });

  const notifications = notificationsData?.content ?? [];

  const markAsReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: notificationService.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getTypeIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      FILE_SHARED: '🔗',
      COMMENT_ADDED: '💬',
      MEMBER_JOINED: '👤',
      INVITATION_SENT: '✉️',
      WORKSPACE_CREATED: '🏢',
      FILE_UPLOADED: '📁',
      VERSION_RESTORED: '🔄',
    };
    return iconMap[type] || '🔔';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="notification-bell-btn"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notification center"
          className="absolute right-0 top-full mt-2 w-96 max-h-[520px] overflow-hidden rounded-xl border bg-card shadow-xl flex flex-col z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors focus:outline-none"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <BellOff className="h-10 w-10 opacity-40" />
                <p className="text-sm font-medium">No notifications yet</p>
              </div>
            ) : (
              <ul role="list">
                {notifications.map((n: NotificationDto) => (
                  <li
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors',
                      !n.read ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'hover:bg-muted/30'
                    )}
                  >
                    <span className="text-lg leading-none mt-0.5" aria-hidden>
                      {getTypeIcon(n.notificationType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-semibold truncate', !n.read ? 'text-foreground' : 'text-muted-foreground')}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!n.read && (
                        <button
                          onClick={() => markAsReadMutation.mutate(n.id)}
                          aria-label="Mark as read"
                          className="h-5 w-5 flex items-center justify-center rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors focus:outline-none"
                        >
                          <CheckCheck className="h-3 w-3 text-indigo-600" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotificationMutation.mutate(n.id)}
                        aria-label="Delete notification"
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors focus:outline-none"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
