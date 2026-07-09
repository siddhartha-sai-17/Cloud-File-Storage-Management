import { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { AuthLayout } from '@/layouts/auth-layout';
import { MainLayout } from '@/layouts/main-layout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Lazy load all page components for route-level code splitting
// Pages with default exports can be imported directly
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const FilesPage = lazy(() => import('@/pages/files'));
const SearchPage = lazy(() => import('@/pages/search'));
const WorkspacesPage = lazy(() => import('@/pages/workspaces'));
const AcceptInvitationPage = lazy(() => import('@/pages/accept-invitation'));
const FavoritesPage = lazy(() => import('@/pages/favorites'));
const TrashPage = lazy(() => import('@/pages/trash'));
const RecentPage = lazy(() => import('@/pages/recent'));
const AnalyticsPage = lazy(() => import('@/pages/analytics'));
const AdminPage = lazy(() => import('@/pages/admin'));

// Pages with only named exports use the module adapter pattern
const LoginPage = lazy(() =>
  import('@/pages/auth/login').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('@/pages/auth/register').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/forgot-password').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/reset-password').then((m) => ({ default: m.ResetPasswordPage }))
);
const SharedPage = lazy(() =>
  import('@/pages/shared').then((m) => ({ default: m.SharedPage }))
);
const ComingSoonPage = lazy(() =>
  import('@/pages/coming-soon').then((m) => ({ default: m.ComingSoonPage }))
);
const NotFoundPage = lazy(() =>
  import('@/pages/not-found').then((m) => ({ default: m.NotFoundPage }))
);

// Fullscreen loading fallback for route transitions
function PageLoading() {
  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-3">
      <LoadingSpinner size={32} />
      <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>
    </div>
  );
}

function S(Component: React.ComponentType<any>, props?: Record<string, any>) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Component {...props} />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // Auth routes
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: S(LoginPage) },
      { path: '/register', element: S(RegisterPage) },
      { path: '/forgot-password', element: S(ForgotPasswordPage) },
      { path: '/reset-password', element: S(ResetPasswordPage) },
    ],
  },
  // Protected app routes
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: S(DashboardPage) },
      { path: '/dashboard', element: S(DashboardPage) },

      // Phase 2: File Management
      { path: '/files', element: S(FilesPage) },
      { path: '/upload', element: S(FilesPage) },
      { path: '/folders', element: S(FilesPage) },

      // Phase 3: Search, OCR, Versioning
      { path: '/search', element: S(SearchPage) },

      // Phase 4: Workspaces & RBAC
      { path: '/workspaces', element: S(WorkspacesPage) },
      { path: '/workspaces/:workspaceId', element: S(WorkspacesPage) },
      { path: '/invitations/accept/:token', element: S(AcceptInvitationPage) },

      // Phase 5: Collaboration & Sharing
      { path: '/shared', element: S(SharedPage) },
      { path: '/notifications', element: S(ComingSoonPage, { title: 'Notification Center', phase: 5 }) },

      // Phase 6: Enterprise Features
      { path: '/favorites', element: S(FavoritesPage) },
      { path: '/trash', element: S(TrashPage) },
      { path: '/recent', element: S(RecentPage) },
      { path: '/analytics', element: S(AnalyticsPage) },
      { path: '/admin', element: S(AdminPage) },

      // Account
      { path: '/profile', element: S(ComingSoonPage, { title: 'Profile', phase: 7 }) },
      { path: '/settings', element: S(ComingSoonPage, { title: 'Settings', phase: 7 }) },
      { path: '/help', element: S(ComingSoonPage, { title: 'Help & Support', phase: 7 }) },
    ],
  },
  // 404
  { path: '*', element: S(NotFoundPage) },
]);

