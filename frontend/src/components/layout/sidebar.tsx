import { Link, useLocation } from 'react-router';
import { cn } from '@/utils/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Files,
  Users,
  Share2,
  Star,
  Trash2,
  Clock,
  Bell,
  Search,
  BarChart2,
  Settings,
  User,
  ShieldCheck,
  ChevronDown,
  Building2,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  HardDrive,
  Sparkles,
  Zap,
  Activity,
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { useStorageAnalytics } from '@/features/storage/hooks/useStorageAnalytics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/* ─── Navigation config ────────────────────────────────────── */
const navGroups = [
  {
    id: 'main',
    items: [
      { name: 'Dashboard',  path: '/dashboard',    icon: LayoutDashboard, color: 'text-indigo-400' },
      { name: 'My Files',   path: '/files',         icon: Files,           color: 'text-blue-400' },
      { name: 'Recent',     path: '/recent',        icon: Clock,           color: 'text-sky-400' },
      { name: 'Favorites',  path: '/favorites',     icon: Star,            color: 'text-amber-400' },
    ],
  },
  {
    id: 'collab',
    label: 'Collaboration',
    items: [
      { name: 'Workspaces', path: '/workspaces',    icon: Users,    color: 'text-emerald-400' },
      { name: 'Shared',     path: '/shared',        icon: Share2,   color: 'text-violet-400' },
      { name: 'Search',     path: '/search',        icon: Search,   color: 'text-cyan-400' },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    items: [
      { name: 'Trash',          path: '/trash',         icon: Trash2,    color: 'text-rose-400' },
      { name: 'Notifications',  path: '/notifications', icon: Bell,      color: 'text-orange-400' },
      { name: 'Analytics',      path: '/analytics',     icon: BarChart2, color: 'text-purple-400' },
      { name: 'Administration', path: '/admin',         icon: ShieldCheck,color: 'text-red-400' },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/* ─── Helper ───────────────────────────────────────────────── */
function getInitials(name?: string) {
  if (!name) return 'U';
  const parts = name.split(/[\s_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/* ─── StorageMeter ─────────────────────────────────────────── */
function StorageMeter({ used, limit, pct }: { used: number; limit: number; pct: number }) {
  const color = pct > 85 ? '#EF4444' : pct > 65 ? '#F59E0B' : '#6366F1';
  return (
    <div className="rounded-[14px] border border-white/[0.06] bg-[#0F172A] p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5 text-[#6366F1]" />
          <span className="text-[11px] font-semibold text-[#94A3B8]">Storage</span>
        </div>
        <span className="text-[11px] font-bold text-white">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
        />
      </div>

      <div className="flex justify-between text-[10px] font-medium text-[#475569]">
        <span>{formatBytes(used)} used</span>
        <span>{formatBytes(limit)} total</span>
      </div>
    </div>
  );
}

/* ─── NavItem ──────────────────────────────────────────────── */
function NavItem({
  item,
  isActive,
  isCollapsed,
}: {
  item: { name: string; path: string; icon: React.ElementType; color: string };
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      title={isCollapsed ? item.name : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-[10px] py-2 text-[13px] font-medium transition-all duration-150',
        isCollapsed ? 'justify-center px-0 h-10 w-10 mx-auto' : 'px-3',
        isActive
          ? 'bg-[#6366F1]/10 text-[#818CF8] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]'
          : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-white/[0.04]'
      )}
    >
      {/* Active left bar */}
      {isActive && !isCollapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#6366F1]" />
      )}

      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-all duration-150',
          isActive ? item.color : 'text-[#475569] group-hover:text-[#64748B]'
        )}
      />

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="truncate overflow-hidden whitespace-nowrap"
          >
            {item.name}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Tooltip when collapsed */}
      {isCollapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 hidden group-hover:flex items-center whitespace-nowrap rounded-lg bg-[#161F2F] border border-white/[0.08] px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-xl">
          {item.name}
        </span>
      )}
    </Link>
  );
}

/* ─── Main Sidebar ─────────────────────────────────────────── */
export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const { user, logout } = useAuth();
  const { storageUsed, storageLimit, usagePercentage } = useStorageAnalytics();

  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/' || location.pathname.startsWith('/dashboard')
      : location.pathname.startsWith(path);

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-full flex-col bg-[#0A0E1A] z-20 overflow-hidden"
      style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
      aria-label="Main navigation"
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div className={cn(
        'flex h-16 items-center border-b px-3 shrink-0',
        'border-white/[0.05]',
        isCollapsed ? 'justify-center' : 'justify-between'
      )}>
        <AnimatePresence initial={false} mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="brand-full"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5"
            >
              {/* Logo mark */}
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] shadow-lg shadow-indigo-500/30">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-[14px] font-bold tracking-tight text-white">CloudVault</span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#475569] leading-none">Enterprise</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="brand-icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] shadow-lg shadow-indigo-500/30"
            >
              <Zap className="h-4 w-4 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#475569] hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Collapse sidebar (Ctrl+B)"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Workspace Switcher ─────────────────────────────── */}
      {currentWorkspace && (
        <div className={cn('shrink-0 pt-4 pb-3', isCollapsed ? 'px-2' : 'px-3')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center rounded-[12px] border border-white/[0.06] bg-[#0F172A]',
                  'hover:border-[#6366F1]/30 hover:bg-[#161F2F] transition-all duration-150',
                  'focus:outline-none focus:ring-1 focus:ring-[#6366F1]/40',
                  isCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-2 gap-2'
                )}
                aria-label="Switch workspace"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-white font-bold text-[10px]',
                    currentWorkspace.workspaceType === 'PERSONAL'
                      ? 'bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]'
                      : 'bg-gradient-to-br from-[#10B981] to-[#0EA5E9]'
                  )}>
                    {currentWorkspace.workspaceType === 'PERSONAL'
                      ? <User className="h-3.5 w-3.5" />
                      : <Building2 className="h-3.5 w-3.5" />
                    }
                  </div>
                  {!isCollapsed && (
                    <span className="truncate text-[12px] font-semibold text-[#94A3B8]">
                      {currentWorkspace.name}
                    </span>
                  )}
                </div>
                {!isCollapsed && <ChevronDown className="h-3 w-3 shrink-0 text-[#475569]" />}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-60 bg-[#111827] border-white/[0.08] text-[#94A3B8] rounded-[14px] shadow-vault-xl p-1.5"
              align="start"
              sideOffset={6}
            >
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#475569] px-2 py-1.5">
                Workspaces
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.05] my-1" />
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => switchWorkspace(ws.id)}
                  className="flex items-center justify-between py-2 px-2 cursor-pointer rounded-[10px] hover:bg-white/[0.05] hover:text-white focus:bg-white/[0.05] focus:text-white"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-white text-[9px] font-bold',
                      ws.workspaceType === 'PERSONAL'
                        ? 'bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]'
                        : 'bg-gradient-to-br from-[#10B981] to-[#0EA5E9]'
                    )}>
                      {ws.workspaceType === 'PERSONAL'
                        ? <User className="h-3 w-3" />
                        : <Building2 className="h-3 w-3" />
                      }
                    </div>
                    <span className="truncate text-[12px] font-medium">{ws.name}</span>
                  </div>
                  {ws.id === currentWorkspace.id && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1] shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-white/[0.05] my-1" />
              <DropdownMenuItem asChild className="cursor-pointer rounded-[10px] hover:bg-white/[0.05] hover:text-white focus:bg-white/[0.05]">
                <Link to="/workspaces" className="flex w-full items-center gap-2.5 py-2 px-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-white/[0.06]">
                    <Plus className="h-3.5 w-3.5 text-[#475569]" />
                  </div>
                  <span className="text-[12px] font-medium text-[#64748B]">Manage workspaces</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden space-y-5 px-3 pb-3"
        aria-label="Primary navigation"
      >
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-0.5">
            <AnimatePresence initial={false}>
              {!isCollapsed && group.label && (
                <motion.p
                  key={`label-${group.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#334155]"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            {group.items.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        ))}

        {/* AI Assistant shortcut */}
        <div className="pt-1">
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#334155]"
              >
                AI
              </motion.p>
            )}
          </AnimatePresence>
          <button
            className={cn(
              'group relative flex w-full items-center gap-3 rounded-[10px] py-2 text-[13px] font-medium transition-all duration-150',
              'text-[#6366F1]/70 hover:text-[#818CF8] hover:bg-[#6366F1]/[0.08]',
              isCollapsed ? 'justify-center px-0 h-10 w-10 mx-auto' : 'px-3'
            )}
            title="AI Assistant (Ctrl+/)"
            aria-label="Open AI Assistant"
            onClick={() => {
              // Trigger global shortcut
              window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', ctrlKey: true }));
            }}
          >
            <Sparkles className="h-4 w-4 shrink-0 text-[#6366F1]" />
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.span
                  key="ai-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="truncate"
                >
                  AI Assistant
                </motion.span>
              )}
            </AnimatePresence>
            {!isCollapsed && (
              <span className="ml-auto text-[10px] text-[#334155] font-mono border border-white/[0.07] bg-white/[0.04] rounded px-1 py-0.5">
                ⌘/
              </span>
            )}
            {isCollapsed && (
              <span className="pointer-events-none absolute left-full ml-3 z-50 hidden group-hover:flex items-center whitespace-nowrap rounded-lg bg-[#161F2F] border border-white/[0.08] px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-xl">
                AI Assistant <span className="ml-2 font-mono text-[#6366F1]">⌘/</span>
              </span>
            )}
          </button>

          {/* Activity quick link */}
          <NavItem
            item={{ name: 'Activity', path: '/notifications', icon: Activity, color: 'text-orange-400' }}
            isActive={isActive('/notifications')}
            isCollapsed={isCollapsed}
          />
        </div>
      </nav>

      {/* ── Collapse expand button (collapsed mode) ─────────── */}
      {isCollapsed && (
        <div className="flex justify-center py-2 border-t border-white/[0.05] shrink-0">
          <button
            onClick={onToggleCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[#475569] hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Expand sidebar (Ctrl+B)"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Storage meter ──────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key="storage"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 px-3 pb-3"
          >
            <StorageMeter
              used={storageUsed}
              limit={storageLimit}
              pct={usagePercentage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── User profile card ──────────────────────────────── */}
      <div className={cn(
        'shrink-0 border-t border-white/[0.05] p-3',
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center rounded-[12px] hover:bg-white/[0.04] transition-all duration-150 text-left focus:outline-none',
                isCollapsed ? 'justify-center p-1' : 'gap-2.5 px-2 py-2'
              )}
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8 shrink-0 ring-1 ring-[#6366F1]/30">
                <AvatarFallback className="bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 text-[#818CF8] font-bold text-[11px]">
                  {getInitials(user?.username)}
                </AvatarFallback>
              </Avatar>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    key="user-info"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-[12px] font-bold text-white truncate leading-tight">
                      {user?.username ?? 'Guest'}
                    </p>
                    <p className="text-[10px] text-[#475569] truncate leading-tight mt-0.5">
                      {user?.email ?? 'guest@cloudvault.io'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-56 bg-[#111827] border-white/[0.08] text-[#94A3B8] rounded-[14px] shadow-vault-xl p-1.5"
            align={isCollapsed ? 'end' : 'start'}
            side="top"
            sideOffset={8}
          >
            <DropdownMenuLabel className="py-2 px-2">
              <p className="text-[13px] font-bold text-white">{user?.username ?? 'Guest'}</p>
              <p className="text-[11px] text-[#475569] truncate">{user?.email ?? 'guest@cloudvault.io'}</p>
              {user?.role && (
                <span className="mt-1.5 inline-flex items-center rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 px-2 py-0.5 text-[10px] font-bold text-[#818CF8] uppercase tracking-wide">
                  {user.role.replace('ROLE_', '')}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.05] my-1" />
            <DropdownMenuItem asChild className="cursor-pointer rounded-[10px] hover:bg-white/[0.05] hover:text-white focus:bg-white/[0.05] focus:text-white py-2 px-2">
              <Link to="/profile" className="flex items-center gap-2.5 w-full">
                <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-white/[0.06]">
                  <User className="h-3.5 w-3.5 text-[#475569]" />
                </div>
                <span className="text-[12px] font-medium">Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer rounded-[10px] hover:bg-white/[0.05] hover:text-white focus:bg-white/[0.05] focus:text-white py-2 px-2">
              <Link to="/settings" className="flex items-center gap-2.5 w-full">
                <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-white/[0.06]">
                  <Settings className="h-3.5 w-3.5 text-[#475569]" />
                </div>
                <span className="text-[12px] font-medium">Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.05] my-1" />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer rounded-[10px] hover:bg-rose-500/10 focus:bg-rose-500/10 py-2 px-2 text-rose-400 focus:text-rose-400"
            >
              <div className="flex items-center gap-2.5 w-full">
                <div className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-rose-500/10">
                  <LogOut className="h-3.5 w-3.5" />
                </div>
                <span className="text-[12px] font-medium">Sign out</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.aside>
  );
}
