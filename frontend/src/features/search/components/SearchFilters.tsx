import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type AdvancedFilters } from '../hooks/useAdvancedSearch';

interface SearchFiltersProps {
  filters: AdvancedFilters;
  onFilterChange: (updates: Partial<AdvancedFilters>) => void;
  onReset: () => void;
  onApply: () => void;
}

export function SearchFilters({
  filters,
  onFilterChange,
  onReset,
  onApply,
}: SearchFiltersProps) {
  return (
    <div className="p-4 space-y-4 w-80 border rounded-lg bg-card text-card-foreground shadow-lg">
      <div className="space-y-1">
        <h4 className="font-semibold text-sm leading-none">Advanced Search</h4>
        <p className="text-xs text-muted-foreground">Filter your workspace files</p>
      </div>

      <div className="grid gap-3">
        {/* Extension */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ext-input" className="text-xs">File Extension</Label>
          <Input
            id="ext-input"
            placeholder="e.g. pdf, txt, png"
            value={filters.extension || ''}
            onChange={(e) => onFilterChange({ extension: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-select" className="text-xs">Category</Label>
          <select
            id="category-select"
            value={filters.category || ''}
            onChange={(e) => onFilterChange({ category: e.target.value })}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Any Category</option>
            <option value="DOCUMENT">Documents</option>
            <option value="IMAGE">Images</option>
            <option value="VIDEO">Videos</option>
            <option value="AUDIO">Audio</option>
            <option value="CODE">Code Files</option>
          </select>
        </div>

        {/* Size */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="size-select" className="text-xs">File Size</Label>
          <select
            id="size-select"
            value={filters.size || ''}
            onChange={(e) => onFilterChange({ size: e.target.value as any })}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="">Any Size</option>
            <option value="small">Small (&lt; 1MB)</option>
            <option value="medium">Medium (1MB - 10MB)</option>
            <option value="large">Large (10MB - 100MB)</option>
            <option value="huge">Huge (&gt; 100MB)</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date-select" className="text-xs">Modified Time</Label>
          <select
            id="date-select"
            value={filters.dateRange || ''}
            onChange={(e) => onFilterChange({ dateRange: e.target.value as any })}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="">Any Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        {/* Owner */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="owner-input" className="text-xs">Owner Username</Label>
          <Input
            id="owner-input"
            placeholder="e.g. alice"
            value={filters.owner || ''}
            onChange={(e) => onFilterChange({ owner: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        {/* Starred Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            id="starred-checkbox"
            type="checkbox"
            checked={!!filters.starred}
            onChange={(e) => onFilterChange({ starred: e.target.checked })}
            className="rounded border-input text-primary focus:ring-primary h-4 w-4"
          />
          <Label htmlFor="starred-checkbox" className="text-xs select-none">Starred Items Only</Label>
        </div>
      </div>

      <div className="flex justify-between pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs">
          Reset
        </Button>
        <Button size="sm" onClick={onApply} className="h-7 text-xs">
          Apply Filters
        </Button>
      </div>
    </div>
  );
}
