import { useAuth } from '@/contexts/AuthProvider';
import { AdminDashboard } from '@/features/admin/components/AdminDashboard';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';
import { motion } from 'framer-motion';

export function AdminPage() {
  const { user } = useAuth();

  const isSystemAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'ROLE_ADMIN' ||
    user?.role === 'SYSTEM_ADMIN';

  if (!isSystemAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center space-y-5 max-w-md p-8 vault-card"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 mx-auto">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-white">403 — Access Denied</h2>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            You do not have the required administrative permissions to access the system console. Please contact your administrator.
          </p>
          <Button asChild className="bg-[#6366F1] hover:bg-[#5558DD] text-white font-semibold rounded-[10px] px-5">
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <p className="label-caps">Administration Console</p>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-[#6366F1]" />
          System Settings & Control
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Monitor system load, manage default limits, check background workers, and view user audit logs.
        </p>
      </motion.div>

      <AdminDashboard />
    </div>
  );
}

export default AdminPage;
