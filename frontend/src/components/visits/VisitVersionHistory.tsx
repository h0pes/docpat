/**
 * Visit Version History Component
 *
 * Displays a timeline of all visit versions with the ability to view and restore previous versions.
 * Shows when each version was created, by whom, and the version number.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, RotateCcw, Eye, History } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useVisitVersions, useRestoreVisitVersion } from '@/hooks/useVisits';
import { VisitVersion } from '@/types/visit';
import { VisitVersionDiff } from './VisitVersionDiff';
import { getStatusBadgeColor } from '@/types/visit';

interface VisitVersionHistoryProps {
  /** Visit ID to show version history for */
  visitId: string;
  /** Current version number */
  currentVersion?: number;
}

/**
 * Visit Version History Component
 */
export function VisitVersionHistory({ visitId, currentVersion }: VisitVersionHistoryProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State
  const [selectedVersion, setSelectedVersion] = useState<VisitVersion | null>(null);
  const [restoringVersion, setRestoringVersion] = useState<VisitVersion | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffVersions, setDiffVersions] = useState<{
    from: VisitVersion;
    to: VisitVersion;
  } | null>(null);

  // Fetch version history
  const { data: versions, isLoading } = useVisitVersions(visitId);

  // Restore mutation
  const restoreMutation = useRestoreVisitVersion();

  /**
   * Handle viewing version details
   */
  const handleViewVersion = (version: VisitVersion) => {
    setSelectedVersion(version);
  };

  /**
   * Handle comparing two versions
   */
  const handleCompareVersions = (version: VisitVersion, index: number) => {
    if (versions && versions.length > index + 1) {
      // Compare with next version (earlier version)
      setDiffVersions({
        from: versions[index + 1],
        to: version,
      });
      setShowDiff(true);
    }
  };

  /**
   * Handle version restore
   */
  const handleRestore = async () => {
    if (!restoringVersion) return;

    try {
      await restoreMutation.mutateAsync({
        visitId,
        versionId: restoringVersion.id,
      });
      toast({
        title: t('visits.versions.restore_success'),
        description: t('visits.versions.restore_success_description', {
          version: restoringVersion.version_number,
        }),
      });
      setRestoringVersion(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('visits.versions.restore_error'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t('visits.versions.no_versions')}
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {t('visits.versions.no_versions_description')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="relative space-y-4">
        {versions.map((version, index) => {
          const isCurrentVersion = currentVersion === version.version_number;
          const canRestore =
            !isCurrentVersion && version.visit_data.status === 'DRAFT';

          return (
            <div key={version.id} className="relative">
              {/* Timeline connector */}
              {index < versions.length - 1 && (
                <div className="absolute left-4 top-12 bottom-0 w-px bg-border" />
              )}

              {/* Version card */}
              <Card className={isCurrentVersion ? 'border-primary' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Version indicator */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isCurrentVersion
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                    </div>

                    {/* Version details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {t('visits.versions.version_number', {
                                number: version.version_number,
                              })}
                            </h4>
                            {isCurrentVersion && (
                              <Badge>{t('visits.versions.current')}</Badge>
                            )}
                            <Badge variant={getStatusBadgeColor(version.visit_data.status)}>
                              {t(`visits.status.${version.visit_data.status.toLowerCase()}`)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t('visits.versions.changed_by', {
                              name: version.changed_by,
                            })}{' '}
                            •{' '}
                            {format(
                              new Date(version.changed_at),
                              'PPp'
                            )}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewVersion(version)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t('common.view')}
                          </Button>
                          {index < versions.length - 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCompareVersions(version, index)}
                            >
                              {t('visits.versions.compare')}
                            </Button>
                          )}
                          {canRestore && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRestoringVersion(version)}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              {t('visits.versions.restore')}
                            </Button>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Preview of changes */}
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="text-muted-foreground">
                            {t('visits.type')}:
                          </span>{' '}
                          {t(`visits.visit_types.${version.visit_data.type.toLowerCase()}`)}
                        </div>
                        {version.visit_data.vitals && (
                          <div>
                            <span className="text-muted-foreground">
                              {t('visits.vitals')}:
                            </span>{' '}
                            {t('common.recorded')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Version details dialog */}
      <Dialog open={!!selectedVersion} onOpenChange={() => setSelectedVersion(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('visits.versions.version_number', {
                number: selectedVersion?.version_number,
              })}
            </DialogTitle>
            <DialogDescription>
              {selectedVersion &&
                t('visits.versions.changed_by', {
                  name: selectedVersion.changed_by,
                })}{' '}
              •{' '}
              {selectedVersion &&
                format(new Date(selectedVersion.changed_at), 'PPp')}
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <div className="space-y-4 py-4">
              {/* SOAP notes */}
              {selectedVersion.visit_data.subjective && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('visits.soap.subjective')}</h4>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedVersion.visit_data.subjective}
                    </p>
                  </div>
                </div>
              )}

              {selectedVersion.visit_data.objective && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('visits.soap.objective')}</h4>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedVersion.visit_data.objective}
                    </p>
                  </div>
                </div>
              )}

              {selectedVersion.visit_data.assessment && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('visits.soap.assessment')}</h4>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedVersion.visit_data.assessment}
                    </p>
                  </div>
                </div>
              )}

              {selectedVersion.visit_data.plan && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">{t('visits.soap.plan')}</h4>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedVersion.visit_data.plan}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Version comparison dialog */}
      <Dialog open={showDiff} onOpenChange={() => setShowDiff(false)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('visits.versions.compare_versions')}</DialogTitle>
            <DialogDescription>
              {diffVersions &&
                t('visits.versions.comparing_versions', {
                  from: diffVersions.from.version_number,
                  to: diffVersions.to.version_number,
                })}
            </DialogDescription>
          </DialogHeader>
          {diffVersions && (
            <VisitVersionDiff fromVersion={diffVersions.from} toVersion={diffVersions.to} />
          )}
        </DialogContent>
      </Dialog>

      {/* Restore confirmation dialog */}
      <AlertDialog
        open={!!restoringVersion}
        onOpenChange={() => setRestoringVersion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('visits.versions.restore_version')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('visits.versions.restore_confirmation', {
                version: restoringVersion?.version_number,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              {t('visits.versions.restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
