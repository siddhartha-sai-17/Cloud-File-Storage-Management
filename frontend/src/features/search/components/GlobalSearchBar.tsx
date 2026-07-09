import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, X, SlidersHorizontal, History, Tag, User, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearch } from '../hooks/useSearch';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import { SearchFilters } from './SearchFilters';

export function GlobalSearchBar() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const {
    query,
    setQuery,
    suggestions,
    recentSearches,
    clearHistory,
  } = useSearch();

  const {
    filters,
    updateFilters,
    resetFilters,
    buildQueryWithFilters,
  } = useAdvancedSearch();

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation escape close
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setShowFilters(false);
    }
  };

  const handleSearchSubmit = (searchQuery: string) => {
    if (searchQuery.trim()) {
      setShowDropdown(false);
      setShowFilters(false);
      navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchSubmit(query);
  };

  const handleApplyFilters = () => {
    const combinedQuery = buildQueryWithFilters(query);
    setQuery(combinedQuery);
    setShowFilters(false);
    handleSearchSubmit(combinedQuery);
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    handleSearchSubmit(text);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-xl" onKeyDown={handleKeyDown}>
      <form onSubmit={handleInputSubmit} className="relative flex items-center h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm focus-within:ring-2 focus-within:ring-primary focus-within:bg-background transition-all">
        <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
        <Input
          type="search"
          placeholder="Search files, folders, or OCR text..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className="h-full w-full border-none bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
          aria-label="Search files, folders, or OCR text"
          role="searchbox"
        />
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setQuery('');
                resetFilters();
              }}
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${showFilters ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => {
              setShowFilters(!showFilters);
              setShowDropdown(false);
            }}
            title="Search options"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Advanced Filters dropdown popover */}
      {showFilters && (
        <div className="absolute right-0 top-11 z-50 animate-in fade-in duration-100">
          <SearchFilters
            filters={filters}
            onFilterChange={updateFilters}
            onReset={resetFilters}
            onApply={handleApplyFilters}
          />
        </div>
      )}

      {/* Instant suggestions / Recent query dropdown */}
      {showDropdown && !showFilters && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-96 overflow-y-auto rounded-lg border bg-card text-card-foreground shadow-xl p-2 space-y-4 animate-in fade-in duration-100">
          {/* Recent searches history */}
          {recentSearches.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Recent Searches</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearHistory();
                  }}
                  className="hover:text-primary transition-colors cursor-pointer lowercase"
                >
                  Clear history
                </button>
              </div>
              <div className="space-y-0.5">
                {recentSearches.map((term, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(term)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <History className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular tags suggestions */}
          {suggestions?.popularTags && suggestions.popularTags.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Popular Tags
              </div>
              <div className="flex flex-wrap gap-1.5 px-2">
                {suggestions.popularTags.map((tag, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(`tag:${tag}`)}
                    className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs bg-muted/30 hover:bg-primary/10 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    <Tag className="h-3 w-3" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories suggestions */}
          {suggestions?.categories && suggestions.categories.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Categories
              </div>
              <div className="grid grid-cols-2 gap-0.5">
                {suggestions.categories.map((cat, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(`category:${cat}`)}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate capitalize">{cat.toLowerCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Owners suggestions */}
          {suggestions?.owners && suggestions.owners.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Owners
              </div>
              <div className="grid grid-cols-2 gap-0.5">
                {suggestions.owners.map((owner, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(`owner:${owner}`)}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{owner}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
