/**
 * TemplateVariableReference Component
 *
 * Displays available template variables organized by category.
 * Supports click-to-insert functionality and contextual filtering based on document type.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Building2,
  Stethoscope,
  FileText,
  Calendar,
  Pill,
  FlaskConical,
  ClipboardList,
  Award,
  Send,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { DocumentType } from '@/types/document';

/**
 * Template variable definition
 */
interface TemplateVariable {
  /** Variable key (e.g., 'patient.full_name') */
  key: string;
  /** Description of what the variable contains */
  description: string;
  /** Example value */
  example?: string;
  /** Whether this is an array (for loops) */
  isArray?: boolean;
  /** Child variables for nested objects */
  children?: TemplateVariable[];
}

/**
 * Variable category definition
 */
interface VariableCategory {
  /** Category identifier */
  id: string;
  /** Category display name (translation key) */
  nameKey: string;
  /** Icon component */
  icon: React.ElementType;
  /** Variables in this category */
  variables: TemplateVariable[];
  /** Document types this category applies to (empty = all) */
  applicableTo?: DocumentType[];
}

/**
 * Complete variable reference organized by category
 */
const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    id: 'patient',
    nameKey: 'documents.variables.categories.patient',
    icon: User,
    variables: [
      { key: 'patient.full_name', description: 'documents.variables.patient.full_name', example: 'Mario Rossi' },
      { key: 'patient.first_name', description: 'documents.variables.patient.first_name', example: 'Mario' },
      { key: 'patient.last_name', description: 'documents.variables.patient.last_name', example: 'Rossi' },
      { key: 'patient.middle_name', description: 'documents.variables.patient.middle_name', example: 'Giuseppe' },
      { key: 'patient.date_of_birth', description: 'documents.variables.patient.date_of_birth', example: '15/03/1985' },
      { key: 'patient.gender', description: 'documents.variables.patient.gender', example: 'M' },
      { key: 'patient.fiscal_code', description: 'documents.variables.patient.fiscal_code', example: 'RSSMRA85C15H501Z' },
      { key: 'patient.email', description: 'documents.variables.patient.email', example: 'mario.rossi@email.com' },
      { key: 'patient.phone', description: 'documents.variables.patient.phone', example: '+39 333 1234567' },
    ],
  },
  {
    id: 'provider',
    nameKey: 'documents.variables.categories.provider',
    icon: Stethoscope,
    variables: [
      { key: 'provider.full_name', description: 'documents.variables.provider.full_name', example: 'Dr. Giovanni Bianchi' },
      { key: 'provider.first_name', description: 'documents.variables.provider.first_name', example: 'Giovanni' },
      { key: 'provider.last_name', description: 'documents.variables.provider.last_name', example: 'Bianchi' },
      { key: 'provider.email', description: 'documents.variables.provider.email', example: 'dr.bianchi@clinic.it' },
      { key: 'provider.specialization', description: 'documents.variables.provider.specialization', example: 'Medico Chirurgo' },
      { key: 'provider.license_number', description: 'documents.variables.provider.license_number', example: 'RM-12345' },
    ],
  },
  {
    id: 'clinic',
    nameKey: 'documents.variables.categories.clinic',
    icon: Building2,
    variables: [
      { key: 'clinic.name', description: 'documents.variables.clinic.name', example: 'Studio Medico Roma' },
      { key: 'clinic.address', description: 'documents.variables.clinic.address', example: 'Via Roma 123' },
      { key: 'clinic.city', description: 'documents.variables.clinic.city', example: 'Roma' },
      { key: 'clinic.province', description: 'documents.variables.clinic.province', example: 'RM' },
      { key: 'clinic.phone', description: 'documents.variables.clinic.phone', example: '+39 06 1234567' },
      { key: 'clinic.email', description: 'documents.variables.clinic.email', example: 'info@studiomedico.it' },
    ],
  },
  {
    id: 'document',
    nameKey: 'documents.variables.categories.document',
    icon: FileText,
    variables: [
      { key: 'document.date', description: 'documents.variables.document.date', example: '07/12/2025' },
    ],
  },
  {
    id: 'certificate',
    nameKey: 'documents.variables.categories.certificate',
    icon: Award,
    applicableTo: [DocumentType.MEDICAL_CERTIFICATE],
    variables: [
      { key: 'certificate.content', description: 'documents.variables.certificate.content', example: 'Il paziente necessita di riposo...' },
      { key: 'certificate.prognosis_days', description: 'documents.variables.certificate.prognosis_days', example: '5' },
      { key: 'certificate.start_date', description: 'documents.variables.certificate.start_date', example: '07/12/2025' },
      { key: 'certificate.end_date', description: 'documents.variables.certificate.end_date', example: '12/12/2025' },
      { key: 'certificate.notes', description: 'documents.variables.certificate.notes', example: 'Riposo assoluto consigliato' },
    ],
  },
  {
    id: 'referral',
    nameKey: 'documents.variables.categories.referral',
    icon: Send,
    applicableTo: [DocumentType.REFERRAL_LETTER],
    variables: [
      { key: 'referral.specialist_name', description: 'documents.variables.referral.specialist_name', example: 'Dr. Marco Verdi' },
      { key: 'referral.specialist_department', description: 'documents.variables.referral.specialist_department', example: 'Cardiologia' },
      { key: 'referral.specialist_address', description: 'documents.variables.referral.specialist_address', example: 'Ospedale San Giovanni' },
      { key: 'referral.reason', description: 'documents.variables.referral.reason', example: 'Valutazione cardiologica' },
      { key: 'referral.clinical_history', description: 'documents.variables.referral.clinical_history', example: 'Paziente con ipertensione...' },
      { key: 'referral.current_medications', description: 'documents.variables.referral.current_medications', example: 'Ramipril 5mg' },
      { key: 'referral.allergies', description: 'documents.variables.referral.allergies', example: 'Penicillina' },
      { key: 'referral.examination_findings', description: 'documents.variables.referral.examination_findings', example: 'PA 150/90 mmHg' },
      { key: 'referral.suspected_diagnosis', description: 'documents.variables.referral.suspected_diagnosis', example: 'Ipertensione arteriosa' },
      { key: 'referral.request', description: 'documents.variables.referral.request', example: 'ECG e visita specialistica' },
    ],
  },
  {
    id: 'lab',
    nameKey: 'documents.variables.categories.lab',
    icon: FlaskConical,
    applicableTo: [DocumentType.LAB_REQUEST],
    variables: [
      { key: 'lab.diagnostic_question', description: 'documents.variables.lab.diagnostic_question', example: 'Screening metabolico' },
      { key: 'lab.clinical_notes', description: 'documents.variables.lab.clinical_notes', example: 'Controllo annuale' },
      { key: 'lab.fasting_required', description: 'documents.variables.lab.fasting_required', example: 'true' },
      { key: 'lab.special_instructions', description: 'documents.variables.lab.special_instructions', example: 'Digiuno da 12 ore' },
      {
        key: 'lab.tests',
        description: 'documents.variables.lab.tests',
        isArray: true,
        children: [
          { key: 'test.code', description: 'documents.variables.lab.test_code', example: '90.62.2' },
          { key: 'test.name', description: 'documents.variables.lab.test_name', example: 'Emocromo completo' },
          { key: 'test.priority', description: 'documents.variables.lab.test_priority', example: 'routine' },
        ],
      },
    ],
  },
  {
    id: 'visit',
    nameKey: 'documents.variables.categories.visit',
    icon: ClipboardList,
    applicableTo: [DocumentType.VISIT_SUMMARY],
    variables: [
      { key: 'visit.date', description: 'documents.variables.visit.date', example: '07/12/2025' },
      { key: 'visit.reason', description: 'documents.variables.visit.reason', example: 'Controllo periodico' },
      { key: 'visit.chief_complaint', description: 'documents.variables.visit.chief_complaint', example: 'Cefalea ricorrente' },
      { key: 'visit.physical_examination', description: 'documents.variables.visit.physical_examination', example: 'Obiettivita nella norma' },
      { key: 'visit.treatment_plan', description: 'documents.variables.visit.treatment_plan', example: 'Continuare terapia attuale' },
      { key: 'visit.follow_up', description: 'documents.variables.visit.follow_up', example: 'Controllo tra 3 mesi' },
      { key: 'visit.notes', description: 'documents.variables.visit.notes', example: 'Paziente collaborante' },
      {
        key: 'visit.vital_signs',
        description: 'documents.variables.visit.vital_signs',
        children: [
          { key: 'visit.vital_signs.blood_pressure', description: 'documents.variables.visit.blood_pressure', example: '120/80' },
          { key: 'visit.vital_signs.heart_rate', description: 'documents.variables.visit.heart_rate', example: '72' },
          { key: 'visit.vital_signs.temperature', description: 'documents.variables.visit.temperature', example: '36.5' },
          { key: 'visit.vital_signs.spo2', description: 'documents.variables.visit.spo2', example: '98' },
          { key: 'visit.vital_signs.weight', description: 'documents.variables.visit.weight', example: '75.5' },
          { key: 'visit.vital_signs.height', description: 'documents.variables.visit.height', example: '175' },
        ],
      },
      {
        key: 'visit.diagnoses',
        description: 'documents.variables.visit.diagnoses',
        isArray: true,
        children: [
          { key: 'diagnosis.code', description: 'documents.variables.visit.diagnosis_code', example: 'J06.9' },
          { key: 'diagnosis.description', description: 'documents.variables.visit.diagnosis_description', example: 'Infezione vie respiratorie' },
        ],
      },
      {
        key: 'visit.prescriptions',
        description: 'documents.variables.visit.prescriptions',
        isArray: true,
        children: [
          { key: 'prescription.medication', description: 'documents.variables.visit.prescription_medication', example: 'Paracetamolo' },
          { key: 'prescription.dosage', description: 'documents.variables.visit.prescription_dosage', example: '1000mg x 3/die' },
          { key: 'prescription.duration', description: 'documents.variables.visit.prescription_duration', example: '5 giorni' },
        ],
      },
    ],
  },
  {
    id: 'prescription',
    nameKey: 'documents.variables.categories.prescription',
    icon: Pill,
    applicableTo: [DocumentType.PRESCRIPTION],
    variables: [
      { key: 'prescription.notes', description: 'documents.variables.prescription.notes', example: 'Assumere dopo i pasti' },
      {
        key: 'prescription.medications',
        description: 'documents.variables.prescription.medications',
        isArray: true,
        children: [
          { key: 'medication.name', description: 'documents.variables.prescription.medication_name', example: 'Amoxicillina' },
          { key: 'medication.strength', description: 'documents.variables.prescription.medication_strength', example: '500mg' },
          { key: 'medication.form', description: 'documents.variables.prescription.medication_form', example: 'Compresse' },
          { key: 'medication.dosage', description: 'documents.variables.prescription.medication_dosage', example: '1 compressa x 3/die' },
          { key: 'medication.instructions', description: 'documents.variables.prescription.medication_instructions', example: 'Dopo i pasti' },
          { key: 'medication.quantity', description: 'documents.variables.prescription.medication_quantity', example: '2' },
        ],
      },
    ],
  },
  {
    id: 'pagination',
    nameKey: 'documents.variables.categories.pagination',
    icon: Calendar,
    variables: [
      { key: 'page_number', description: 'documents.variables.pagination.page_number', example: '1' },
      { key: 'total_pages', description: 'documents.variables.pagination.total_pages', example: '3' },
    ],
  },
];

