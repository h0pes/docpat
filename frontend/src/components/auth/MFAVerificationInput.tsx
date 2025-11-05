/**
 * MFA Verification Input Component
 *
 * A reusable component for entering 6-digit MFA codes.
 * Features auto-focus, auto-submit, and keyboard navigation.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MFAVerificationInputProps {
  /** Current value of the MFA code */
  value: string;
  /** Callback when the code changes */
  onChange: (code: string) => void;
  /** Callback when a complete code is entered (6 digits) */
  onComplete?: (code: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to show an error state */
  error?: boolean;
  /** Optional error message */
  errorMessage?: string;
  /** Whether to auto-focus the first input */
  autoFocus?: boolean;
  /** Optional className for styling */
  className?: string;
}

/**
 * MFA verification input with 6 individual digit boxes
 */
export function MFAVerificationInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  errorMessage,
  autoFocus = true,
  className,
}: MFAVerificationInputProps) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update digits when value prop changes
  useEffect(() => {
    const newDigits = value.padEnd(6, ' ').split('').slice(0, 6).map(d => d === ' ' ? '' : d);
    setDigits(newDigits);
  }, [value]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  /**
   * Handle input change
   */
  const handleChange = (index: number, newValue: string) => {
    // Only allow digits
    const sanitized = newValue.replace(/[^0-9]/g, '');

    if (sanitized.length === 0) {
      // Handle backspace/delete
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      onChange(newDigits.join(''));
      return;
    }

    // Handle paste of multiple digits
    if (sanitized.length > 1) {
      const newDigits = [...digits];
      const pastedDigits = sanitized.split('').slice(0, 6 - index);

      pastedDigits.forEach((digit, i) => {
        if (index + i < 6) {
          newDigits[index + i] = digit;
        }
      });

      setDigits(newDigits);
      const code = newDigits.join('');
      onChange(code);

      // Focus last filled input or next empty
      const nextIndex = Math.min(index + pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();

      // Auto-submit if complete
      if (code.length === 6 && onComplete) {
        onComplete(code);
      }
      return;
    }

    // Handle single digit input
    const newDigits = [...digits];
    newDigits[index] = sanitized;
    setDigits(newDigits);

    const code = newDigits.join('');
    onChange(code);

    // Auto-advance to next input
    if (index < 5 && sanitized) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if complete
    if (code.length === 6 && onComplete) {
      onComplete(code);
    }
  };

  /**
   * Handle key down for backspace navigation
   */
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      // Navigate left
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      // Navigate right
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * Handle focus to select all text
   */
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor="mfa-input-0" className="text-sm font-medium">
        {t('auth.mfa.enterCode')}
      </Label>

      <div className="flex gap-2 justify-center">
        {digits.map((digit, index) => (
          <Input
            key={index}
            id={`mfa-input-${index}`}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={handleFocus}
            disabled={disabled}
            className={cn(
              'w-12 h-14 text-center text-2xl font-semibold',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
            aria-label={`${t('auth.mfa.digit')} ${index + 1}`}
          />
        ))}
      </div>

      {error && errorMessage && (
        <p className="text-sm text-destructive text-center" role="alert">
          {errorMessage}
        </p>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {t('auth.mfa.enterCodeHelp')}
      </p>
    </div>
  );
}
