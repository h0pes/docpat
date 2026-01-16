/**
 * Settings Page
 *
 * Main settings dashboard with tabbed navigation for different
 * setting categories (practice, appointments, localization, security,
 * working hours, holidays).
 * Admin-only access for system-wide configuration.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  CalendarRange,
  GlobeLock,
  Shield,
  Clock3,
  CalendarDays,
  Mail,
  Archive,
  Timer,
  Settings as SettingsIcon,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/store/authStore';

import {
  PracticeSettingsSection,
  AppointmentSettingsSection,
  LocalizationSettingsSection,
  SecuritySettingsSection,
  WorkingHoursSection,
  HolidaysSection,
  EmailSettingsSection,
  BackupSettingsSection,
  SchedulerSettingsSection,
} from '@/components/settings';

/**
 * Settings page component
 *
 * Provides a tabbed interface for managing all system settings.
 * Restricted to ADMIN role only.
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  // Active tab state
  const [activeTab, setActiveTab] = useState('practice');

  // Check admin permission
  if (user?.role !== 'ADMIN') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('settings.title')}
          </h1>
        </div>
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {t('settings.errors.admin_only')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('settings.title')}
          </h1>
          <p className="text-muted-foreground">{t('settings.description')}</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
          <TabsTrigger value="practice" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.practice')}</span>
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.appointments')}</span>
          </TabsTrigger>
          <TabsTrigger value="localization" className="flex items-center gap-2">
            <GlobeLock className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.localization')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.security')}</span>
          </TabsTrigger>
          <TabsTrigger value="working-hours" className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.working_hours')}</span>
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.holidays')}</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.email')}</span>
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.scheduler')}</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.backup')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Practice Settings */}
        <TabsContent value="practice" className="mt-6">
          <PracticeSettingsSection />
        </TabsContent>

        {/* Appointment Settings */}
        <TabsContent value="appointments" className="mt-6">
          <AppointmentSettingsSection />
        </TabsContent>

        {/* Localization Settings */}
        <TabsContent value="localization" className="mt-6">
          <LocalizationSettingsSection />
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="mt-6">
          <SecuritySettingsSection />
        </TabsContent>

        {/* Working Hours */}
        <TabsContent value="working-hours" className="mt-6">
          <WorkingHoursSection />
        </TabsContent>

        {/* Holidays */}
        <TabsContent value="holidays" className="mt-6">
          <HolidaysSection />
        </TabsContent>

        {/* Email/Notifications */}
        <TabsContent value="email" className="mt-6">
          <EmailSettingsSection />
        </TabsContent>

        {/* Scheduler */}
        <TabsContent value="scheduler" className="mt-6">
          <SchedulerSettingsSection />
        </TabsContent>

        {/* Backup */}
        <TabsContent value="backup" className="mt-6">
          <BackupSettingsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
