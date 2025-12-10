/**
 * HolidaysSection Component
 *
 * Settings section for managing holidays and vacation calendar.
 * Allows adding, editing, and deleting holidays.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit,
  Download,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { format } from 'date-fns';

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
  const currentYear = new Date().getFullYear();

  // State
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  // Form state
  const [formDate, setFormDate] = useState<Date | undefined>(undefined);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<HolidayType>('PRACTICE_CLOSED');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formNotes, setFormNotes] = useState('');

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

  /**
   * Reset form
   */
  const resetForm = () => {
    setFormDate(undefined);
    setFormName('');
    setFormType('PRACTICE_CLOSED');
    setFormRecurring(false);
    setFormNotes('');
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
    if (!formDate || !formName) return;

    try {
      const data: CreateHolidayRequest = {
        holiday_date: format(formDate, 'yyyy-MM-dd'),
        name: formName,
        holiday_type: formType,
        is_recurring: formRecurring,
        notes: formNotes || undefined,
      };

      await createMutation.mutateAsync(data);
      setIsAddDialogOpen(false);
      resetForm();

      toast({
        title: t('settings.holidays.created'),
        description: t('settings.holidays.created_description'),
      });
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
          <Button onClick={handleAddClick}>
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
              holidaysData?.holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell>
                    {format(new Date(holiday.holiday_date), 'dd MMM yyyy')}
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
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(holiday)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>{t('settings.holidays.date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formDate ? format(formDate, 'PPP') : t('settings.holidays.select_date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formDate}
                    onSelect={setFormDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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

            {/* Recurring */}
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings.holidays.recurring')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.holidays.recurring_hint')}
                </p>
              </div>
              <Switch checked={formRecurring} onCheckedChange={setFormRecurring} />
            </div>

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
                !formDate ||
                !formName ||
                createMutation.isPending ||
                updateMutation.isPending
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
