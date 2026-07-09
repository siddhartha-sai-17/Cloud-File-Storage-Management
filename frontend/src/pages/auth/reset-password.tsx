import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { Lock, AlertTriangle, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetPasswordPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="rounded-[18px] border border-white/[0.08] bg-[#111827] shadow-vault-lg p-8 relative overflow-hidden">
        {/* Top ambient line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]" />

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white">Reset your password</h2>
          <p className="text-[12px] text-[#475569] mt-1 font-medium leading-relaxed">Create a new password for your account</p>
        </div>

        <div className="space-y-5">
          {/* Backend Notice Banner */}
          <div className="flex items-start gap-3 rounded-[12px] border border-amber-500/20 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-400 leading-relaxed">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>Notice:</strong> Password recovery is not yet available in the current backend version. This feature will be enabled in a future release.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reset-password" className="label-caps">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569]" />
              <Input id="reset-password" type="password" placeholder="••••••••" className="pl-10 bg-[#0F172A] border-white/10 text-white placeholder:text-[#334155] rounded-[10px] h-11 text-[13px]" disabled />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reset-confirm-password" className="label-caps">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569]" />
              <Input id="reset-confirm-password" type="password" placeholder="••••••••" className="pl-10 bg-[#0F172A] border-white/10 text-white placeholder:text-[#334155] rounded-[10px] h-11 text-[13px]" disabled />
            </div>
          </div>

          <Button id="reset-submit" className="w-full h-11 bg-white/[0.04] border border-white/[0.08] text-[#475569] font-semibold rounded-[10px] cursor-not-allowed" disabled>
            Reset Password (Coming Soon)
          </Button>
        </div>
      </div>

      {/* Footer link */}
      <p className="text-center text-[12px] text-[#475569] font-medium">
        <Link to="/login" className="font-bold text-[#818CF8] hover:text-[#a5b4fc] transition-colors inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3 w-3" />
          <span>Back to Sign In</span>
        </Link>
      </p>
    </motion.div>
  );
}
export default ResetPasswordPage;
