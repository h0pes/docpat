/**
 * DuplicatePatientWarning Component
 *
 * Dialog that warns users when creating a patient with similar information
 * to existing patients, helping prevent duplicate records
 */

import { useTranslation } from 'react-i18next';
import { AlertTriangle, User, Calendar, Phone, FileText } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Patient } from '@/types/patient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DuplicatePatientWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onReview: (patientId: string) => void;
  potentialDuplicates: Patient[];
}

/**
 * Calculate similarity percentage between two strings
 * Simple implementation - could be enhanced with more sophisticated algorithms
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 100;

  // Levenshtein distance-based similarity (simplified)
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 100;

  const editDistance = levenshteinDistance(longer, shorter);
  return Math.round(((longer.length - editDistance) / longer.length) * 100);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
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
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get similarity badge variant based on percentage
 */
function getSimilarityVariant(
  percentage: number
): 'default' | 'secondary' | 'destructive' {
  if (percentage >= 80) return 'destructive';
  if (percentage >= 60) return 'default';
  return 'secondary';
}

/**
 * DuplicatePatientWarning Component
 */
export function DuplicatePatientWarning({
  isOpen,
  onClose,
  onProceed,
  onReview,
  potentialDuplicates,
}: DuplicatePatientWarningProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('patients.duplicate.warning')}
          </DialogTitle>
          <DialogDescription>
            {t('patients.duplicate.description')}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attention Required</AlertTitle>
          <AlertDescription>
            Creating duplicate patient records can lead to data inconsistencies and
            compliance issues. Please review the similar patients below carefully.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">
            Found {potentialDuplicates.length} potential{' '}
            {potentialDuplicates.length === 1 ? 'match' : 'matches'}:
          </h3>

          {potentialDuplicates.map((patient, index) => {
            const fullName = `${patient.first_name} ${patient.last_name}`;
            // In a real implementation, you'd calculate similarity based on the form data being submitted
            // For now, we'll use a placeholder calculation
            const nameSimilarity = 85; // Placeholder
            const age = calculateAge(patient.date_of_birth);

            return (
              <div key={patient.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{fullName}</h4>
                      <Badge variant={getSimilarityVariant(nameSimilarity)}>
                        {nameSimilarity}% {t('patients.duplicate.similarity')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      MRN: {patient.medical_record_number}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onReview(patient.id);
                      onClose();
                    }}
                  >
                    {t('patients.actions.view')}
                  </Button>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">DOB:</span>
                    <span>{formatDate(patient.date_of_birth)}</span>
                    <span className="text-muted-foreground">({age} years)</span>
                  </div>

                  {patient.phone_primary && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{patient.phone_primary}</span>
                    </div>
                  )}

                  {patient.fiscal_code && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Fiscal Code:</span>
                      <span className="font-mono text-xs">{patient.fiscal_code}</span>
                    </div>
                  )}

                  {patient.email && (
                    <div className="flex items-center gap-2 col-span-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Email:</span>
                      <span className="truncate">{patient.email}</span>
                    </div>
                  )}
                </div>

                {patient.notes && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <span className="text-muted-foreground font-medium">Notes: </span>
                      <span className="line-clamp-2">{patient.notes}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-sm text-muted-foreground">
            <p>
              If none of these patients match, you can safely proceed with creating a
              new record.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onProceed} variant="default">
              {t('patients.duplicate.proceed')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
