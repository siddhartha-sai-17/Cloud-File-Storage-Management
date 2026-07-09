import { Moon, Sun, Menu, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeProvider';
import { UserAvatarMenu } from './user-avatar-menu';
import { GlobalSearchBar } from '@/features/search/components/GlobalSearchBar';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { LivePresenceIndicator } from '@/features/realtime/components/LivePresenceIndicator';

interface NavbarProps {
  onToggleAssistant: () => void;
  onToggleCollab: () => void;
  isCollabOpen: boolean;
  isAssistantOpen: boolean;
}

export function Navbar({ onToggleAssistant, onToggleCollab, isCollabOpen, isAssistantOpen }: NavbarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#1e293b]/40 bg-[#070b14]/70 backdrop-blur-md px-4 md:px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden text-gray-400 hover:text-white hover:bg-white/5">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        
        {/* Live Presence Indicator */}
        <div className="hidden lg:block">
          <LivePresenceIndicator />
        </div>
      </div>

      {/* Global Search Bar with Keyboard Hint */}
      <div className="flex-1 max-w-md mx-4 hidden md:block relative group">
        <GlobalSearchBar />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center gap-0.5 rounded border border-[#1e293b] bg-[#151b2f] px-1.5 py-0.5 text-[10px] font-bold text-gray-400 select-none shadow-sm">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Toggle Realtime Collaboration Sidebar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollab}
          className={isCollabOpen 
            ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/30' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
          }
          title="Toggle Collaboration Feed"
          aria-label="Toggle Collaboration Sidebar"
        >
          <Users className="h-4.5 w-4.5" />
        </Button>

        {/* Toggle AI Command Assistant */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAssistant}
          className={isAssistantOpen 
            ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 ring-1 ring-indigo-500/20 shadow-md shadow-indigo-600/10' 
            : 'text-indigo-400/80 hover:text-indigo-300 hover:bg-indigo-500/5'
          }
          title="Toggle AI Assistant (Ctrl+/)"
          aria-label="Toggle AI Command Assistant"
        >
          <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
        </Button>

        {/* Live Notification Bell */}
        <NotificationBell />

        {/* Theme Switcher */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-gray-400 hover:text-white hover:bg-white/5"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4.5 w-4.5 text-amber-400" />
          ) : (
            <Moon className="h-4.5 w-4.5" />
          )}
        </Button>
        
        {/* User profile dropdown trigger */}
        <UserAvatarMenu />
      </div>
    </header>
  );
}