interface TemplateVariableReferenceProps {
  /** Currently selected document type */
  documentType: DocumentType;
  /** Callback when a variable is selected for insertion */
  onInsertVariable: (variable: string) => void;
  /** Optional className */
  className?: string;
}

/**
 * TemplateVariableReference Component
 */
export function TemplateVariableReference({
  documentType,
  onInsertVariable,
  className,
}: TemplateVariableReferenceProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['patient', 'provider', 'clinic', 'document'])
  );
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  /**
   * Filter categories based on document type and search query
   */
  const filteredCategories = useMemo(() => {
    return VARIABLE_CATEGORIES.filter((category) => {
      // Filter by document type
      if (category.applicableTo && category.applicableTo.length > 0) {
        if (!category.applicableTo.includes(documentType)) {
          return false;
        }
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const hasMatchingVariable = category.variables.some(
          (v) =>
            v.key.toLowerCase().includes(query) ||
            t(v.description).toLowerCase().includes(query)
        );
        return hasMatchingVariable;
      }

      return true;
    });
  }, [documentType, searchQuery, t]);

  /**
   * Toggle category expansion
   */
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  /**
   * Handle variable click - insert and show copy feedback
   */
  const handleVariableClick = (variableKey: string) => {
    const variableString = `{{${variableKey}}}`;
    onInsertVariable(variableString);
    setCopiedVariable(variableKey);
    setTimeout(() => setCopiedVariable(null), 1500);
  };

  /**
   * Render a single variable item
   */
  const renderVariable = (variable: TemplateVariable, depth: number = 0) => {
    const isCopied = copiedVariable === variable.key;

    return (
      <div key={variable.key} className={cn('space-y-1', depth > 0 && 'ml-4')}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleVariableClick(variable.key)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left',
                  'hover:bg-accent hover:text-accent-foreground transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  'text-sm font-mono'
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate">
                    {`{{${variable.key}}}`}
                  </code>
                  {variable.isArray && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      array
                    </Badge>
                  )}
                </span>
                {isCopied ? (
                  <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium">{t(variable.description)}</p>
                {variable.example && (
                  <p className="text-xs text-muted-foreground">
                    {t('documents.variables.example')}: {variable.example}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Render children for nested objects/arrays */}
        {variable.children && variable.children.length > 0 && (
          <div className="border-l-2 border-muted ml-2 pl-2 space-y-0.5">
            {variable.children.map((child) => renderVariable(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search input */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('documents.variables.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Variable categories */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('documents.variables.no_results')}
            </p>
          ) : (
            filteredCategories.map((category) => {
              const Icon = category.icon;
              const isExpanded = expandedCategories.has(category.id);

              return (
                <Collapsible
                  key={category.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium flex-1 text-left">
                      {t(category.nameKey)}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {category.variables.length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-1 pl-6 space-y-0.5">
                    {category.variables.map((variable) => renderVariable(variable))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Help text */}
      <div className="p-3 border-t bg-muted/50">
        <p className="text-xs text-muted-foreground">
          {t('documents.variables.click_to_insert')}
        </p>
      </div>
    </div>
  );
}

export { VARIABLE_CATEGORIES, type TemplateVariable, type VariableCategory };
