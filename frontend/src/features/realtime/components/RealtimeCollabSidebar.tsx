import { useLivePresence } from '../hooks/useLivePresence';
import { useLiveActivity } from '../hooks/useLiveActivity';
import { useBackgroundJobs } from '../hooks/useBackgroundJobs';
import { ConnectionStatus } from './ConnectionStatus';
import { useWorkspace } from '@/contexts/WorkspaceProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sparkles, Megaphone, Clock } from 'lucide-react';

export function RealtimeCollabSidebar() {
  const { currentWorkspace } = useWorkspace();
  const { presenceUsers } = useLivePresence('/');
  const { activities } = useLiveActivity(currentWorkspace?.id);
  const { queue } = useBackgroundJobs();

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.slice(0, 2).toUpperCase();
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'UPLOAD': return 'Uploaded file';
      case 'DELETE': return 'Deleted file';
      case 'RENAME': return 'Renamed file';
      case 'MOVE': return 'Moved file';
      case 'COMMENT': return 'Added comment';
      case 'SHARE': return 'Shared file';
      default: return 'Performed action';
    }
  };

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full overflow-hidden" aria-label="Collaboration and realtime activity sidebar">
      {/* Header */}
      <div className="p-4 border-b space-y-3 shrink-0">
        <div>
          <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            Real-time Workspace
            <Sparkles className="h-3 w-3 text-indigo-500" />
          </h2>
          <p className="text-[10px] text-muted-foreground">Collaboration & background workers telemetry</p>
        </div>
        <ConnectionStatus />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Workspace Announcement */}
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl p-3.5 space-y-2">
          <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Megaphone className="h-3.5 w-3.5 shrink-0" />
            Announcement
          </h4>
          <p className="text-[11px] text-foreground font-medium leading-relaxed">
            Storage deduplication analysis runs nightly. Run reindexing in settings for immediate duplicate stats.
          </p>
        </div>

        {/* Online Members */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Online Members ({presenceUsers.length})</h3>
          <div className="space-y-2">
            {presenceUsers.map((user) => {
              const isActive = user.status !== 'IDLE';
              return (
                <div key={user.userId} className="flex items-center gap-3 text-xs">
                  <div className="relative shrink-0">
                    <Avatar className="h-7 w-7 border text-[10px] font-bold">
                      <AvatarFallback className={isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-muted text-muted-foreground'}>
                        {getInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                  </div>
                  <div className="overflow-hidden space-y-0.5">
                    <span className="font-semibold block truncate text-foreground">{user.username}</span>
                    <span className="text-[9px] text-muted-foreground block truncate">
                      {isActive ? `${user.status === 'EDITING' ? 'Editing' : 'Viewing'} ${user.currentPath || '/'}` : 'Idle'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Uploads Queue */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Upload Queue</span>
            {queue.length > 0 && <span className="text-indigo-600 font-bold">{queue.length}</span>}
          </h3>
          {queue.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No active or scheduled transfers</p>
          ) : (
            <div className="space-y-2">
              {queue.slice(0, 3).map((task) => (
                <div key={task.sessionId} className="flex items-center justify-between text-xs py-1">
                  <span className="truncate max-w-[150px] font-medium text-foreground" title={task.filename}>
                    {task.filename}
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Workspace Activity */}
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Live Activity</h3>
          {activities.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No recent events recorded</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="flex gap-2.5 text-[11px] align-top">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="overflow-hidden space-y-0.5">
                    <span className="font-semibold text-foreground truncate block">{act.username}</span>
                    <span className="text-muted-foreground text-[10px] block leading-snug">
                      {getEventLabel(act.eventType)}: {act.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
