/**
 * EmailDocumentDialog Component
 *
 * Dialog for sending a document via email.
 * Allows user to enter email address and marks document as delivered.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Send, Loader2, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useDeliverDocument } from '@/hooks/useDocuments';
import type { GeneratedDocumentSummary } from '@/types/document';

/**
 * Form schema for email delivery
 */
const emailDocumentSchema = z.object({
  email: z.string().email('Valid email is required'),
  subject: z.string().min(1, 'Subject is required').max(255),
  message: z.string().optional(),
});

type EmailDocumentFormData = z.infer<typeof emailDocumentSchema>;

interface EmailDocumentDialogProps {
  /** Document to email */
  document: GeneratedDocumentSummary;
  /** Pre-filled email address (e.g., from patient) */
  defaultEmail?: string;
  /** Callback on successful delivery */
  onSuccess: () => void;
  /** Callback to close dialog */
  onClose: () => void;
}

/**
 * EmailDocumentDialog Component
 */
export function EmailDocumentDialog({
  document,
  defaultEmail,
  onSuccess,
  onClose,
}: EmailDocumentDialogProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  // Deliver document mutation
  const deliverDocument = useDeliverDocument();

  // Form setup
  const form = useForm<EmailDocumentFormData>({
    resolver: zodResolver(emailDocumentSchema),
    defaultValues: {
      email: defaultEmail || '',
      subject: t('documents.email_default_subject', { title: document.document_title }),
      message: '',
    },
  });

  /**
   * Handle form submission
   */
  const handleSubmit = async (data: EmailDocumentFormData) => {
    try {
      setError(null);

      // Note: In a real implementation, this would trigger an actual email send
      // through a backend email service. For now, we mark it as delivered.
      await deliverDocument.mutateAsync({
        id: document.id,
        data: {
          delivered_to: data.email,
          delivery_method: 'email',
        },
      });

      onSuccess();
    } catch (err) {
      console.error('Failed to email document:', err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('documents.email_title')}
          </DialogTitle>
          <DialogDescription>
            {t('documents.email_description')}
          </DialogDescription>
        </DialogHeader>

        {/* Document info */}
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="font-medium text-sm">{document.document_title}</div>
            <div className="text-xs text-muted-foreground">{document.document_filename}</div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Email address */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('documents.email_recipient')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('documents.email_placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('documents.email_subject')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('documents.email_message')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('documents.email_message_placeholder')}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('documents.email_message_hint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={deliverDocument.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={deliverDocument.isPending}>
                {deliverDocument.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('documents.sending')}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t('documents.send')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
