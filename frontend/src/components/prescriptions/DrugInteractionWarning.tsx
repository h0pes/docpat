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
 * Extended to include contraindicated (most severe) and unknown from DDInter database
 */
type InteractionSeverity = 'unknown' | 'minor' | 'moderate' | 'major' | 'contraindicated';

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
 * Colors are designed to be distinct and accessible in both light and dark modes
 */
function getSeverityStyles(severity: InteractionSeverity): {
  badge: string;
  alert: 'default' | 'destructive';
  icon: typeof AlertTriangle;
  bgColor: string;
  textColor: string;
} {
  switch (severity) {
    case 'contraindicated':
      // Deep purple/crimson for most severe
      return {
        badge: 'bg-purple-600 text-white border-purple-700 dark:bg-purple-700 dark:text-white',
        alert: 'destructive',
        icon: ShieldAlert,
        bgColor: 'bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700',
        textColor: 'text-purple-800 dark:text-purple-200',
      };
    case 'major':
      // Red for major severity
      return {
        badge: 'bg-red-600 text-white border-red-700 dark:bg-red-700 dark:text-white',
        alert: 'destructive',
        icon: ShieldAlert,
        bgColor: 'bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700',
        textColor: 'text-red-800 dark:text-red-200',
      };
    case 'moderate':
      // Amber/Yellow for moderate - clearly distinct from red
      return {
        badge: 'bg-amber-500 text-white border-amber-600 dark:bg-amber-600 dark:text-white',
        alert: 'default',
        icon: AlertCircle,
        bgColor: 'bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700',
        textColor: 'text-amber-800 dark:text-amber-200',
      };
    case 'minor':
      // Blue for minor severity
      return {
        badge: 'bg-blue-500 text-white border-blue-600 dark:bg-blue-600 dark:text-white',
        alert: 'default',
        icon: Info,
        bgColor: 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700',
        textColor: 'text-blue-800 dark:text-blue-200',
      };
    case 'unknown':
    default:
      // Gray for unknown
      return {
        badge: 'bg-gray-500 text-white border-gray-600 dark:bg-gray-600 dark:text-white',
        alert: 'default',
        icon: Info,
        bgColor: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
        textColor: 'text-gray-700 dark:text-gray-300',
      };
  }
}

/**
 * Get the highest severity from warnings
 */
function getHighestSeverity(warnings: DrugInteractionWarningType[]): InteractionSeverity {
  const severityOrder: InteractionSeverity[] = ['unknown', 'minor', 'moderate', 'major', 'contraindicated'];
  let highest: InteractionSeverity = 'unknown';

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
    <div className={cn('flex items-start gap-2 text-sm', styles.textColor, className)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div>
        <span className="font-medium">{warning.medication_name}</span>
        {' - '}
        <Badge variant="secondary" className={cn('text-xs py-0', styles.badge)}>
          {t(`prescriptions.interactions.severity.${warning.severity}`)}
        </Badge>
        {warning.description && (
          <p className="opacity-80 mt-0.5">{warning.description}</p>
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
              warningStyles.bgColor,
              warningStyles.textColor
            )}
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{warning.medication_name}</span>
                <Badge variant="secondary" className={cn('text-xs', warningStyles.badge)}>
                  {t(`prescriptions.interactions.severity.${warning.severity}`)}
                </Badge>
              </div>
              {warning.description && (
                <p className="text-sm mt-1 opacity-80">
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
