import { HardDrive, File, Star, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { type StorageAnalytics } from '../types';
import { motion } from 'framer-motion';

interface StorageCardsProps {
  analytics?: StorageAnalytics;
  storageLimit: number;
}

export function StorageCards({ analytics, storageLimit }: StorageCardsProps) {
  const usage = analytics?.storageUsage || 0;
  const percentage = Math.min(100, Math.round((usage / storageLimit) * 100));

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const cardsData = [
    {
      title: 'Storage Used',
      value: formatSize(usage),
      icon: HardDrive,
      colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      description: `of ${formatSize(storageLimit)} quota used`,
      isStorage: true
    },
    {
      title: 'Total Files',
      value: analytics?.fileCount || 0,
      icon: File,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'Active items in personal space',
      isStorage: false
    },
    {
      title: 'Starred Items',
      value: analytics?.starredCount || 0,
      icon: Star,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: 'Starred files and folders',
      isStorage: false
    },
    {
      title: 'De-duplication Savings',
      value: formatSize(analytics?.duplicateSavings || 0),
      icon: Award,
      colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      description: 'Saved via content hashing',
      isStorage: false
    }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cardsData.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.08 }}
        >
          <Card className="bg-[#151b2f] border-[#1e293b]/40 shadow-lg hover:shadow-xl hover:shadow-indigo-600/5 glow-border overflow-hidden transition-all duration-300 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-xs font-semibold text-gray-400 tracking-wider uppercase">
                {card.title}
              </CardTitle>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${card.colorClass}`}>
                <card.icon className="h-4.5 w-4.5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold tracking-tight text-white">{card.value}</div>
              
              {card.isStorage ? (
                <div className="space-y-1.5 pt-1">
                  <Progress value={percentage} className="h-1.5 bg-[#0b0f19]">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                  </Progress>
                  <p className="text-[10px] text-gray-500 flex justify-between font-semibold">
                    <span>{percentage}% used</span>
                    <span>{card.description}</span>
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 font-medium">
                  {card.description}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
