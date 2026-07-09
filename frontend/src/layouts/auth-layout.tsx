import { Outlet, Navigate } from 'react-router';
import { useAuth } from '@/contexts/AuthProvider';
import { Zap } from 'lucide-react';

export function AuthLayout() {
  const { isAuthenticated } = useAuth();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#070B14]">
      {/* Background radial gradient glow */}
      <div className="absolute inset-0 bg-vault-hero opacity-80 pointer-events-none" />

      {/* Grid texture overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.02] bg-grid-dark bg-grid" />

      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-[#6366F1]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/8 blur-[100px]" />
        <div className="absolute top-1/2 left-0 h-[300px] w-[300px] rounded-full bg-[#3B82F6]/6 blur-[80px]" />
      </div>

      {/* Left brand panel — hidden on mobile */}
      <div className="relative z-10 hidden lg:flex lg:w-[50%] flex-col justify-between px-16 py-16 border-r border-white/[0.04]">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] shadow-lg shadow-indigo-500/30">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">CloudVault</span>
        </div>

        {/* Central value prop */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-white">
              Enterprise cloud<br />
              <span className="gradient-text-accent">
                storage redefined.
              </span>
            </h1>
            <p className="max-w-sm text-[13px] text-[#94A3B8] leading-relaxed">
              Secure, compliant, and blazing-fast file storage built for modern teams. Share, collaborate, and work from anywhere.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['AES-256 Encryption', 'Real-time Sync', 'Team Collaboration', 'OCR Search', 'Version History'].map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-[#94A3B8] backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1]" />
                {f}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[['99.99%', 'Uptime SLA'], ['256-bit', 'Encryption'], ['< 50ms', 'Latency']].map(([val, label]) => (
              <div key={label} className="rounded-[14px] border border-white/[0.06] bg-[#0F172A] p-3.5">
                <p className="text-lg font-bold text-white tracking-tight">{val}</p>
                <p className="text-[10px] text-[#475569] font-bold uppercase tracking-[0.08em] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="rounded-[18px] border border-white/[0.06] bg-[#111827] p-5 shadow-vault">
          <p className="text-[13px] text-[#94A3B8] leading-relaxed italic">
            "CloudVault transformed how our team manages files. The speed and security are unmatched."
          </p>
          <div className="mt-3.5 flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-xs font-bold text-white shadow-md">S</div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Sarah Mitchell</p>
              <p className="text-[10px] text-[#475569] font-semibold mt-0.5">CTO, Apex Systems</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[400px]">
          {/* Mobile-only logo */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] shadow-lg shadow-indigo-500/30">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">CloudVault</h1>
            <p className="text-sm text-[#475569] mt-1 font-medium">Secure File Storage &amp; Collaboration</p>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
export default AuthLayout;
