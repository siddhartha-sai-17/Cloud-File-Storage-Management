import { useState } from 'react';
import { Star } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { cn } from '@/utils/utils';

interface FavoriteToggleProps {
  fileId: number;
  initialStarred: boolean;
  className?: string;
}

export function FavoriteToggle({ fileId, initialStarred, className }: FavoriteToggleProps) {
  const { star, unstar } = useFavorites();
  const [starred, setStarred] = useState(initialStarred);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (starred) {
        await unstar(fileId);
        setStarred(false);
      } else {
        await star(fileId);
        setStarred(true);
      }
    } catch {
      // Revert on error
      setStarred(initialStarred);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'p-1.5 rounded-full hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      aria-label={starred ? 'Unstar file' : 'Star file'}
      disabled={loading}
    >
      <Star
        className={cn(
          'h-4 w-4 transition-transform duration-200 active:scale-125',
          starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        )}
      />
    </button>
  );
}
