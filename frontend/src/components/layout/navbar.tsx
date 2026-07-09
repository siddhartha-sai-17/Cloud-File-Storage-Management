import { Moon, Sun, Menu, Sparkles, Users, Upload, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeProvider';
import { UserAvatarMenu } from './user-avatar-menu';
import { GlobalSearchBar } from '@/features/search/components/GlobalSearchBar';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { LivePresenceIndicator } from '@/features/realtime/components/LivePresenceIndicator';
import { useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FolderPlus } from 'lucide-react';

interface NavbarProps {
  onToggleAssistant: () => void;
  onToggleCollab: () => void;
  isCollabOpen: boolean;
  isAssistantOpen: boolean;
}

export function Navbar({ onToggleAssistant, onToggleCollab, isCollabOpen, isAssistantOpen }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between px-4 md:px-6"
      style={{
        background: 'rgba(7, 11, 20, 0.8)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* ── Left: Mobile menu + Live presence ─────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 text-[#475569] hover:text-white hover:bg-white/[0.06] rounded-[8px]"
          aria-label="Open mobile menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="hidden lg:flex items-center">
          <LivePresenceIndicator />
        </div>
      </div>

      {/* ── Center: Global Search ──────────────────────────── */}
      <div className="flex-1 max-w-lg mx-4 hidden md:block">
        <div className="relative group">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]">
            <Search className="h-3.5 w-3.5" />
          </div>
          <GlobalSearchBar />
          {/* ⌘K hint */}
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5">
            <kbd className="kbd">⌘</kbd>
            <kbd className="kbd">K</kbd>
          </div>
        </div>
      </div>

      {/* ── Right: Actions ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5">

        {/* Create / New button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-[9px] bg-[#6366F1] hover:bg-[#5558DD] text-white font-semibold text-[12px] shadow-[0_0_16px_rgba(99,102,241,0.3)] border-0 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="w-48 bg-[#111827] border-white/[0.08] text-[#94A3B8] rounded-[14px] shadow-vault-xl p-1.5"
          >
            <DropdownMenuItem
              className="flex items-center gap-2.5 py-2 px-2 rounded-[10px] cursor-pointer hover:bg-white/[0.05] hover:text-white"
              onClick={() => navigate('/files')}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-[#6366F1]/15">
                <Upload className="h-3.5 w-3.5 text-[#818CF8]" />
              </div>
              <span className="text-[12px] font-medium">Upload Files</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.05] my-1" />
            <DropdownMenuItem
              className="flex items-center gap-2.5 py-2 px-2 rounded-[10px] cursor-pointer hover:bg-white/[0.05] hover:text-white"
              onClick={() => navigate('/files')}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-emerald-500/15">
                <FolderPlus className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <span className="text-[12px] font-medium">New Folder</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px bg-white/[0.07] mx-1" />

        {/* Collab sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollab}
          aria-label="Toggle collaboration sidebar"
          title="Collaboration feed"
          className={cn_nav(
            isCollabOpen
              ? 'text-[#6366F1] bg-[#6366F1]/10 ring-1 ring-[#6366F1]/25'
              : 'text-[#475569] hover:text-[#94A3B8] hover:bg-white/[0.05]'
          )}
        >
          <Users className="h-4 w-4" />
        </Button>

        {/* AI Assistant toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAssistant}
          aria-label="Toggle AI assistant (Ctrl+/)"
          title="AI Assistant (Ctrl+/)"
          className={cn_nav(
            isAssistantOpen
              ? 'text-[#818CF8] bg-[#6366F1]/10 ring-1 ring-[#6366F1]/25 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
              : 'text-[#6366F1]/70 hover:text-[#818CF8] hover:bg-[#6366F1]/[0.08]'
          )}
        >
          <Sparkles className="h-4 w-4" />
        </Button>

        {/* Notification bell */}
        <NotificationBell />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle color theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="text-[#475569] hover:text-[#94A3B8] hover:bg-white/[0.05] h-8 w-8 rounded-[8px] transition-all"
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 text-amber-400" />
            : <Moon className="h-4 w-4" />
          }
        </Button>

        {/* Divider */}
        <div className="h-5 w-px bg-white/[0.07] mx-1" />

        {/* User avatar */}
        <UserAvatarMenu />
      </div>
    </header>
  );
}

/* tiny local helper to keep JSX clean */
function cn_nav(...classes: (string | false | undefined)[]) {
  return ['h-8 w-8 rounded-[8px] transition-all', ...classes].filter(Boolean).join(' ');
}
