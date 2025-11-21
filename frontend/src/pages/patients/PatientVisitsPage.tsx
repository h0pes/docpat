/**
 * PatientVisitsPage
 *
 * Page displaying visit history for a specific patient.
 * Shows chronological list of all visits with filtering and search.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Calendar, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, it } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePatientVisits } from '@/hooks/useVisits';
import { VisitStatus, getStatusColor } from '@/types/visit';

/**
 * PatientVisitsPage Component
 */
export function PatientVisitsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id: patientId } = useParams<{ id: string }>();

  // Fetch patient visits
  const { data: visits, isLoading, isError, error } = usePatientVisits(patientId!);

  // Get date-fns locale
  const getDateFnsLocale = () => {
    return i18n.language === 'it' ? it : enUS;
  };

  /**
   * Handle new visit
   */
  const handleNewVisit = () => {
    navigate(`/visits/new?patientId=${patientId}`);
  };

  /**
   * Handle visit click
   */
  const handleVisitClick = (visitId: string) => {
    navigate(`/visits/${visitId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : t('visits.messages.loadError')}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate(`/patients/${patientId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('patients.title')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/patients/${patientId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('visits.visit_history')}</h1>
            <p className="text-muted-foreground">
              {visits?.length || 0} {t('visits.total_visits')}
            </p>
          </div>
        </div>

        <Button onClick={handleNewVisit}>
          <Plus className="mr-2 h-4 w-4" />
          {t('visits.new_visit')}
        </Button>
      </div>

      {/* Visits list */}
      {!visits || visits.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">{t('visits.no_visits')}</h3>
                <p className="text-muted-foreground">{t('visits.no_visits_description')}</p>
              </div>
              <Button onClick={handleNewVisit}>
                <Plus className="mr-2 h-4 w-4" />
                {t('visits.new_visit')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => (
            <Card
              key={visit.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleVisitClick(visit.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {format(new Date(visit.visit_date), 'PPP', {
                          locale: getDateFnsLocale(),
                        })}
                      </span>
                    </div>
                    <CardTitle className="text-base">
                      {t(`visits.visit_types.${visit.visit_type.toLowerCase()}`)}
                    </CardTitle>
                    {visit.chief_complaint && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {visit.chief_complaint}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(visit.status)}>
                    {t(`visits.status.${visit.status.toLowerCase()}`)}
                  </Badge>
                </div>
              </CardHeader>
              {(visit.subjective || visit.objective || visit.assessment || visit.plan) && (
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    {visit.subjective && (
                      <div>
                        <span className="font-semibold">
                          {t('visits.soap.subjective.title')}:
                        </span>
                        <p className="text-muted-foreground line-clamp-2 mt-1">
                          {visit.subjective}
                        </p>
                      </div>
                    )}
                    {visit.objective && (
                      <div>
                        <span className="font-semibold">
                          {t('visits.soap.objective.title')}:
                        </span>
                        <p className="text-muted-foreground line-clamp-2 mt-1">
                          {visit.objective}
                        </p>
                      </div>
                    )}
                    {visit.assessment && (
                      <div>
                        <span className="font-semibold">
                          {t('visits.soap.assessment.title')}:
                        </span>
                        <p className="text-muted-foreground line-clamp-2 mt-1">
                          {visit.assessment}
                        </p>
                      </div>
                    )}
                    {visit.plan && (
                      <div>
                        <span className="font-semibold">{t('visits.soap.plan.title')}:</span>
                        <p className="text-muted-foreground line-clamp-2 mt-1">
                          {visit.plan}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
