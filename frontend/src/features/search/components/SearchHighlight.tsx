import React, { useMemo } from 'react';

interface SearchHighlightProps {
  text: string;
  query: string;
}

export const SearchHighlight = React.memo(({ text, query }: SearchHighlightProps) => {
  const highlightedParts = useMemo(() => {
    if (!query || !query.trim()) {
      return <span>{text}</span>;
    }

    // Extract query terms (omitting syntax terms like category:pdf etc.)
    const cleanTerms = query
      .split(/\s+/)
      .filter((term) => term && !term.includes(':') && !term.includes('>') && !term.includes('<'))
      .map((term) => term.replace(/["']/g, ''))
      .filter(Boolean);

    if (cleanTerms.length === 0) {
      return <span>{text}</span>;
    }

    // Escape regex characters
    const escapedTerms = cleanTerms.map((t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-primary/20 text-foreground font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  }, [text, query]);

  return <span>{highlightedParts}</span>;
});

SearchHighlight.displayName = 'SearchHighlight';
