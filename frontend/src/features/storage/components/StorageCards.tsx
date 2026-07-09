import { HardDrive, File, Star, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { type StorageAnalytics } from '../types';
import { motion } from 'framer-motion';

interface StorageCardsProps {
  analytics?: StorageAnalytics;
  storageLimit: number;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const cards = (analytics?: StorageAnalytics, storageLimit = 1) => {
  const usage = analytics?.storageUsage || 0;
  const pct = Math.min(100, Math.round((usage / storageLimit) * 100));
  return [
    {
      title: 'Storage Used',
      value: formatSize(usage),
      icon: HardDrive,
      gradient: 'from-[#6366F1]/20 via-[#6366F1]/10 to-transparent',
      iconBg: 'bg-[#6366F1]/15 border-[#6366F1]/20',
      iconColor: 'text-[#818CF8]',
      accent: '#6366F1',
      description: `${pct}% of ${formatSize(storageLimit)} quota`,
      isStorage: true,
      pct,
      barGradient: pct > 85
        ? 'from-rose-500 to-red-600'
        : pct > 65
          ? 'from-amber-500 to-orange-500'
          : 'from-[#6366F1] to-[#8B5CF6]',
      trend: { label: pct > 85 ? 'High usage' : 'Healthy', up: pct > 65 },
    },
    {
      title: 'Total Files',
      value: analytics?.fileCount ?? 0,
      icon: File,
      gradient: 'from-[#10B981]/20 via-[#10B981]/10 to-transparent',
      iconBg: 'bg-[#10B981]/15 border-[#10B981]/20',
      iconColor: 'text-[#34D399]',
      accent: '#10B981',
      description: 'Active files in workspace',
      isStorage: false,
      trend: { label: 'Indexed', up: true },
    },
    {
      title: 'Starred Items',
      value: analytics?.starredCount ?? 0,
      icon: Star,
      gradient: 'from-[#F59E0B]/20 via-[#F59E0B]/10 to-transparent',
      iconBg: 'bg-[#F59E0B]/15 border-[#F59E0B]/20',
      iconColor: 'text-[#FCD34D]',
      accent: '#F59E0B',
      description: 'Favorited files & folders',
      isStorage: false,
      trend: { label: 'Pinned', up: true },
    },
    {
      title: 'Dedup Savings',
      value: formatSize(analytics?.duplicateSavings || 0),
      icon: Award,
      gradient: 'from-[#8B5CF6]/20 via-[#8B5CF6]/10 to-transparent',
      iconBg: 'bg-[#8B5CF6]/15 border-[#8B5CF6]/20',
      iconColor: 'text-[#A78BFA]',
      accent: '#8B5CF6',
      description: 'Saved via content hashing',
      isStorage: false,
      trend: { label: 'Optimized', up: true },
    },
  ];
};

export function StorageCards({ analytics, storageLimit }: StorageCardsProps) {
  const data = cards(analytics, storageLimit);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.07, ease: [0.4, 0, 0.2, 1] }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
          className="vault-card group cursor-default"
        >
          {/* Gradient header strip */}
          <div className={`h-1 w-full rounded-t-[18px] bg-gradient-to-r ${card.gradient.replace('via-', 'to-').split(' ').slice(0, 2).join(' ')}`}
            style={{ background: `linear-gradient(90deg, ${card.accent}40, transparent)` }}
          />

          <div className="p-5 space-y-4">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] border ${card.iconBg}`}>
                <card.icon className={`h-4.5 w-4.5 ${card.iconColor}`} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em]"
                style={{ color: card.accent + 'bb' }}>
                {card.trend.up
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />
                }
                {card.trend.label}
              </div>
            </div>

            {/* Value */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#475569] mb-1">
                {card.title}
              </p>
              <p className="text-2xl font-bold tracking-tight text-white">
                {card.value}
              </p>
            </div>

            {/* Storage progress or description */}
            {card.isStorage && 'pct' in card ? (
              <div className="space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${card.pct}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 + i * 0.07 }}
                    className={`h-full rounded-full bg-gradient-to-r ${card.barGradient}`}
                  />
                </div>
                <p className="text-[10px] text-[#475569] font-medium">{card.description}</p>
              </div>
            ) : (
              <p className="text-[11px] text-[#475569] font-medium leading-relaxed">{card.description}</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
