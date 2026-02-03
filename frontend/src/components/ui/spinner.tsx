/**
 * Spinner Components
 *
 * Loading spinners with different sizes and variants for various contexts.
 * Includes accessibility support with role="status" and screen reader labels.
 */

import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Spinner component props
 */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Size mappings for spinner
 */
const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

/**
 * Spinner component for loading states
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', sizeMap[size], className)}
    />
  );
}

/**
 * Props for page-level spinner components
 */
interface PageSpinnerProps {
  /** Custom loading label (defaults to translated "Loading...") */
  label?: string;
}

/**
 * FullPageSpinner - centered spinner for full page loading
 *
 * Uses role="status" and a screen-reader-only label for accessibility.
 */
export function FullPageSpinner({ label }: PageSpinnerProps) {
  const { t } = useTranslation();
  const loadingText = label || t('common.loading');

  return (
    <div className="flex h-screen items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-sm text-muted-foreground">{loadingText}</p>
      </div>
    </div>
  );
}

/**
 * PageSpinner - centered spinner for page content loading
 *
 * Uses role="status" and a screen-reader-only label for accessibility.
 */
export function PageSpinner({ label }: PageSpinnerProps) {
  const { t } = useTranslation();
  const loadingText = label || t('common.loading');

  return (
    <div className="flex h-96 items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{loadingText}</p>
      </div>
    </div>
  );
}
