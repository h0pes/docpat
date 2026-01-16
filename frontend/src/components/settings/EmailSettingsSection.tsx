/**
 * EmailSettingsSection Component
 *
 * Settings section for email/notification configuration.
 * Displays SMTP status, allows sending test emails,
 * and shows notification statistics.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Send, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  SettingsSection,
  SettingsRow,
  SettingsDivider,
  SettingsField,
} from './SettingsSection';
import {
  useEmailStatus,
  useNotificationStatistics,
  useSendTestEmail,
} from '@/hooks/useNotifications';

/**
 * Test email form schema
 */
const testEmailSchema = z.object({
  to_email: z.string().email('Invalid email address'),
  to_name: z.string().optional(),
});

type TestEmailFormData = z.infer<typeof testEmailSchema>;

/**
 * EmailSettingsSection component
 *
 * Displays email service status, notification statistics,
 * and provides test email functionality.
 *
 * @returns EmailSettingsSection component
 */
export function EmailSettingsSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  // Fetch email status and statistics
  const { data: emailStatus, isLoading: isLoadingStatus } = useEmailStatus();
  const { data: statistics, isLoading: isLoadingStats } =
    useNotificationStatistics();
  const sendTestMutation = useSendTestEmail();

  // Test email form
  const form = useForm<TestEmailFormData>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      to_email: '',
      to_name: '',
    },
  });

  /**
   * Handle test email submission
   */
  const handleSendTestEmail = async (data: TestEmailFormData) => {
    try {
      const result = await sendTestMutation.mutateAsync(data);

      if (result.success) {
        toast({
          title: t('settings.email.test_success'),
          description: result.message,
        });
        setTestDialogOpen(false);
        form.reset();
      } else {
        toast({
          title: t('settings.email.test_failed'),
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description:
          error instanceof Error
            ? error.message
            : t('settings.email.test_error'),
        variant: 'destructive',
      });
    }
  };

  return (
    <SettingsSection
      title={t('settings.email.title')}
      description={t('settings.email.description')}
      icon={<Mail className="h-5 w-5" />}
    >
      {/* Email Service Status */}
      <div className="space-y-6">
        <SettingsRow columns={2}>
          <SettingsField
            label={t('settings.email.status')}
            description={t('settings.email.status_description')}
          >
            {isLoadingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : emailStatus?.configured ? (
              <Badge
                variant={emailStatus.enabled ? 'success' : 'destructive'}
                className="gap-1"
              >
                {emailStatus.enabled ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    {t('settings.email.enabled')}
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    {t('settings.email.disabled')}
                  </>
                )}
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {t('settings.email.not_configured')}
              </Badge>
            )}
          </SettingsField>

          <SettingsField
            label={t('settings.email.test_email')}
            description={t('settings.email.test_description')}
          >
            <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!emailStatus?.enabled}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t('settings.email.send_test')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('settings.email.test_dialog_title')}</DialogTitle>
                  <DialogDescription>
                    {t('settings.email.test_dialog_description')}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleSendTestEmail)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="to_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.email.recipient_email')}</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="email@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="to_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('settings.email.recipient_name')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('settings.email.recipient_name_placeholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('settings.email.recipient_name_hint')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTestDialogOpen(false)}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        type="submit"
                        disabled={sendTestMutation.isPending || !form.formState.isValid}
                      >
                        {sendTestMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('common.sending')}
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            {t('settings.email.send_test')}
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </SettingsField>
        </SettingsRow>

        {!emailStatus?.configured && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('settings.email.configure_hint')}
            </AlertDescription>
          </Alert>
        )}

        <SettingsDivider label={t('settings.email.statistics')} />

        {/* Notification Statistics */}
        <SettingsRow columns={4}>
          <SettingsField
            label={t('settings.email.stats.total')}
            description={t('settings.email.stats.total_description')}
          >
            <span className="text-2xl font-bold">
              {isLoadingStats ? '...' : statistics?.total_notifications ?? 0}
            </span>
          </SettingsField>

          <SettingsField
            label={t('settings.email.stats.sent_today')}
            description={t('settings.email.stats.sent_today_description')}
          >
            <span className="text-2xl font-bold text-green-600">
              {isLoadingStats ? '...' : statistics?.sent_today ?? 0}
            </span>
          </SettingsField>

          <SettingsField
            label={t('settings.email.stats.pending')}
            description={t('settings.email.stats.pending_description')}
          >
            <span className="text-2xl font-bold text-yellow-600">
              {isLoadingStats ? '...' : statistics?.pending_count ?? 0}
            </span>
          </SettingsField>

          <SettingsField
            label={t('settings.email.stats.failed')}
            description={t('settings.email.stats.failed_description')}
          >
            <span className="text-2xl font-bold text-red-600">
              {isLoadingStats ? '...' : statistics?.failed_count ?? 0}
            </span>
          </SettingsField>
        </SettingsRow>

        <SettingsDivider label={t('settings.email.configuration')} />

        {/* Configuration Info */}
        <Alert variant="default">
          <Mail className="h-4 w-4" />
          <AlertDescription>
            {t('settings.email.env_config_hint')}
          </AlertDescription>
        </Alert>
      </div>
    </SettingsSection>
  );
}
