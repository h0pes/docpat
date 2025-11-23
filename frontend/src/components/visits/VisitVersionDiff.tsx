/**
 * Visit Version Diff Component
 *
 * Shows a side-by-side comparison of two visit versions highlighting the differences.
 * Useful for reviewing changes before restoring a version or for audit purposes.
 */

import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VisitVersion } from '@/types/visit';

interface VisitVersionDiffProps {
  /** Earlier version (from) */
  fromVersion: VisitVersion;
  /** Later version (to) */
  toVersion: VisitVersion;
}

/**
 * Visit Version Diff Component
 */
export function VisitVersionDiff({ fromVersion, toVersion }: VisitVersionDiffProps) {
  const { t } = useTranslation();

  /**
   * Helper to check if a field has changed
   */
  const hasChanged = (
    fromValue: string | undefined,
    toValue: string | undefined
  ): boolean => {
    return fromValue !== toValue;
  };

  /**
   * Helper to render a diff section
   */
  const renderDiffSection = (
    title: string,
    fromValue: string | undefined,
    toValue: string | undefined
  ) => {
    const changed = hasChanged(fromValue, toValue);

    if (!fromValue && !toValue) {
      return null;
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">{title}</h4>
          {changed && <Badge variant="outline">{t('common.changed')}</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* From version */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {t('visits.versions.version_number', {
                number: fromVersion.version_number,
              })}
            </p>
            <div
              className={`p-3 rounded-md border ${
                changed ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : 'bg-muted'
              }`}
            >
              {fromValue ? (
                <p className="text-sm whitespace-pre-wrap font-mono">{fromValue}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {t('common.empty')}
                </p>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* To version (appears on left due to grid) */}
          <div className="space-y-1 -ml-[calc(50%+1rem)]">
            <p className="text-xs text-muted-foreground">
              {t('visits.versions.version_number', {
                number: toVersion.version_number,
              })}
            </p>
            <div
              className={`p-3 rounded-md border ${
                changed ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-muted'
              }`}
            >
              {toValue ? (
                <p className="text-sm whitespace-pre-wrap font-mono">{toValue}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {t('common.empty')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 py-4">
      {/* Header with version info */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-muted-foreground">{t('visits.versions.from')}:</span>{' '}
          <span className="font-medium">
            {t('visits.versions.version_number', {
              number: fromVersion.version_number,
            })}
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div>
          <span className="text-muted-foreground">{t('visits.versions.to')}:</span>{' '}
          <span className="font-medium">
            {t('visits.versions.version_number', {
              number: toVersion.version_number,
            })}
          </span>
        </div>
      </div>

      <Separator />

      {/* Visit type comparison */}
      {hasChanged(fromVersion.visit_data.type, toVersion.visit_data.type) && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{t('visits.type')}</h4>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              {t(`visits.visit_types.${fromVersion.visit_data.type.toLowerCase()}`)}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge>
              {t(`visits.visit_types.${toVersion.visit_data.type.toLowerCase()}`)}
            </Badge>
          </div>
        </div>
      )}

      {/* Status comparison */}
      {hasChanged(fromVersion.visit_data.status, toVersion.visit_data.status) && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{t('visits.status.label')}</h4>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              {t(`visits.status.${fromVersion.visit_data.status.toLowerCase()}`)}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge>
              {t(`visits.status.${toVersion.visit_data.status.toLowerCase()}`)}
            </Badge>
          </div>
        </div>
      )}

      <Separator />

      {/* SOAP notes comparison */}
      {renderDiffSection(
        t('visits.soap.subjective'),
        fromVersion.visit_data.subjective,
        toVersion.visit_data.subjective
      )}

      {renderDiffSection(
        t('visits.soap.objective'),
        fromVersion.visit_data.objective,
        toVersion.visit_data.objective
      )}

      {renderDiffSection(
        t('visits.soap.assessment'),
        fromVersion.visit_data.assessment,
        toVersion.visit_data.assessment
      )}

      {renderDiffSection(
        t('visits.soap.plan'),
        fromVersion.visit_data.plan,
        toVersion.visit_data.plan
      )}

      <Separator />

      {/* Additional notes comparison */}
      {renderDiffSection(
        t('visits.additional_notes'),
        fromVersion.visit_data.additional_notes,
        toVersion.visit_data.additional_notes
      )}

      {renderDiffSection(
        t('visits.follow_up_instructions'),
        fromVersion.visit_data.follow_up_instructions,
        toVersion.visit_data.follow_up_instructions
      )}

      {/* Summary */}
      <div className="mt-6 p-4 bg-muted rounded-md">
        <p className="text-sm text-muted-foreground">
          {t('visits.versions.diff_legend')}
        </p>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded" />
            <span className="text-xs">{t('visits.versions.removed')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded" />
            <span className="text-xs">{t('visits.versions.added')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
