import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchEmptyStateProps {
  onClearFilters?: () => void;
}

export function SearchEmptyState({ onClearFilters }: SearchEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg bg-card min-h-[300px]">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted text-muted-foreground mb-4">
        <Search className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-lg mb-1">No results found</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        We couldn't find any matches. Try refactoring your keyword tokens or updating active filter flags.
      </p>
      {onClearFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear Search Filters
        </Button>
      )}
    </div>
  );
}
