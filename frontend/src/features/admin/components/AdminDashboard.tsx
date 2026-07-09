import { useState } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import { SystemOverview } from './SystemOverview';
import { QuotaManager } from './QuotaManager';
import { StorageHealth } from './StorageHealth';
import { UserStorageTable } from './UserStorageTable';
import { MonitoringDashboard } from './MonitoringDashboard';

import { Shield, Settings, AlertTriangle, Users, HardDrive, RefreshCw, Activity } from 'lucide-react';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'config' | 'health' | 'users' | 'monitoring'>('dashboard');
  const { stats, isLoadingStats } = useAdmin();

  if (isLoadingStats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
        <span>Loading administration metrics…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            Administration Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global platfrom storage diagnostics, usage quotas, and deduplication registry controls.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: <HardDrive className="h-4 w-4" /> },
          { id: 'config', label: 'Configuration', icon: <Settings className="h-4 w-4" /> },
          { id: 'health', label: 'Duplicates & Health', icon: <AlertTriangle className="h-4 w-4" /> },
          { id: 'users', label: 'User Operations', icon: <Users className="h-4 w-4" /> },
          { id: 'monitoring', label: 'Monitoring', icon: <Activity className="h-4 w-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-4">
        {activeTab === 'dashboard' && stats && <SystemOverview stats={stats} />}
        {activeTab === 'config' && <QuotaManager />}
        {activeTab === 'health' && <StorageHealth />}
        {activeTab === 'users' && <UserStorageTable />}
        {activeTab === 'monitoring' && <MonitoringDashboard />}
      </div>
    </div>
  );
}
