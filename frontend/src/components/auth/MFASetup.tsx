/**
 * MFA Setup Component
 *
 * Guides users through the MFA enrollment process:
 * 1. Display QR code for authenticator app
 * 2. Show manual entry key as fallback
 * 3. Verify MFA code to complete setup
 * 4. Display backup codes
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Check, Copy, Download, Shield } from 'lucide-react';
import QRCode from 'qrcode';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { authApi } from '@/services/api/auth';
import { MFAVerificationInput } from './MFAVerificationInput';

interface MFASetupProps {
  /** Callback when MFA is successfully enabled */
  onSuccess?: () => void;
  /** Callback when user cancels setup */
  onCancel?: () => void;
}

/**
 * MFA setup wizard component
 */
export function MFASetup({ onSuccess, onCancel }: MFASetupProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [step, setStep] = useState<'scan' | 'verify' | 'backup'>('scan');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [mfaCode, setMfaCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  /**
   * Setup MFA - get QR code and secret
   */
  const setupMutation = useMutation({
    mutationFn: authApi.setupMfa,
    onSuccess: async (data) => {
      setSecret(data.secret);
      setBackupCodes(data.backupCodes || []);

      // Generate QR code
      try {
        const qrCode = await QRCode.toDataURL(data.qrCodeUrl);
        setQrCodeUrl(qrCode);
        setStep('verify');
      } catch (error) {
        console.error('Failed to generate QR code:', error);
        toast({
          variant: 'destructive',
          title: t('app.error'),
          description: t('auth.mfa.qrCodeError'),
        });
      }
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        variant: 'destructive',
        title: t('app.error'),
        description: error.response?.data?.message || t('errors.generic'),
      });
    },
  });

  /**
   * Verify and enable MFA
   */
  const verifyMutation = useMutation({
    mutationFn: (code: string) => authApi.enrollMfa(code),
    onSuccess: () => {
      setStep('backup');
      toast({
        title: t('auth.mfa.enabled'),
        description: t('auth.mfa.enabledDescription'),
      });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        variant: 'destructive',
        title: t('app.error'),
        description: error.response?.data?.message || t('auth.mfa.invalidCode'),
      });
    },
  });

  /**
   * Copy secret key to clipboard
   */
  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      toast({
        title: t('common.copied'),
        description: t('auth.mfa.secretCopied'),
      });
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  /**
   * Copy backup codes to clipboard
   */
  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopiedBackup(true);
      toast({
        title: t('common.copied'),
        description: t('auth.mfa.backupCodesCopied'),
      });
      setTimeout(() => setCopiedBackup(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  /**
   * Download backup codes as text file
   */
  const handleDownloadBackupCodes = () => {
    const content = `DocPat MFA Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe and secure.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docpat-mfa-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: t('common.downloaded'),
      description: t('auth.mfa.backupCodesDownloaded'),
    });
  };

  /**
   * Complete MFA setup
   */
  const handleComplete = () => {
    onSuccess?.();
  };

  /**
   * Start MFA setup process
   */
  const handleStartSetup = () => {
    setupMutation.mutate();
  };

  /**
   * Verify MFA code
   */
  const handleVerifyCode = () => {
    if (mfaCode.length === 6) {
      verifyMutation.mutate(mfaCode);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <CardTitle>{t('auth.mfa.setup')}</CardTitle>
        </div>
        <CardDescription>{t('auth.mfa.setupDescription')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Initial Setup */}
        {step === 'scan' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">{t('auth.mfa.setupInstructions')}</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>{t('auth.mfa.step1')}</li>
                <li>{t('auth.mfa.step2')}</li>
                <li>{t('auth.mfa.step3')}</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleStartSetup} disabled={setupMutation.isPending} className="flex-1">
                {setupMutation.isPending ? t('common.loading') : t('auth.mfa.getStarted')}
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Scan QR Code and Verify */}
        {step === 'verify' && (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                {qrCodeUrl && <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />}
              </div>

              <Separator />

              {/* Manual Entry */}
              <div className="w-full space-y-2">
                <p className="text-sm font-medium text-center">{t('auth.mfa.manualEntry')}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono text-center">
                    {secret}
                  </code>
                  <Button size="icon" variant="outline" onClick={handleCopySecret}>
                    {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {t('auth.mfa.manualEntryHelp')}
                </p>
              </div>
            </div>

            <Separator />

            {/* Verification */}
            <div className="space-y-4">
              <MFAVerificationInput
                value={mfaCode}
                onChange={setMfaCode}
                onComplete={handleVerifyCode}
                disabled={verifyMutation.isPending}
              />

              <Button
                onClick={handleVerifyCode}
                disabled={mfaCode.length !== 6 || verifyMutation.isPending}
                className="w-full"
              >
                {verifyMutation.isPending ? t('common.loading') : t('auth.mfa.verify')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === 'backup' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('auth.mfa.backupCodes')}</p>
              <p className="text-sm text-muted-foreground">{t('auth.mfa.backupCodesDescription')}</p>
            </div>

            {/* Backup Codes Display */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="px-2 py-1 bg-background rounded text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyBackupCodes} className="flex-1">
                {copiedBackup ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {t('common.copy')}
              </Button>
              <Button variant="outline" onClick={handleDownloadBackupCodes} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                {t('common.download')}
              </Button>
            </div>

            <Button onClick={handleComplete} className="w-full">
              {t('common.done')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
