import { Input } from '@/components/ui/input';

interface TrashFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  typeFilter: 'ALL' | 'FILE' | 'FOLDER';
  onTypeFilterChange: (val: 'ALL' | 'FILE' | 'FOLDER') => void;
}

export function TrashFilters({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
}: TrashFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between pb-4">
      <Input
        placeholder="Search trash bin…"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs focus-visible:ring-primary"
      />
      <div className="flex gap-2">
        {(['ALL', 'FILE', 'FOLDER'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => onTypeFilterChange(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              typeFilter === opt
                ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-950/30'
                : 'bg-background hover:bg-muted text-muted-foreground'
            }`}
          >
            {opt === 'ALL' ? 'All Items' : opt === 'FILE' ? 'Files' : 'Folders'}
          </button>
        ))}
      </div>
    </div>
  );
}
