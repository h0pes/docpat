/**
 * DiagnosisSearch Component
 *
 * Autocomplete component for searching and selecting ICD-10 diagnosis codes
 * with debounced search and support for multiple diagnosis selection.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Plus, Check } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useICD10Search } from '@/hooks/useVisits';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DiagnosisType, getDiagnosisTypeColor, VisitDiagnosis, CreateVisitDiagnosisRequest } from '@/types/visit';

interface SelectedDiagnosis {
  icd10_code: string;
  description: string;
  diagnosis_type: DiagnosisType;
  is_primary: boolean;
  notes?: string;
}

interface DiagnosisSearchProps {
  /** Currently selected diagnoses */
  selectedDiagnoses?: SelectedDiagnosis[];
  /** Callback when diagnoses change */
  onChange: (diagnoses: SelectedDiagnosis[]) => void;
  /** Whether the component is read-only */
  readOnly?: boolean;
}

/**
 * DiagnosisSearch Component
 */
export function DiagnosisSearch({
  selectedDiagnoses = [],
  onChange,
  readOnly = false,
}: DiagnosisSearchProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [pendingDiagnosis, setPendingDiagnosis] = useState<{
    icd10_code: string;
    description: string;
  } | null>(null);
  const [diagnosisType, setDiagnosisType] = useState<DiagnosisType>(DiagnosisType.PROVISIONAL);
  const [notes, setNotes] = useState('');

  // Debounce search query for API call
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search ICD-10 codes
  const { data: searchResults, isLoading } = useICD10Search(
    debouncedSearch,
    20, // limit
    {
      enabled: debouncedSearch.length >= 2,
    }
  );

  /**
   * Handle selecting an ICD-10 code from search results
   */
  const handleSelectCode = (code: string, description: string) => {
    setPendingDiagnosis({ icd10_code: code, description });
    setDiagnosisType(DiagnosisType.PROVISIONAL);
    setNotes('');
    setSearchQuery('');
    setIsPopoverOpen(false);
  };

  /**
   * Handle adding the pending diagnosis to the list
   */
  const handleAddDiagnosis = () => {
    if (!pendingDiagnosis) return;

    const newDiagnosis: SelectedDiagnosis = {
      ...pendingDiagnosis,
      diagnosis_type: diagnosisType,
      is_primary: selectedDiagnoses.length === 0, // First diagnosis is primary by default
      notes: notes || undefined,
    };

    onChange([...selectedDiagnoses, newDiagnosis]);
    setPendingDiagnosis(null);
    setNotes('');
  };

  /**
   * Handle removing a diagnosis from the list
   */
  const handleRemoveDiagnosis = (index: number) => {
    const updated = selectedDiagnoses.filter((_, i) => i !== index);

    // If we removed the primary diagnosis, make the first one primary
    if (selectedDiagnoses[index].is_primary && updated.length > 0) {
      updated[0].is_primary = true;
    }

    onChange(updated);
  };

  /**
   * Handle setting a diagnosis as primary
   */
  const handleSetPrimary = (index: number) => {
    const updated = selectedDiagnoses.map((diag, i) => ({
      ...diag,
      is_primary: i === index,
    }));
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          {t('visits.diagnosis.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        {!readOnly && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="diagnosis-search">{t('visits.diagnosis.search_label')}</Label>
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      id="diagnosis-search"
                      placeholder={t('visits.diagnosis.search_placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsPopoverOpen(true)}
                      disabled={readOnly}
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder={t('visits.diagnosis.search_placeholder')}
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isLoading
                          ? t('common.loading')
                          : debouncedSearch.length < 2
                          ? t('visits.diagnosis.type_to_search')
                          : t('visits.diagnosis.no_results')}
                      </CommandEmpty>
                      {searchResults && searchResults.length > 0 && (
                        <CommandGroup heading={t('visits.diagnosis.results')}>
                          {searchResults.map((result) => (
                            <CommandItem
                              key={result.code}
                              value={result.code}
                              onSelect={() => handleSelectCode(result.code, result.description)}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{result.code}</span>
                                <span className="text-sm text-muted-foreground">{result.description}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Pending Diagnosis Configuration */}
            {pendingDiagnosis && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                <div>
                  <span className="font-medium">{pendingDiagnosis.icd10_code}</span>
                  <p className="text-sm text-muted-foreground">{pendingDiagnosis.description}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnosis-type">{t('visits.diagnosis.type_label')}</Label>
                  <Select
                    value={diagnosisType}
                    onValueChange={(value) => setDiagnosisType(value as DiagnosisType)}
                  >
                    <SelectTrigger id="diagnosis-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DiagnosisType.PROVISIONAL}>
                        {t('visits.diagnosis.types.provisional')}
                      </SelectItem>
                      <SelectItem value={DiagnosisType.CONFIRMED}>
                        {t('visits.diagnosis.types.confirmed')}
                      </SelectItem>
                      <SelectItem value={DiagnosisType.DIFFERENTIAL}>
                        {t('visits.diagnosis.types.differential')}
                      </SelectItem>
                      <SelectItem value={DiagnosisType.RULE_OUT}>
                        {t('visits.diagnosis.types.rule_out')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnosis-notes">{t('visits.diagnosis.notes_label')}</Label>
                  <Input
                    id="diagnosis-notes"
                    placeholder={t('visits.diagnosis.notes_placeholder')}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingDiagnosis(null)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="button" size="sm" onClick={handleAddDiagnosis}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('visits.diagnosis.add')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Diagnoses List */}
        {selectedDiagnoses.length > 0 && (
          <div className="space-y-2">
            <Label>{t('visits.diagnosis.selected_title')}</Label>
            <div className="space-y-2">
              {selectedDiagnoses.map((diagnosis, index) => (
                <div
                  key={`${diagnosis.icd10_code}-${index}`}
                  className="flex items-start gap-2 border rounded-lg p-3"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{diagnosis.icd10_code}</span>
                      <Badge className={getDiagnosisTypeColor(diagnosis.diagnosis_type)}>
                        {t(`visits.diagnosis.types.${diagnosis.diagnosis_type.toLowerCase()}`)}
                      </Badge>
                      {diagnosis.is_primary && (
                        <Badge variant="outline">
                          {t('visits.diagnosis.primary')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{diagnosis.description}</p>
                    {diagnosis.notes && (
                      <p className="text-sm italic">{diagnosis.notes}</p>
                    )}
                  </div>

                  {!readOnly && (
                    <div className="flex gap-1">
                      {!diagnosis.is_primary && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetPrimary(index)}
                          title={t('visits.diagnosis.set_primary')}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDiagnosis(index)}
                        title={t('common.remove')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedDiagnoses.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('visits.diagnosis.no_diagnoses')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
