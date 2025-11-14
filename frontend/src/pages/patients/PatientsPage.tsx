/**
 * Patients List Page
 *
 * Displays the full list of patients with search, filters, and pagination.
 * Uses the PatientList component for the main functionality.
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientList } from '@/components/patients/PatientList';

/**
 * PatientsPage Component
 *
 * Main page for viewing and managing patients.
 * Includes navigation to create new patients.
 */
export function PatientsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  /**
   * Handle patient card click - navigate to patient detail page
   */
  const handlePatientClick = (patientId: string) => {
    navigate(`/patients/${patientId}`);
  };

  /**
   * Handle create new patient button click
   */
  const handleCreatePatient = () => {
    navigate('/patients/new');
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('patients.list.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('patients.list.subtitle')}
          </p>
        </div>
        <Button onClick={handleCreatePatient} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('patients.actions.new')}
        </Button>
      </div>

      {/* Patient list with search, filters, and pagination */}
      <PatientList onPatientClick={handlePatientClick} />
    </div>
  );
}
