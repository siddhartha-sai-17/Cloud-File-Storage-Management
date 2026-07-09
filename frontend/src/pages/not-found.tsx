import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { FileX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070B14] p-6 relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute inset-0 bg-gradient-radial from-[#1a1040]/30 via-transparent to-transparent opacity-60 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center space-y-6 max-w-md relative z-10"
      >
        <div className="flex justify-center">
          <motion.div 
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-white/[0.03] border border-white/[0.06] shadow-vault-lg"
          >
            <FileX className="h-10 w-10 text-[#6366F1]" />
          </motion.div>
        </div>

        <div className="space-y-2">
          <h1 className="text-8xl font-black tracking-tighter gradient-text-brand select-none">
            404
          </h1>
          <h2 className="text-xl font-bold text-white tracking-tight">Page Not Found</h2>
          <p className="text-[13px] text-[#94A3B8] leading-relaxed max-w-xs mx-auto">
            The page you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access to this directory.
          </p>
        </div>

        <div className="pt-2">
          <Button asChild className="bg-[#6366F1] hover:bg-[#5558DD] text-white font-semibold rounded-[10px] px-6 gap-2 transition-all">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
export default NotFoundPage;
