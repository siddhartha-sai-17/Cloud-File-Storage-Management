import { useAuth } from '@/contexts/AuthProvider';
import { AdminDashboard } from '@/features/admin/components/AdminDashboard';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';

export function AdminPage() {
  const { user } = useAuth();

  const isSystemAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'ROLE_ADMIN' ||
    user?.role === 'SYSTEM_ADMIN';

  if (!isSystemAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md border p-8 rounded-2xl bg-card shadow-lg">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">403 — Access Denied</h2>
          <p className="text-sm text-muted-foreground">
            You do not have the required administrative permissions to access the system console. Please contact your administrator.
          </p>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AdminDashboard />
    </div>
  );
}
export default AdminPage;
