import { HardHat } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface ComingSoonProps {
  title?: string;
  phase?: number;
}

export function ComingSoonPage({ title = "Feature Under Construction", phase = 2 }: ComingSoonProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={HardHat}
        title={title}
        description={`This enterprise feature is scheduled for development in Phase ${phase} of the roadmap.`}
      />
    </div>
  );
}
