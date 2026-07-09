import { Link, useLocation } from 'react-router';
import { cn } from '@/utils/utils';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Files, 
  Upload, 
  FolderTree, 
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
  HardDrive
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
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const sidebarGroups = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'File Management',
    items: [
      { name: 'My Files', path: '/files', icon: Files },
      { name: 'Upload', path: '/upload', icon: Upload },
      { name: 'Folders', path: '/folders', icon: FolderTree },
      { name: 'Recent', path: '/recent', icon: Clock },
      { name: 'Favorites', path: '/favorites', icon: Star },
    ]
  },
  {
    title: 'Collaboration',
    items: [
      { name: 'Workspaces', path: '/workspaces', icon: Users },
      { name: 'Shared', path: '/shared', icon: Share2 },
    ]
  },
  {
    title: 'Tools',
    items: [
      { name: 'Search', path: '/search', icon: Search },
      { name: 'Notifications', path: '/notifications', icon: Bell },
      { name: 'Trash', path: '/trash', icon: Trash2 },
    ]
  },
  {
    title: 'Enterprise',
    items: [
      { name: 'Analytics', path: '/analytics', icon: BarChart2 },
      { name: 'Administration', path: '/admin', icon: ShieldCheck },
    ]
  }
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const { user, logout } = useAuth();
  const { storageUsed, storageLimit, usagePercentage } = useStorageAnalytics();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <motion.div 
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex h-full flex-col border-r border-[#1e293b]/50 bg-[#0b0f19] px-3 py-4 text-foreground shadow-xl z-20 overflow-hidden"
    >
      {/* Sidebar Header & Brand Logo */}
      <div className="mb-6 flex h-10 items-center justify-between px-3">
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-600/30">
              C
            </div>
            <span className="text-base font-bold tracking-wider bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              CloudVault
            </span>
          </motion.div>
        )}
        {isCollapsed && (
          <div className="flex h-7 w-7 mx-auto items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-600/30">
            C
          </div>
        )}

        {/* Collapse Toggle Button */}
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Collapse Sidebar (Ctrl+B)"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Workspace Switcher */}
      {currentWorkspace && (
        <div className="mb-6 px-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex w-full items-center gap-2 rounded-lg border border-[#1e293b]/50 bg-[#151b2f] text-sm font-medium hover:bg-white/5 focus:outline-none transition-all shadow-md",
                isCollapsed ? "justify-center p-2" : "justify-between px-3 py-2"
              )}>
                <div className="flex items-center gap-2 text-left truncate">
                  <div className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white font-semibold text-[10px]",
                    currentWorkspace.workspaceType === 'PERSONAL' ? "bg-indigo-600" : "bg-emerald-600"
                  )}>
                    {currentWorkspace.workspaceType === 'PERSONAL' ? <User className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                  </div>
                  {!isCollapsed && <span className="truncate text-gray-200">{currentWorkspace.name}</span>}
                </div>
                {!isCollapsed && <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#111827] border-[#1e293b]/60 text-gray-200" align="start">
              <DropdownMenuLabel className="text-gray-400 text-xs">Select Workspace</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#1e293b]/50" />
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => switchWorkspace(ws.id)}
                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/5"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded text-white text-[9px] font-bold",
                      ws.workspaceType === 'PERSONAL' ? "bg-indigo-600" : "bg-emerald-600"
                    )}>
                      {ws.workspaceType === 'PERSONAL' ? <User className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                    </div>
                    <span className="truncate text-sm">{ws.name}</span>
                  </div>
                  {ws.id === currentWorkspace.id && (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-[#1e293b]/50" />
              <DropdownMenuItem asChild className="cursor-pointer py-2 hover:bg-white/5">
                <Link to="/workspaces" className="flex w-full items-center gap-2">
                  <Plus className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">Manage Workspaces</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Sidebar Navigation */}
      <div className="flex-1 space-y-4 overflow-y-auto px-1">
        {sidebarGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isCollapsed && (
              <motion.h4 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase"
              >
                {group.title}
              </motion.h4>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    title={isCollapsed ? item.name : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all relative overflow-hidden",
                      isCollapsed ? "justify-center px-0 h-10" : "px-3",
                      isActive
                        ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 rounded-l-none"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn(
                      "h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110",
                      isActive ? "text-indigo-400" : "text-gray-400"
                    )} />
                    {!isCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="truncate text-xs font-semibold"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Collapsed Expand Trigger Button */}
      {isCollapsed && (
        <div className="py-2 flex justify-center border-t border-[#1e293b]/40 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5"
            title="Expand Sidebar (Ctrl+B)"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Storage Indicator */}
      {!isCollapsed && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-auto border-t border-[#1e293b]/30 pt-4 px-2 mb-4 space-y-2"
        >
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5 font-medium">
              <HardDrive className="h-3.5 w-3.5 text-indigo-500" />
              Storage Used
            </span>
            <span className="font-bold text-gray-200">{usagePercentage}%</span>
          </div>
          <Progress value={usagePercentage} className="h-1.5 bg-[#151b2f]">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${usagePercentage}%` }} />
          </Progress>
          <div className="text-[10px] text-gray-500 flex justify-between font-semibold">
            <span>{formatBytes(storageUsed)}</span>
            <span>{formatBytes(storageLimit)}</span>
          </div>
        </motion.div>
      )}

      {/* User profile / Logout bottom footer card */}
      <div className="border-t border-[#1e293b]/40 pt-3 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-2 w-full hover:bg-white/5 rounded-lg transition-all text-left",
              isCollapsed ? "justify-center p-1" : "p-2"
            )}>
              <Avatar className="h-8 w-8 border border-indigo-600/30">
                <AvatarFallback className="bg-indigo-600/20 text-indigo-400 font-bold text-xs">
                  {getInitials(user?.username)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-200 truncate leading-none mb-1">
                    {user?.username || 'Guest'}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate leading-none">
                    {user?.email || 'guest@enterprise.com'}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-[#111827] border-[#1e293b]/60 text-gray-200" align={isCollapsed ? "right" : "start"}>
            <DropdownMenuLabel className="font-normal py-2.5">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-gray-200 leading-none">{user?.username || 'Guest'}</p>
                <p className="text-xs text-gray-500 leading-none truncate">{user?.email || 'guest@enterprise.com'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#1e293b]/50" />
            <DropdownMenuItem asChild className="hover:bg-white/5 cursor-pointer">
              <Link to="/profile" className="flex items-center py-2 w-full">
                <User className="mr-2 h-4 w-4 text-gray-400" />
                <span className="text-sm">Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="hover:bg-white/5 cursor-pointer">
              <Link to="/settings" className="flex items-center py-2 w-full">
                <Settings className="mr-2 h-4 w-4 text-gray-400" />
                <span className="text-sm">Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1e293b]/50" />
            <DropdownMenuItem onClick={logout} className="text-red-500 hover:bg-red-500/10 cursor-pointer focus:bg-red-500/10 focus:text-red-500 py-2">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="text-sm">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
