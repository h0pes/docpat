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
  Calendar,
  Globe,
  Shield,
  Clock,
  CalendarDays,
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
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="practice" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.practice')}</span>
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.appointments')}</span>
          </TabsTrigger>
          <TabsTrigger value="localization" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.localization')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.security')}</span>
          </TabsTrigger>
          <TabsTrigger value="working-hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.working_hours')}</span>
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.tabs.holidays')}</span>
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
      </Tabs>
    </div>
  );
}
