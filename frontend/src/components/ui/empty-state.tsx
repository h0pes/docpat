/**
 * Reusable EmptyState component
 *
 * Provides a consistent visual pattern for empty lists, search results,
 * and widget sections. Supports two variants: "default" for full-page
 * list views (wrapped in a Card) and "compact" for inline use within
 * cards and widgets.
 */

import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Main heading text */
  title: string;
  /** Optional descriptive text below the heading */
  description?: string;
  /** Optional CTA button or action element */
  action?: React.ReactNode;
  /**
   * Size variant:
   * - "default": larger icon (h-12 w-12), more padding (py-12), wrapped in Card
   * - "compact": smaller icon (h-8 w-8), less padding (py-6), no Card wrapper
   */
  variant?: 'default' | 'compact';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Empty state display for lists, tables, and widget sections.
 *
 * @example
 * ```tsx
 * // Full list view with CTA
 * <EmptyState
 *   icon={UserPlus}
 *   title={t('patients.no_patients')}
 *   description={t('patients.no_patients_description')}
 *   action={<Button onClick={onAdd}><UserPlus className="mr-2 h-4 w-4" />{t('patients.add_first')}</Button>}
 * />
 *
 * // Compact widget section
 * <EmptyState
 *   variant="compact"
 *   icon={Calendar}
 *   title={t('appointments.no_appointments_today')}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const isCompact = variant === 'compact';

  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        isCompact ? 'py-6' : 'py-12',
        className
      )}
    >
      <Icon
        className={cn(
          'text-muted-foreground mb-2',
          isCompact ? 'h-8 w-8' : 'h-12 w-12 mb-4'
        )}
      />
      <h3
        className={cn(
          'font-semibold mb-2',
          isCompact ? 'text-sm' : 'text-lg'
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'text-muted-foreground text-center mb-4',
            isCompact ? 'text-xs' : 'text-sm'
          )}
        >
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );

  if (isCompact) {
    return content;
  }

  return (
    <Card>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
