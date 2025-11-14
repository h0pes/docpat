/**
 * PatientDetail Component
 *
 * Displays comprehensive patient information in a structured layout
 * Shows demographics, contact info, medical data, and insurance
 */

import { useTranslation } from 'react-i18next';
import {
  User,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Heart,
  FileText,
  Calendar,
  CreditCard,
  Shield,
  Edit,
  Trash2,
} from 'lucide-react';

import { Patient, Gender, ContactMethod, PatientStatus } from '@/types/patient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface PatientDetailProps {
  patient: Patient;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
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
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Get patient initials for avatar
 */
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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
 * InfoRow Component - Displays a label-value pair
 */
function InfoRow({ label, value, icon }: { label: string; value?: string | number | null; icon?: React.ReactNode }) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <div className="text-muted-foreground mt-0.5">{icon}</div>}
      <div className="flex-1 grid grid-cols-3 gap-2">
        <div className="text-sm font-medium text-muted-foreground">{label}:</div>
        <div className="text-sm col-span-2">{value}</div>
      </div>
    </div>
  );
}

/**
 * PatientDetail Component
 */
export function PatientDetail({ patient, onEdit, onDelete, showActions = true }: PatientDetailProps) {
  const { t } = useTranslation();
  const age = calculateAge(patient.date_of_birth);
  const fullName = `${patient.first_name} ${patient.middle_name ? patient.middle_name + ' ' : ''}${patient.last_name}`;

  return (
    <div className="space-y-6">
      {/* Header with Avatar and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={patient.photo_url} alt={fullName} />
                <AvatarFallback className="text-2xl">
                  {getInitials(patient.first_name, patient.last_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getStatusVariant(patient.status)}>
                    {t(`patients.status.${patient.status.toLowerCase()}`)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    MRN: {patient.medical_record_number}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1">
                  {age} {t('patients.years')} • {formatDate(patient.date_of_birth)}
                </p>
              </div>
            </div>

            {showActions && (
              <div className="flex gap-2">
                {onEdit && (
                  <Button variant="outline" onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    {t('common.edit')}
                  </Button>
                )}
                {onDelete && (
                  <Button variant="destructive" onClick={onDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('common.delete')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('patients.form.demographics')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label={t('patients.form.first_name')} value={patient.first_name} />
            <InfoRow label={t('patients.form.last_name')} value={patient.last_name} />
            {patient.middle_name && (
              <InfoRow label={t('patients.form.middle_name')} value={patient.middle_name} />
            )}
            <InfoRow
              label={t('patients.gender.label')}
              value={t(`patients.gender.${patient.gender.toLowerCase()}`)}
            />
            <InfoRow label={t('patients.form.fiscal_code')} value={patient.fiscal_code} />
            <InfoRow
              label={t('patients.age')}
              value={`${age} ${t('patients.years')}`}
            />
            <InfoRow
              label={t('patients.form.date_of_birth')}
              value={formatDate(patient.date_of_birth)}
            />
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {t('patients.form.contact')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow
              label={t('patients.form.phone_primary')}
              value={patient.phone_primary}
              icon={<Phone className="h-4 w-4" />}
            />
            <InfoRow
              label={t('patients.form.phone_secondary')}
              value={patient.phone_secondary}
              icon={<Phone className="h-4 w-4" />}
            />
            <InfoRow
              label={t('patients.form.email')}
              value={patient.email}
              icon={<Mail className="h-4 w-4" />}
            />
            <InfoRow
              label={t('patients.form.preferred_contact')}
              value={
                patient.preferred_contact_method
                  ? t(`patients.contact_method.${patient.preferred_contact_method.toLowerCase()}`)
                  : undefined
              }
            />
          </CardContent>
        </Card>

        {/* Address */}
        {patient.address && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t('patients.form.address')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label={t('patients.form.street')} value={patient.address.street} />
              <InfoRow label={t('patients.form.city')} value={patient.address.city} />
              <InfoRow label={t('patients.form.state')} value={patient.address.state} />
              <InfoRow label={t('patients.form.zip')} value={patient.address.zip} />
              <InfoRow label={t('patients.form.country')} value={patient.address.country} />
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        {patient.emergency_contact && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t('patients.form.emergency')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow
                label={t('patients.form.emergency_name')}
                value={patient.emergency_contact.name}
              />
              <InfoRow
                label={t('patients.form.emergency_relationship')}
                value={patient.emergency_contact.relationship}
              />
              <InfoRow
                label={t('patients.form.emergency_phone')}
                value={patient.emergency_contact.phone}
                icon={<Phone className="h-4 w-4" />}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Medical Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            {t('patients.form.medical')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoRow label={t('patients.form.blood_type')} value={patient.blood_type} />
            <InfoRow
              label={t('patients.form.health_card_expiry')}
              value={patient.health_card_expire ? formatDate(patient.health_card_expire) : undefined}
              icon={<CreditCard className="h-4 w-4" />}
            />
          </div>

          {patient.allergies && patient.allergies.length > 0 && (
            <div>
              <Separator className="my-3" />
              <h4 className="text-sm font-medium mb-2 text-destructive">
                {t('patients.allergies')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map((allergy, index) => (
                  <Badge key={index} variant="destructive">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {patient.chronic_conditions && patient.chronic_conditions.length > 0 && (
            <div>
              <Separator className="my-3" />
              <h4 className="text-sm font-medium mb-2">
                {t('patients.chronic_conditions')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {patient.chronic_conditions.map((condition, index) => (
                  <Badge key={index} variant="outline">
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {patient.current_medications && patient.current_medications.length > 0 && (
            <div>
              <Separator className="my-3" />
              <h4 className="text-sm font-medium mb-2">
                {t('patients.form.current_medications')}
              </h4>
              <div className="space-y-2">
                {patient.current_medications.map((medication, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded-md">
                    <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{medication.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {medication.dosage} • {medication.frequency}
                        {medication.start_date && ` • Since ${formatDate(medication.start_date)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {patient.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('patients.form.notes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{patient.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Audit Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Record Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow
            label="Created"
            value={formatDate(patient.created_at)}
          />
          <InfoRow
            label="Last Updated"
            value={formatDate(patient.updated_at)}
          />
          {patient.deceased_date && (
            <InfoRow
              label="Deceased Date"
              value={formatDate(patient.deceased_date)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
