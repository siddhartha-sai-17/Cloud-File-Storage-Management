import { TrendingUp, HardDrive, Files } from 'lucide-react';
import { motion } from 'framer-motion';

interface StorageOverviewProps {
  usedBytes: number;
  growthPercentage: number;
  largestCount: number;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const overviewItems = (usedBytes: number, growthPercentage: number, largestCount: number) => [
  {
    label: 'Storage Consumed',
    value: formatSize(usedBytes),
    icon: HardDrive,
    iconBg: 'bg-[#6366F1]/15 border-[#6366F1]/25',
    iconColor: 'text-[#818CF8]',
    accent: '#6366F1',
  },
  {
    label: 'Monthly Storage Growth',
    value: `${growthPercentage >= 0 ? '+' : ''}${growthPercentage.toFixed(2)}%`,
    icon: TrendingUp,
    iconBg: 'bg-[#10B981]/15 border-[#10B981]/25',
    iconColor: 'text-[#34D399]',
    accent: '#10B981',
  },
  {
    label: 'Indexable Files',
    value: `${largestCount} items`,
    icon: Files,
    iconBg: 'bg-[#3B82F6]/15 border-[#3B82F6]/25',
    iconColor: 'text-[#60A5FA]',
    accent: '#3B82F6',
  },
];

export function StorageOverview({ usedBytes, growthPercentage, largestCount }: StorageOverviewProps) {
  const items = overviewItems(usedBytes, growthPercentage, largestCount);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.07 }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
          className="vault-card p-5"
        >
          {/* Top accent line */}
          <div className="h-0.5 w-8 rounded-full mb-4" style={{ backgroundColor: item.accent }} />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="label-caps">{item.label}</p>
              <p className="text-2xl font-bold tracking-tight text-white mt-2">{item.value}</p>
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border ${item.iconBg}`}>
              <item.icon className={`h-5 w-5 ${item.iconColor}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
