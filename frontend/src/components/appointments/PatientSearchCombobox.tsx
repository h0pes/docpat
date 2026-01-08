/**
 * PatientSearchCombobox Component
 *
 * An autocomplete combobox for searching and selecting patients.
 * Uses React Query for fetching patient data with debounced search.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, User, Loader2 } from 'lucide-react';

import { patientsApi } from '../../services/api/patients';
import type { Patient } from '../../types/patient';
import { PatientStatus } from '../../types/patient';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';

interface PatientSearchComboboxProps {
  value?: string; // Patient ID
  onSelect: (patientId: string, patient: Patient) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * PatientSearchCombobox provides a searchable dropdown for selecting patients.
 * Features debounced search, loading states, and patient info display.
 */
export function PatientSearchCombobox({
  value,
  onSelect,
  disabled = false,
  error,
}: PatientSearchComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch patients based on search query (only ACTIVE patients)
  const { data: patientsData, isLoading } = useQuery({
    queryKey: ['patients', 'search', 'active', debouncedQuery],
    queryFn: () => {
      // Always filter for ACTIVE patients only - inactive patients cannot have appointments
      // Use higher limit to show all patients (sorted alphabetically by backend)
      return patientsApi.search({
        query: debouncedQuery.length >= 2 ? debouncedQuery : undefined,
        status: PatientStatus.ACTIVE,
        limit: 100,
      });
    },
    enabled: open, // Only fetch when popover is open
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch selected patient if value is provided but no patient data
  const { data: fetchedPatient } = useQuery({
    queryKey: ['patient', value],
    queryFn: () => (value ? patientsApi.getById(value) : null),
    enabled: !!value && !selectedPatient,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update selected patient when fetched
  useEffect(() => {
    if (fetchedPatient && !selectedPatient) {
      setSelectedPatient(fetchedPatient);
    }
  }, [fetchedPatient, selectedPatient]);

  // Clear selected patient when value is cleared externally
  useEffect(() => {
    if (!value && selectedPatient) {
      setSelectedPatient(null);
    }
  }, [value, selectedPatient]);

  // Handle patient selection
  const handleSelect = useCallback(
    (patient: Patient) => {
      setSelectedPatient(patient);
      onSelect(patient.id, patient);
      setOpen(false);
      setSearchQuery('');
    },
    [onSelect]
  );

  // Format patient display name
  const getPatientDisplayName = (patient: Patient): string => {
    return `${patient.last_name}, ${patient.first_name}`;
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="flex flex-col gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={t('appointments.form.select_patient')}
            disabled={disabled}
            className={cn(
              'w-full justify-between',
              !selectedPatient && 'text-muted-foreground',
              error && 'border-destructive'
            )}
          >
            {selectedPatient ? (
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{getPatientDisplayName(selectedPatient)}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {calculateAge(selectedPatient.date_of_birth)} {t('patients.years')}
                </Badge>
              </div>
            ) : (
              <span>{t('appointments.form.select_patient')}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t('appointments.form.search_patient')}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {t('common.loading')}
                  </span>
                </div>
              ) : (
                <>
                  <CommandEmpty>{t('common.noResults')}</CommandEmpty>
                  <CommandGroup>
                    {patientsData?.patients.map((patient) => (
                      <CommandItem
                        key={patient.id}
                        value={patient.id}
                        onSelect={() => handleSelect(patient)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {getPatientDisplayName(patient)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {patient.fiscal_code || patient.phone_primary || patient.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {calculateAge(patient.date_of_birth)} {t('patients.years')}
                          </Badge>
                          {value === patient.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
