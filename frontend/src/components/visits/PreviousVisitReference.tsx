/**
 * PreviousVisitReference Component
 *
 * Displays a quick reference panel showing recent visit information for a patient.
 * Helps providers review previous documentation while creating a new visit.
 *
 * Features:
 * - Shows last 3 visits by default
 * - Displays key information: date, chief complaint, diagnoses, medications
 * - Expandable SOAP notes preview
 * - Vital signs comparison
 * - Click to view full visit details
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePatientVisits } from '@/hooks/useVisits';
import { format } from 'date-fns';
import { enUS, it } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { History, ChevronDown, ChevronUp, Calendar, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Visit } from '@/types/visits';

/**
 * PreviousVisitReference component props
 */
interface PreviousVisitReferenceProps {
  /**
   * Patient ID to fetch visit history for
   */
  patientId: string;

  /**
   * Number of recent visits to display (default: 3)
   */
  maxVisits?: number;

  /**
   * Optional button variant
   */
  variant?: 'default' | 'outline' | 'ghost';

  /**
   * Optional button size
   */
  size?: 'default' | 'sm' | 'lg';
}

/**
 * Single visit summary card component
 */
function VisitSummaryCard({ visit }: { visit: Visit }) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const locale = i18n.language === 'it' ? it : enUS;
  const visitDate = format(new Date(visit.visit_date), 'PPP', { locale });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{visitDate}</span>
            </div>
            <CardTitle className="text-base">{visit.visit_type}</CardTitle>
            <Badge variant={visit.status === 'DRAFT' ? 'outline' : 'default'}>
              {t(`visits.status.${visit.status.toLowerCase()}`)}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Chief Complaint */}
        {visit.chief_complaint && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('visits.form.chiefComplaint')}
            </p>
            <p className="text-sm">{visit.chief_complaint}</p>
          </div>
        )}

        {/* Diagnoses */}
        {visit.diagnoses && visit.diagnoses.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t('visits.previousVisit.diagnoses')}
            </p>
            <div className="flex flex-wrap gap-1">
              {visit.diagnoses.map((diag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {diag.icd10_code}: {diag.description}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Medications */}
        {visit.prescriptions && visit.prescriptions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t('visits.previousVisit.medications')}
            </p>
            <div className="space-y-1">
              {visit.prescriptions.slice(0, 3).map((rx, idx) => (
                <p key={idx} className="text-sm">
                  {rx.medication_name} - {rx.dosage} {rx.frequency}
                </p>
              ))}
              {visit.prescriptions.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  {t('visits.previousVisit.moreMedications', {
                    count: visit.prescriptions.length - 3,
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Expanded SOAP Notes */}
        {expanded && (
          <>
            <Separator />
            <div className="space-y-3">
              {/* Vital Signs */}
              {visit.vital_signs && (
                <div>
                  <p className="text-sm font-medium mb-1">
                    {t('visits.form.vitals.title')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {visit.vital_signs.systolic_bp && (
                      <div>
                        <span className="text-muted-foreground">
                          {t('visits.form.vitals.bloodPressure')}:
                        </span>{' '}
                        {visit.vital_signs.systolic_bp}/{visit.vital_signs.diastolic_bp}
                      </div>
                    )}
                    {visit.vital_signs.heart_rate && (
                      <div>
                        <span className="text-muted-foreground">
                          {t('visits.form.vitals.heartRate')}:
                        </span>{' '}
                        {visit.vital_signs.heart_rate}
                      </div>
                    )}
                    {visit.vital_signs.weight_kg && (
                      <div>
                        <span className="text-muted-foreground">
                          {t('visits.form.vitals.weight')}:
                        </span>{' '}
                        {visit.vital_signs.weight_kg} kg
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SOAP Notes Preview */}
              {visit.soap_subjective && (
                <div>
                  <p className="text-sm font-medium">{t('visits.form.soap.subjective')}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {visit.soap_subjective}
                  </p>
                </div>
              )}
              {visit.soap_assessment && (
                <div>
                  <p className="text-sm font-medium">{t('visits.form.soap.assessment')}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {visit.soap_assessment}
                  </p>
                </div>
              )}
              {visit.soap_plan && (
                <div>
                  <p className="text-sm font-medium">{t('visits.form.soap.plan')}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {visit.soap_plan}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * PreviousVisitReference component
 */
export function PreviousVisitReference({
  patientId,
  maxVisits = 3,
  variant = 'outline',
  size = 'sm',
}: PreviousVisitReferenceProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Fetch patient visits
  const { data: visits, isLoading, isError } = usePatientVisits(patientId);

  // Filter to recent visits (excluding current draft if creating new)
  const recentVisits = visits
    ?.filter((v) => v.status !== 'DRAFT')
    .slice(0, maxVisits) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <History className="h-4 w-4 mr-2" />
          {t('visits.previousVisit.buttonLabel')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('visits.previousVisit.title')}</DialogTitle>
          <DialogDescription>{t('visits.previousVisit.description')}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertDescription>{t('visits.previousVisit.errorLoading')}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && recentVisits.length === 0 && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>{t('visits.previousVisit.noVisits')}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && recentVisits.length > 0 && (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {recentVisits.map((visit) => (
                <VisitSummaryCard key={visit.id} visit={visit} />
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
