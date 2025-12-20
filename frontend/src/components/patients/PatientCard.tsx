/**
 * PatientCard Component
 *
 * Displays a patient summary card with key information
 * Used in patient lists and search results
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Patient, PatientStatus, Gender } from '@/types/patient';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Calendar, Phone, Mail, Heart, FileText, MoreVertical, Eye, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface PatientCardProps {
  patient: Patient;
  onClick?: () => void;
  onDelete?: (patientId: string) => void;
  onReactivate?: (patientId: string) => void;
  className?: string;
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Get patient status badge variant
 */
function getStatusVariant(status: PatientStatus): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case PatientStatus.ACTIVE:
      return 'default';
    case PatientStatus.INACTIVE:
      return 'secondary';
    case PatientStatus.DECEASED:
      return 'destructive';
  }
}

/**
 * Get gender display label
 */
function getGenderLabel(gender: Gender): string {
  switch (gender) {
    case Gender.M:
      return 'M';
    case Gender.F:
      return 'F';
    case Gender.OTHER:
      return 'Other';
    case Gender.UNKNOWN:
      return '?';
  }
}

/**
 * Get patient initials for avatar
 */
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * PatientCard component
 */
export function PatientCard({ patient, onClick, onDelete, onReactivate, className }: PatientCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const age = calculateAge(patient.date_of_birth);
  const fullName = `${patient.first_name} ${patient.last_name}`;

  // Check if user has admin role for delete/reactivate permission
  const canManage = user?.role === 'ADMIN';
  const isInactive = patient.status === PatientStatus.INACTIVE;

  /**
   * Handle quick action: View details
   */
  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/patients/${patient.id}`);
  };

  /**
   * Handle quick action: Edit patient
   */
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/patients/${patient.id}/edit`);
  };

  /**
   * Handle quick action: Delete patient
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(patient.id);
    }
  };

  /**
   * Handle quick action: Reactivate patient
   */
  const handleReactivate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReactivate) {
      onReactivate(patient.id);
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-accent ${className || ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={patient.photo_url} alt={fullName} />
              <AvatarFallback>
                {getInitials(patient.first_name, patient.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg leading-none">
                {fullName}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {patient.medical_record_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(patient.status)}>
              {t(`patients.status.${patient.status.toLowerCase()}`)}
            </Badge>
            <Badge variant="outline">
              {getGenderLabel(patient.gender)}
            </Badge>

            {/* Quick Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">{t('common.actions')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleView}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('patients.actions.view')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('patients.actions.edit')}
                </DropdownMenuItem>
                {canManage && (
                  <>
                    <DropdownMenuSeparator />
                    {isInactive ? (
                      <DropdownMenuItem
                        onClick={handleReactivate}
                        className="text-blue-600 focus:text-blue-600"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('patients.actions.reactivate')}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('patients.actions.delete')}
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Age and Date of Birth */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {t('patients.age')}: {age} {t('patients.years')}
          </span>
          <span className="text-muted-foreground">
            ({formatDate(patient.date_of_birth)})
          </span>
        </div>

        {/* Contact Information */}
        <div className="flex flex-wrap gap-4 text-sm">
          {patient.phone_primary && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{patient.phone_primary}</span>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate max-w-[200px]">{patient.email}</span>
            </div>
          )}
        </div>

        {/* Medical Alerts */}
        {(patient.allergies && patient.allergies.length > 0) ||
        (patient.chronic_conditions && patient.chronic_conditions.length > 0) ? (
          <div className="flex items-start gap-2 text-sm pt-2 border-t">
            <Heart className="h-4 w-4 text-destructive mt-0.5" />
            <div className="flex-1">
              {patient.allergies && patient.allergies.length > 0 && (
                <div>
                  <span className="font-medium text-destructive">
                    {t('patients.allergies')}:
                  </span>{' '}
                  <span className="text-muted-foreground">
                    {patient.allergies.join(', ')}
                  </span>
                </div>
              )}
              {patient.chronic_conditions && patient.chronic_conditions.length > 0 && (
                <div>
                  <span className="font-medium">
                    {t('patients.chronic_conditions')}:
                  </span>{' '}
                  <span className="text-muted-foreground">
                    {patient.chronic_conditions.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Notes Preview */}
        {patient.notes && (
          <div className="flex items-start gap-2 text-sm pt-2 border-t">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-muted-foreground line-clamp-2 flex-1">
              {patient.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
