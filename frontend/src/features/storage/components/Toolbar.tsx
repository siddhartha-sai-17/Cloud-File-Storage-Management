import { Grid, List, Plus, Search, ArrowUpDown, X, FolderPlus, Upload, Trash2, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/utils';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortBy: 'name' | 'size' | 'date' | 'type';
  onSortByChange: (sort: 'name' | 'size' | 'date' | 'type') => void;
  sortDirection: 'asc' | 'desc';
  onSortDirectionChange: (dir: 'asc' | 'desc') => void;
  onUploadClick: () => void;
  onCreateFolderClick: () => void;
  selectedCount: number;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

const SORT_LABELS: Record<string, string> = { name: 'Name', size: 'Size', date: 'Date', type: 'Type' };

export function Toolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  onUploadClick,
  onCreateFolderClick,
  selectedCount,
  onBulkDelete,
  onClearSelection,
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#1e293b]/40 pb-4 md:flex-row md:items-center md:justify-between">
      {/* Left side: Search or Selection info */}
      <div className="flex flex-1 items-center gap-3">
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5">
            <span className="text-sm font-semibold text-indigo-300">{selectedCount} selected</span>
            <div className="h-4 w-px bg-indigo-500/30" />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-indigo-400 hover:text-white hover:bg-white/5"
              onClick={onClearSelection}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1.5 text-xs font-semibold"
              onClick={onBulkDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        ) : (
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-9 bg-[#151b2f] border-[#1e293b]/50 text-gray-200 placeholder:text-gray-600 focus:border-indigo-500/60 h-9 text-sm rounded-lg"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-gray-500 hover:text-gray-200"
                onClick={() => onSearchChange('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center justify-end gap-2">
        {/* New item menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 border-0 h-9 px-3.5 text-sm font-semibold rounded-lg">
              <Plus className="h-4 w-4" />
              New
              <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#111827] border-[#1e293b]/60 text-gray-200 rounded-xl shadow-2xl">
            <DropdownMenuItem onClick={onCreateFolderClick} className="cursor-pointer hover:bg-white/5 py-2.5 text-sm gap-2">
              <FolderPlus className="h-4 w-4 text-indigo-400" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1e293b]/50" />
            <DropdownMenuItem onClick={onUploadClick} className="cursor-pointer hover:bg-white/5 py-2.5 text-sm gap-2">
              <Upload className="h-4 w-4 text-emerald-400" />
              Upload File
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-[#1e293b]/60 hidden sm:block" />

        {/* Sort menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 bg-[#151b2f] border-[#1e293b]/50 text-gray-300 hover:text-white hover:bg-white/5 h-9 px-3 text-xs font-semibold rounded-lg"
              title="Sort options"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>{SORT_LABELS[sortBy]}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-[#111827] border-[#1e293b]/60 text-gray-200 rounded-xl shadow-2xl">
            {(['name', 'size', 'date', 'type'] as const).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onSortByChange(s)} className="cursor-pointer hover:bg-white/5 py-2 text-sm gap-2">
                <Check className={cn("h-3.5 w-3.5 text-indigo-400", sortBy !== s && "opacity-0")} />
                {SORT_LABELS[s]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-[#1e293b]/50" />
            <DropdownMenuItem onClick={() => onSortDirectionChange('asc')} className="cursor-pointer hover:bg-white/5 py-2 text-sm gap-2">
              <Check className={cn("h-3.5 w-3.5 text-indigo-400", sortDirection !== 'asc' && "opacity-0")} />
              Ascending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortDirectionChange('desc')} className="cursor-pointer hover:bg-white/5 py-2 text-sm gap-2">
              <Check className={cn("h-3.5 w-3.5 text-indigo-400", sortDirection !== 'desc' && "opacity-0")} />
              Descending
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-[#1e293b]/50 bg-[#151b2f] p-0.5 gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewModeChange('grid')}
            className={cn(
              "h-7 w-7 rounded-md transition-all",
              viewMode === 'grid'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
            title="Grid view"
          >
            <Grid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewModeChange('list')}
            className={cn(
              "h-7 w-7 rounded-md transition-all",
              viewMode === 'list'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
            title="List view"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
