/**
 * VisitsPage Component
 *
 * Main page for viewing and managing clinical visits.
 * Provides a list view with filtering, search, and quick actions.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, Calendar, User, Filter } from 'lucide-react';
import { format } from 'date-fns';

import { useVisits } from '@/hooks/useVisits';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PatientSearchCombobox } from '@/components/appointments/PatientSearchCombobox';
import { VisitStatus, Visit } from '@/types/visit';

/**
 * Get status badge variant based on visit status
 */
function getStatusVariant(status: VisitStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case VisitStatus.DRAFT:
      return 'secondary';
    case VisitStatus.SIGNED:
      return 'default';
    case VisitStatus.LOCKED:
      return 'outline';
    default:
      return 'default';
  }
}

/**
 * VisitsPage Component
 */
export function VisitsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [limit] = useState(50);
  const [offset] = useState(0);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Fetch visits
  const { data: visitsData, isLoading, isError, error } = useVisits({ limit, offset });

  /**
   * Handle visit click - navigate to detail page
   */
  const handleVisitClick = (visitId: string) => {
    navigate(`/visits/${visitId}`);
  };

  /**
   * Handle new visit click - show patient selector first
   */
  const handleNewVisit = () => {
    setShowPatientSelector(true);
  };

  /**
   * Handle patient selection - navigate to new visit page with patient ID
   */
  const handlePatientSelected = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowPatientSelector(false);
    navigate(`/visits/new?patientId=${patientId}`);
  };

  /**
   * Handle manage templates click
   */
  const handleManageTemplates = () => {
    navigate('/visits/templates');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('visits.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('visits.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleManageTemplates}>
            <FileText className="mr-2 h-4 w-4" />
            {t('visits.manage_templates')}
          </Button>
          <Button onClick={handleNewVisit}>
            <Plus className="mr-2 h-4 w-4" />
            {t('visits.new_visit')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {visitsData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('visits.total_visits')}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{visitsData.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('visits.draft_visits')}
              </CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {visitsData.visits.filter(v => v.status === VisitStatus.DRAFT).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('visits.signed_visits')}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {visitsData.visits.filter(v => v.status === VisitStatus.SIGNED || v.status === VisitStatus.LOCKED).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Visits List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('visits.recent_visits')}</CardTitle>
          <CardDescription>
            {t('visits.recent_visits_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error ? error.message : t('visits.error_loading')}
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {visitsData && visitsData.visits.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('visits.no_visits')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('visits.no_visits_description')}
              </p>
              <Button onClick={handleNewVisit}>
                <Plus className="mr-2 h-4 w-4" />
                {t('visits.create_first_visit')}
              </Button>
            </div>
          )}

          {/* Visits List */}
          {visitsData && visitsData.visits.length > 0 && (
            <div className="space-y-3">
              {visitsData.visits.map((visit: Visit) => (
                <div
                  key={visit.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleVisitClick(visit.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-sm font-semibold">
                        {visit.patient_name}
                      </h4>
                      <Badge variant={getStatusVariant(visit.status)}>
                        {t(`visits.status.${visit.status.toLowerCase()}`)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(visit.visit_date), 'PPp')}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {t(`visits.type.${visit.visit_type.toLowerCase()}`)}
                      </div>
                      {visit.signed_by && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {t('visits.signed_by', { name: visit.signed_by_name })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVisitClick(visit.id);
                    }}
                  >
                    {t('common.view')}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination placeholder */}
          {visitsData && visitsData.total > limit && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {t('common.showing', {
                start: offset + 1,
                end: Math.min(offset + limit, visitsData.total),
                total: visitsData.total,
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Selection Dialog */}
      <Dialog open={showPatientSelector} onOpenChange={setShowPatientSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('visits.select_patient')}</DialogTitle>
            <DialogDescription>
              {t('visits.select_patient_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <PatientSearchCombobox
              value={selectedPatientId || ''}
              onSelect={handlePatientSelected}
              placeholder={t('patients.search_placeholder')}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
