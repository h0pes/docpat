/**
 * MedicationSearch Component
 *
 * Autocomplete component for searching medications with debounced search.
 * Provides quick access to common medications with generic names and routes.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useMedicationSearch } from '@/hooks/useVisits';

import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RouteOfAdministration } from '@/types/prescription';

interface MedicationSearchProps {
  /** Current medication name value */
  value?: string;
  /** Callback when a medication is selected */
  onSelect: (medicationName: string, genericName?: string, defaultRoute?: RouteOfAdministration) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
}

/**
 * MedicationSearch Component
 */
export function MedicationSearch({
  value = '',
  onSelect,
  placeholder,
  disabled = false,
}: MedicationSearchProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Debounce search query for API call
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search medications
  const { data: searchResults, isLoading } = useMedicationSearch(
    debouncedSearch,
    20, // limit
    {
      enabled: debouncedSearch.length >= 2,
    }
  );

  /**
   * Handle selecting a medication from search results
   */
  const handleSelectMedication = (name: string, genericName?: string, defaultRoute?: RouteOfAdministration) => {
    setInputValue(name);
    setSearchQuery('');
    setIsPopoverOpen(false);
    onSelect(name, genericName, defaultRoute);
  };

  /**
   * Handle manual input change
   */
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setSearchQuery(newValue);
    onSelect(newValue);
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            placeholder={placeholder || t('visits.prescription.medication_placeholder')}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsPopoverOpen(true)}
            disabled={disabled}
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder || t('visits.prescription.medication_search_placeholder')}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading
                ? t('common.loading')
                : debouncedSearch.length < 2
                ? t('visits.prescription.type_to_search')
                : t('visits.prescription.no_results')}
            </CommandEmpty>
            {searchResults && searchResults.length > 0 && (
              <CommandGroup heading={t('visits.prescription.medications')}>
                {searchResults.map((result, index) => (
                  <CommandItem
                    key={`${result.name}-${index}`}
                    value={result.name}
                    onSelect={() =>
                      handleSelectMedication(result.name, result.generic_name, result.default_route)
                    }
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.name}</span>
                        {result.default_route && (
                          <span className="text-xs text-muted-foreground">
                            {t(`visits.prescription.routes.${result.default_route.toLowerCase()}`)}
                          </span>
                        )}
                      </div>
                      {result.generic_name && (
                        <span className="text-sm text-muted-foreground">{result.generic_name}</span>
                      )}
                      {result.common_dosages && result.common_dosages.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {t('visits.prescription.common_dosages')}: {result.common_dosages.join(', ')}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
