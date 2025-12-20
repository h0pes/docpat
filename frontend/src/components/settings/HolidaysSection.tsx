/**
 * HolidaysSection Component
 *
 * Settings section for managing holidays and vacation calendar.
 * Allows adding, editing, and deleting holidays.
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit,
  Download,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { enUS, it } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SettingsSection } from './SettingsSection';
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
  useImportNationalHolidays,
} from '@/hooks/useHolidays';
import type {
  Holiday,
  HolidayType,
  CreateHolidayRequest,
  UpdateHolidayRequest,
} from '@/types/holiday';
import { getHolidayTypeBadgeVariant, getHolidayTypeDisplayName } from '@/types/holiday';

/**
 * HolidaysSection component
 *
 * Displays and allows management of holidays and vacation days.
 *
 * @returns HolidaysSection component
 */
export function HolidaysSection() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const today = startOfDay(new Date());
  const currentYear = today.getFullYear();

  // State
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Check if adding holidays is allowed for the selected year
  // - Past years: not allowed
  // - Current year: allowed (calendar will restrict to today onwards)
  // - Future years: allowed
  const canAddHolidays = selectedYear >= currentYear;
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  // Form state
  const [formDate, setFormDate] = useState<Date | undefined>(undefined);
  const [formDateRange, setFormDateRange] = useState<DateRange | undefined>(undefined);
  const [formDateMode, setFormDateMode] = useState<'single' | 'range'>('single');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<HolidayType>('PRACTICE_CLOSED');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Fetch holidays
  const { data: holidaysData, isLoading } = useHolidays({
    year: selectedYear,
    include_recurring: true,
  });

  // Mutations
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();
  const importMutation = useImportNationalHolidays();

  // Track which years we've already auto-imported to avoid duplicate imports
  const autoImportedYearsRef = useRef<Set<number>>(new Set());

  /**
   * Auto-import national holidays when viewing a year with no national holidays
   * This ensures national holidays are always pre-populated for any selected year
   */
  useEffect(() => {
    // Skip if still loading, already importing, or already auto-imported this year
    if (isLoading || importMutation.isPending || autoImportedYearsRef.current.has(selectedYear)) {
      return;
    }

    // Check if there are any national holidays for this year
    const hasNationalHolidays = holidaysData?.holidays?.some(
      (h) => h.holiday_type === 'NATIONAL'
    );

    // If no national holidays exist, auto-import them
    if (holidaysData && !hasNationalHolidays) {
      autoImportedYearsRef.current.add(selectedYear);
      importMutation.mutate(
        { year: selectedYear, override_existing: false },
        {
          onSuccess: (result) => {
            if (result.imported_count > 0) {
              toast({
                title: t('settings.holidays.imported'),
                description: t('settings.holidays.imported_description', {
                  count: result.imported_count,
                  skipped: result.skipped_count,
                }),
              });
            }
          },
          // Silently handle errors for auto-import
          onError: () => {
            // Remove from set so it can retry on next view
            autoImportedYearsRef.current.delete(selectedYear);
          },
        }
      );
    }
  }, [holidaysData, selectedYear, isLoading, importMutation, toast, t]);

  /**
   * Reset form
   */
  const resetForm = () => {
    setFormDate(undefined);
    setFormDateRange(undefined);
    setFormDateMode('single');
    setFormName('');
    setFormType('PRACTICE_CLOSED');
    setFormRecurring(false);
    setFormNotes('');
    setIsCalendarOpen(false);
  };

  /**
   * Open add dialog
   */
  const handleAddClick = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  /**
   * Open edit dialog
   */
  const handleEditClick = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setFormDate(new Date(holiday.holiday_date));
    setFormName(holiday.name);
    setFormType(holiday.holiday_type);
    setFormRecurring(holiday.is_recurring);
    setFormNotes(holiday.notes || '');
    setIsEditDialogOpen(true);
  };

  /**
   * Open delete dialog
   */
  const handleDeleteClick = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Handle create holiday
   */
  const handleCreate = async () => {
    // Validate based on mode
    if (formDateMode === 'single' && (!formDate || !formName)) return;
    if (formDateMode === 'range' && (!formDateRange?.from || !formDateRange?.to || !formName)) return;

    try {
      if (formDateMode === 'single' && formDate) {
        // Single date mode - create one holiday
        const data: CreateHolidayRequest = {
          holiday_date: format(formDate, 'yyyy-MM-dd'),
          name: formName,
          holiday_type: formType,
          is_recurring: formRecurring,
          notes: formNotes || undefined,
        };
        await createMutation.mutateAsync(data);
        toast({
          title: t('settings.holidays.created'),
          description: t('settings.holidays.created_description'),
        });
      } else if (formDateMode === 'range' && formDateRange?.from && formDateRange?.to) {
        // Date range mode - create one holiday for each day in the range
        const dates = eachDayOfInterval({
          start: formDateRange.from,
          end: formDateRange.to,
        });

        // Create holidays sequentially, skipping dates that already have holidays
        let createdCount = 0;
        let skippedCount = 0;
        for (const date of dates) {
          const data: CreateHolidayRequest = {
            holiday_date: format(date, 'yyyy-MM-dd'),
            name: formName,
            holiday_type: formType,
            is_recurring: false, // Recurring doesn't make sense for ranges
            notes: formNotes || undefined,
          };
          try {
            await createMutation.mutateAsync(data);
            createdCount++;
          } catch (error) {
            // Check if it's a duplicate date error (409 Conflict)
            // Axios errors have response.data with error details
            const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
            if (axiosError.response?.status === 409 || axiosError.response?.data?.error === 'DUPLICATE_DATE') {
              skippedCount++;
            } else {
              // Re-throw other errors
              throw error;
            }
          }
        }

        // Show appropriate toast based on results
        if (createdCount > 0) {
          toast({
            title: t('settings.holidays.range_created'),
            description: skippedCount > 0
              ? t('settings.holidays.range_created_with_skipped', { count: createdCount, skipped: skippedCount })
              : t('settings.holidays.range_created_description', { count: createdCount }),
          });
        } else if (skippedCount > 0) {
          // All dates were skipped
          toast({
            variant: 'destructive',
            title: t('settings.holidays.range_all_skipped'),
            description: t('settings.holidays.range_all_skipped_description'),
          });
        }
      }

      setIsAddDialogOpen(false);
      resetForm();
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('settings.holidays.create_error'),
      });
    }
  };

  /**
   * Handle update holiday
   */
  const handleUpdate = async () => {
    if (!selectedHoliday || !formDate || !formName) return;

    try {
      const data: UpdateHolidayRequest = {
        holiday_date: format(formDate, 'yyyy-MM-dd'),
        name: formName,
        holiday_type: formType,
        is_recurring: formRecurring,
        notes: formNotes || undefined,
      };

      await updateMutation.mutateAsync({ id: selectedHoliday.id, data });
      setIsEditDialogOpen(false);
      setSelectedHoliday(null);
      resetForm();

      toast({
        title: t('settings.holidays.updated'),
        description: t('settings.holidays.updated_description'),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('settings.holidays.update_error'),
      });
    }
  };

  /**
   * Handle delete holiday
   */
  const handleDelete = async () => {
    if (!selectedHoliday) return;

    try {
      await deleteMutation.mutateAsync(selectedHoliday.id);
      setIsDeleteDialogOpen(false);
      setSelectedHoliday(null);

      toast({
        title: t('settings.holidays.deleted'),
        description: t('settings.holidays.deleted_description'),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('settings.holidays.delete_error'),
      });
    }
  };

  /**
   * Handle import national holidays
   */
  const handleImport = async (year: number) => {
    try {
      const result = await importMutation.mutateAsync({
        year,
        override_existing: false,
      });

      setIsImportDialogOpen(false);

      toast({
        title: t('settings.holidays.imported'),
        description: t('settings.holidays.imported_description', {
          count: result.imported_count,
          skipped: result.skipped_count,
        }),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('settings.holidays.import_error'),
      });
    }
  };

  const locale = i18n.language === 'it' ? 'it' : 'en';
  const dateLocale = i18n.language === 'it' ? it : enUS;

  if (isLoading) {
    return (
      <SettingsSection
        title={t('settings.holidays.title')}
        description={t('settings.holidays.description')}
        icon={<CalendarDays className="h-5 w-5" />}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-1/4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title={t('settings.holidays.title')}
      description={t('settings.holidays.description')}
      icon={<CalendarDays className="h-5 w-5" />}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            {t('settings.holidays.import')}
          </Button>
          <Button
            onClick={handleAddClick}
            disabled={!canAddHolidays}
            title={!canAddHolidays ? t('settings.holidays.cannot_add_past') : undefined}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('settings.holidays.add')}
          </Button>
        </div>
      }
    >
      {/* Year Selector */}
      <div className="flex items-center gap-4 mb-4">
        <Label>{t('settings.holidays.year')}</Label>
        <Select
          value={String(selectedYear)}
          onValueChange={(val) => setSelectedYear(Number(val))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(
              (year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Holidays Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('settings.holidays.date')}</TableHead>
              <TableHead>{t('settings.holidays.name')}</TableHead>
              <TableHead>{t('settings.holidays.type')}</TableHead>
              <TableHead className="text-center">
                {t('settings.holidays.recurring')}
              </TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidaysData?.holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t('settings.holidays.empty')}
                </TableCell>
              </TableRow>
            ) : (
              holidaysData?.holidays.map((holiday) => {
                const holidayDate = startOfDay(new Date(holiday.holiday_date));
                const isPastHoliday = holidayDate < today;
                return (
                  <TableRow key={holiday.id}>
                    <TableCell>
                      {format(new Date(holiday.holiday_date), 'EEE, dd MMM yyyy', { locale: dateLocale })}
                    </TableCell>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>
                      <Badge variant={getHolidayTypeBadgeVariant(holiday.holiday_type)}>
                        {getHolidayTypeDisplayName(holiday.holiday_type, locale)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {holiday.is_recurring ? '✓' : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(holiday)}
                          disabled={isPastHoliday}
                          title={isPastHoliday ? t('settings.holidays.cannot_edit_past') : undefined}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(holiday)}
                          disabled={isPastHoliday}
                          title={isPastHoliday ? t('settings.holidays.cannot_delete_past') : undefined}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedHoliday(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen
                ? t('settings.holidays.edit_title')
                : t('settings.holidays.add_title')}
            </DialogTitle>
            <DialogDescription>
              {t('settings.holidays.form_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date Mode Toggle - only show in Add mode, not Edit */}
            {!isEditDialogOpen && (
              <div className="space-y-2">
                <Label>{t('settings.holidays.date_mode')}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formDateMode === 'single' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFormDateMode('single');
                      setFormDateRange(undefined);
                    }}
                  >
                    {t('settings.holidays.single_date')}
                  </Button>
                  <Button
                    type="button"
                    variant={formDateMode === 'range' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFormDateMode('range');
                      setFormDate(undefined);
                      setFormRecurring(false); // Recurring not applicable for ranges
                    }}
                  >
                    {t('settings.holidays.date_range')}
                  </Button>
                </div>
              </div>
            )}

            {/* Date Picker */}
            <div className="space-y-2">
              <Label>{t('settings.holidays.date')}</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formDateMode === 'single' ? (
                      formDate ? format(formDate, 'PPP', { locale: dateLocale }) : t('settings.holidays.select_date')
                    ) : (
                      formDateRange?.from ? (
                        formDateRange.to ? (
                          `${format(formDateRange.from, 'PP', { locale: dateLocale })} - ${format(formDateRange.to, 'PP', { locale: dateLocale })}`
                        ) : (
                          `${format(formDateRange.from, 'PP', { locale: dateLocale })} - ${t('settings.holidays.select_end_date')}`
                        )
                      ) : (
                        t('settings.holidays.select_date_range')
                      )
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  {formDateMode === 'single' || isEditDialogOpen ? (
                    <Calendar
                      mode="single"
                      selected={formDate}
                      onSelect={(date) => {
                        setFormDate(date);
                        // Auto-close calendar when date is selected
                        if (date) {
                          setIsCalendarOpen(false);
                        }
                      }}
                      disabled={{ before: today }}
                      defaultMonth={selectedYear > currentYear ? new Date(selectedYear, 0, 1) : today}
                      initialFocus
                    />
                  ) : (
                    <Calendar
                      mode="range"
                      selected={formDateRange}
                      onSelect={(range) => {
                        setFormDateRange(range);
                        // Auto-close calendar when both dates are selected
                        if (range?.from && range?.to) {
                          setIsCalendarOpen(false);
                        }
                      }}
                      disabled={{ before: today }}
                      defaultMonth={selectedYear > currentYear ? new Date(selectedYear, 0, 1) : today}
                      numberOfMonths={2}
                      initialFocus
                    />
                  )}
                </PopoverContent>
              </Popover>
              {formDateMode === 'range' && formDateRange?.from && formDateRange?.to && (
                <p className="text-sm text-muted-foreground">
                  {t('settings.holidays.days_selected', {
                    count: eachDayOfInterval({ start: formDateRange.from, end: formDateRange.to }).length,
                  })}
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>{t('settings.holidays.name')}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('settings.holidays.name_placeholder')}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>{t('settings.holidays.type')}</Label>
              <Select value={formType} onValueChange={(val) => setFormType(val as HolidayType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATIONAL">
                    {getHolidayTypeDisplayName('NATIONAL', locale)}
                  </SelectItem>
                  <SelectItem value="PRACTICE_CLOSED">
                    {getHolidayTypeDisplayName('PRACTICE_CLOSED', locale)}
                  </SelectItem>
                  <SelectItem value="VACATION">
                    {getHolidayTypeDisplayName('VACATION', locale)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recurring - only show for single date mode (not applicable for ranges) */}
            {(formDateMode === 'single' || isEditDialogOpen) && (
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('settings.holidays.recurring')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.holidays.recurring_hint')}
                  </p>
                </div>
                <Switch checked={formRecurring} onCheckedChange={setFormRecurring} />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>{t('settings.holidays.notes')}</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder={t('settings.holidays.notes_placeholder')}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleUpdate : handleCreate}
              disabled={
                !formName ||
                createMutation.isPending ||
                updateMutation.isPending ||
                (isEditDialogOpen && !formDate) ||
                (!isEditDialogOpen && formDateMode === 'single' && !formDate) ||
                (!isEditDialogOpen && formDateMode === 'range' && (!formDateRange?.from || !formDateRange?.to))
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? t('common.saving')
                : isEditDialogOpen
                ? t('common.save')
                : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.holidays.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.holidays.delete_description', {
                name: selectedHoliday?.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.holidays.import_title')}</DialogTitle>
            <DialogDescription>
              {t('settings.holidays.import_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t('settings.holidays.import_info')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[currentYear, currentYear + 1, currentYear + 2].map((year) => (
                <Button
                  key={year}
                  variant="outline"
                  onClick={() => handleImport(year)}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending
                    ? t('common.loading')
                    : t('settings.holidays.import_year', { year })}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
