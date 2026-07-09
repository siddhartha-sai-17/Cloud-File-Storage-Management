import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { useAuth } from '@/contexts/AuthProvider';
import { RealtimeProvider } from '@/contexts/RealtimeProvider';
import { RealtimeCollabSidebar } from '@/features/realtime/components/RealtimeCollabSidebar';
import { AiAssistantPanel } from '@/features/realtime/components/AiAssistantPanel';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useOffline } from '@/features/offline/hooks/useOffline';
import { WifiOff } from 'lucide-react';

export function MainLayout() {
  const { isAuthenticated } = useAuth();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isCollabSidebarOpen, setIsCollabSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isOnline } = useOffline();

  // Global Ctrl+/ keyboard shortcut to toggle AI Assistant, Ctrl+B for Sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setIsAssistantOpen((prev) => !prev);
      }
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <RealtimeProvider>
      <div className="flex h-screen overflow-hidden bg-[#070B14] text-foreground">
        {/* Skip navigation link for accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>

        <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Navbar 
            onToggleAssistant={() => setIsAssistantOpen((p) => !p)}
            onToggleCollab={() => setIsCollabSidebarOpen((p) => !p)}
            isCollabOpen={isCollabSidebarOpen}
            isAssistantOpen={isAssistantOpen}
          />
          
          {/* Offline Indicator Banner */}
          {!isOnline && (
            <div 
              role="alert"
              aria-live="assertive"
              className="flex items-center justify-center gap-2 bg-amber-500 text-amber-950 px-4 py-1.5 text-xs font-semibold shadow-inner border-b border-amber-600 animate-slide-down"
            >
              <WifiOff className="h-3.5 w-3.5" />
              <span>Offline Mode: Using cached storage workspace records. Changes will sync when online.</span>
            </div>
          )}

          <div className="flex flex-1 overflow-hidden">
            <main 
              id="main-content" 
              className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 focus:outline-none"
              tabIndex={-1}
            >
              <ErrorBoundary name="MainLayoutOutlet">
                <Outlet />
              </ErrorBoundary>
            </main>
            {isCollabSidebarOpen && <RealtimeCollabSidebar />}
          </div>
        </div>
        <AiAssistantPanel isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} />
      </div>
    </RealtimeProvider>
  );
}

