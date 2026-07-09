import { useLivePresence } from '../hooks/useLivePresence';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface LivePresenceIndicatorProps {
  currentPath?: string;
}

export function LivePresenceIndicator({ currentPath = '/' }: LivePresenceIndicatorProps) {
  const { presenceUsers } = useLivePresence(currentPath);

  // Group users by their activity status
  const activeUsers = presenceUsers.filter((u) => u.status !== 'IDLE');

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex items-center gap-1.5" aria-label="Active workspace users presence">
      <div className="flex -space-x-2.5 overflow-hidden">
        {activeUsers.slice(0, 5).map((user) => {
          const isEditing = user.status === 'EDITING';
          const ringClass = isEditing
            ? 'ring-2 ring-indigo-600 dark:ring-indigo-500 ring-offset-2'
            : 'ring-2 ring-emerald-500 dark:ring-emerald-400 ring-offset-2';
          
          return (
            <div
              key={user.userId}
              className="relative group shrink-0"
              title={`${user.username} (${user.role}) - ${user.status === 'EDITING' ? 'Editing' : 'Viewing'}`}
            >
              <Avatar className={`h-7 w-7 border-2 border-background text-[10px] font-bold ${ringClass}`}>
                <AvatarFallback className={isEditing ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}>
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-white ${isEditing ? 'bg-indigo-600 animate-pulse' : 'bg-emerald-500'}`} />
            </div>
          );
        })}

        {activeUsers.length > 5 && (
          <Avatar className="h-7 w-7 border-2 border-background text-[10px] font-bold ring-2 ring-muted-foreground ring-offset-2 shrink-0">
            <AvatarFallback className="bg-muted text-muted-foreground">
              +{activeUsers.length - 5}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className="hidden sm:block text-[11px] font-medium text-muted-foreground ml-1" aria-live="polite">
        {activeUsers.length === 1 ? (
          <span>Only you are active</span>
        ) : (
          <span>
            {activeUsers.length} user{activeUsers.length > 1 ? 's' : ''} active
          </span>
        )}
      </div>
    </div>
  );
}
