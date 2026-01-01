/**
 * DrugInteractionWarning Component
 *
 * Displays drug interaction warnings with severity-based styling.
 * Can be used in prescription lists, detail pages, and forms.
 */

import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info, AlertCircle, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DrugInteractionWarning as DrugInteractionWarningType } from '@/types/prescription';
import { useState } from 'react';

/**
 * Severity levels for drug interactions
 */
type InteractionSeverity = 'minor' | 'moderate' | 'major';

/**
 * Props for DrugInteractionWarning component
 */
interface DrugInteractionWarningProps {
  /** Array of interaction warnings to display */
  warnings: DrugInteractionWarningType[];
  /** Display mode: 'full' for detailed view, 'compact' for badge only, 'inline' for single line */
  mode?: 'full' | 'compact' | 'inline';
  /** Whether to show collapsible details in full mode */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Get styling for severity level
 */
function getSeverityStyles(severity: InteractionSeverity): {
  badge: string;
  alert: 'default' | 'destructive';
  icon: typeof AlertTriangle;
  bgColor: string;
} {
  switch (severity) {
    case 'major':
      return {
        badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300',
        alert: 'destructive',
        icon: ShieldAlert,
        bgColor: 'bg-red-50 dark:bg-red-950 border-red-200',
      };
    case 'moderate':
      return {
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300',
        alert: 'default',
        icon: AlertCircle,
        bgColor: 'bg-orange-50 dark:bg-orange-950 border-orange-200',
      };
    case 'minor':
    default:
      return {
        badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300',
        alert: 'default',
        icon: Info,
        bgColor: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200',
      };
  }
}

/**
 * Get the highest severity from warnings
 */
function getHighestSeverity(warnings: DrugInteractionWarningType[]): InteractionSeverity {
  const severityOrder: InteractionSeverity[] = ['minor', 'moderate', 'major'];
  let highest: InteractionSeverity = 'minor';

  for (const warning of warnings) {
    const severity = warning.severity as InteractionSeverity;
    if (severityOrder.indexOf(severity) > severityOrder.indexOf(highest)) {
      highest = severity;
    }
  }

  return highest;
}

/**
 * Compact badge display for interaction warnings
 */
function InteractionBadge({
  warnings,
  className,
}: {
  warnings: DrugInteractionWarningType[];
  className?: string;
}) {
  const { t } = useTranslation();
  const highestSeverity = getHighestSeverity(warnings);
  const styles = getSeverityStyles(highestSeverity);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('cursor-help', styles.badge, className)}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            {warnings.length === 1
              ? t('prescriptions.interactions.one_warning')
              : t('prescriptions.interactions.count_warnings', { count: warnings.length })}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-1">
            {warnings.map((warning, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">{warning.medication_name}</span>
                {' - '}
                <span className="capitalize">{t(`prescriptions.interactions.severity.${warning.severity}`)}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline display for single interaction
 */
function InlineWarning({
  warning,
  className,
}: {
  warning: DrugInteractionWarningType;
  className?: string;
}) {
  const { t } = useTranslation();
  const styles = getSeverityStyles(warning.severity as InteractionSeverity);
  const Icon = styles.icon;

  return (
    <div className={cn('flex items-start gap-2 text-sm', className)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <span className="font-medium">{warning.medication_name}</span>
        {' - '}
        <Badge variant="outline" className={cn('text-xs py-0', styles.badge)}>
          {t(`prescriptions.interactions.severity.${warning.severity}`)}
        </Badge>
        {warning.description && (
          <p className="text-muted-foreground mt-0.5">{warning.description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Full alert display for interactions
 */
function FullWarningAlert({
  warnings,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: {
  warnings: DrugInteractionWarningType[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const highestSeverity = getHighestSeverity(warnings);
  const styles = getSeverityStyles(highestSeverity);

  const content = (
    <div className="mt-2 space-y-3">
      {warnings.map((warning, index) => {
        const warningStyles = getSeverityStyles(warning.severity as InteractionSeverity);
        const Icon = warningStyles.icon;

        return (
          <div
            key={index}
            className={cn(
              'flex items-start gap-3 p-3 rounded-md border',
              warningStyles.bgColor
            )}
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{warning.medication_name}</span>
                <Badge variant="outline" className={cn('text-xs', warningStyles.badge)}>
                  {t(`prescriptions.interactions.severity.${warning.severity}`)}
                </Badge>
              </div>
              {warning.description && (
                <p className="text-sm mt-1 text-muted-foreground">
                  {warning.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
        <Alert variant={styles.alert}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>{t('prescriptions.interactions.title')}</span>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                {isOpen
                  ? t('prescriptions.interactions.hide_details')
                  : t('prescriptions.interactions.show_details')}
              </Button>
            </CollapsibleTrigger>
          </AlertTitle>
          <AlertDescription>
            <p className="text-sm">
              {warnings.length === 1
                ? t('prescriptions.interactions.single_interaction')
                : t('prescriptions.interactions.multiple_interactions', { count: warnings.length })}
            </p>
            <CollapsibleContent>{content}</CollapsibleContent>
          </AlertDescription>
        </Alert>
      </Collapsible>
    );
  }

  return (
    <Alert variant={styles.alert} className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{t('prescriptions.interactions.title')}</AlertTitle>
      <AlertDescription>
        {content}
      </AlertDescription>
    </Alert>
  );
}

/**
 * DrugInteractionWarning Component
 *
 * Displays drug interaction warnings with severity-based styling.
 */
export function DrugInteractionWarning({
  warnings,
  mode = 'full',
  collapsible = false,
  defaultCollapsed = false,
  className,
}: DrugInteractionWarningProps) {
  // Don't render if no warnings
  if (!warnings || warnings.length === 0) {
    return null;
  }

  switch (mode) {
    case 'compact':
      return <InteractionBadge warnings={warnings} className={className} />;

    case 'inline':
      return (
        <div className={cn('space-y-2', className)}>
          {warnings.map((warning, index) => (
            <InlineWarning key={index} warning={warning} />
          ))}
        </div>
      );

    case 'full':
    default:
      return (
        <FullWarningAlert
          warnings={warnings}
          collapsible={collapsible}
          defaultCollapsed={defaultCollapsed}
          className={className}
        />
      );
  }
}
