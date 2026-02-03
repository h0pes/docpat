/**
 * HelpSearch Component
 *
 * A search input component with debouncing for searching help content.
 * Includes optional highlight functionality for search results.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HelpSearchProps {
  /** Callback when search value changes (debounced) */
  onSearch: (query: string) => void;
  /** Placeholder text override */
  placeholder?: string;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Additional className for the container */
  className?: string;
  /** Initial search value */
  initialValue?: string;
}

/**
 * HelpSearch Component
 *
 * Provides a search input with debounce functionality for filtering help content.
 * The search is triggered after the user stops typing for the specified debounce period.
 */
export function HelpSearch({
  onSearch,
  placeholder,
  debounceMs = 300,
  className,
  initialValue = '',
}: HelpSearchProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs, onSearch]);

  // Handle clear
  const handleClear = useCallback(() => {
    setValue('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder || t('help.search_placeholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={handleClear}
          aria-label={t('common.clear')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Highlights matching text in a string
 *
 * @param text - The text to search within
 * @param query - The search query to highlight
 * @returns JSX with highlighted matches
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default HelpSearch;
