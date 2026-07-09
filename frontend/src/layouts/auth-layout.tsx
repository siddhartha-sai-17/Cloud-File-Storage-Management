import { Outlet, Navigate } from 'react-router';
import { useAuth } from '@/contexts/AuthProvider';

export function AuthLayout() {
  const { isAuthenticated } = useAuth();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      className="relative flex min-h-screen overflow-hidden"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, #1a1040 0%, #0a0d1a 60%, #060810 100%)' }}
    >
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
        <div className="absolute top-1/2 left-0 h-[300px] w-[300px] rounded-full bg-blue-600/6 blur-[80px]" />
      </div>

      {/* Grid texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Left brand panel — hidden on mobile */}
      <div className="relative z-10 hidden lg:flex lg:w-[52%] flex-col justify-between px-16 py-16">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">CloudEnterprise</span>
        </div>

        {/* Central value prop */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white">
              Enterprise cloud<br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                storage redefined.
              </span>
            </h1>
            <p className="max-w-sm text-base text-gray-400 leading-relaxed">
              Secure, compliant, and blazing-fast file storage built for modern teams. Share, collaborate, and work from anywhere.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['AES-256 Encryption', 'Real-time Sync', 'Team Collaboration', 'OCR Search', 'Version History'].map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                {f}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[['99.99%', 'Uptime SLA'], ['256-bit', 'Encryption'], ['< 50ms', 'Latency']].map(([val, label]) => (
              <div key={label} className="rounded-xl border border-white/8 bg-white/4 p-3">
                <p className="text-xl font-bold text-white">{val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="rounded-2xl border border-white/8 bg-white/4 backdrop-blur-sm p-5">
          <p className="text-sm text-gray-300 leading-relaxed italic">
            "CloudEnterprise transformed how our team manages files. The speed and security are unmatched."
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">S</div>
            <div>
              <p className="text-xs font-semibold text-white">Sarah Mitchell</p>
              <p className="text-[10px] text-gray-600">CTO, Apex Systems</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[420px]">
          {/* Mobile-only logo */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">CloudEnterprise</h1>
            <p className="text-sm text-gray-500 mt-1">Secure File Storage &amp; Collaboration</p>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
