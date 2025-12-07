/**
 * TemplateEditorToolbar Component
 *
 * Provides toolbar actions for template editing including:
 * - Quick snippet insertion (conditionals, loops, tables)
 * - Common HTML element insertion
 * - Formatting helpers
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Code2,
  Braces,
  RotateCcw,
  Table,
  List,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

/**
 * Code snippet definition
 */
interface CodeSnippet {
  /** Unique identifier */
  id: string;
  /** Display label (translation key) */
  labelKey: string;
  /** Code to insert */
  code: string;
  /** Description (translation key) */
  descriptionKey?: string;
}

/**
 * Predefined code snippets
 */
const SNIPPETS: Record<string, CodeSnippet[]> = {
  conditionals: [
    {
      id: 'if_simple',
      labelKey: 'documents.snippets.if_simple',
      descriptionKey: 'documents.snippets.if_simple_desc',
      code: '{% if variable %}\n  <!-- Content when true -->\n{% endif %}',
    },
    {
      id: 'if_else',
      labelKey: 'documents.snippets.if_else',
      descriptionKey: 'documents.snippets.if_else_desc',
      code: '{% if variable %}\n  <!-- Content when true -->\n{% else %}\n  <!-- Content when false -->\n{% endif %}',
    },
    {
      id: 'if_patient_phone',
      labelKey: 'documents.snippets.if_patient_phone',
      descriptionKey: 'documents.snippets.if_patient_phone_desc',
      code: '{% if patient.phone %}\n  <p>Tel: {{patient.phone}}</p>\n{% endif %}',
    },
    {
      id: 'if_notes',
      labelKey: 'documents.snippets.if_notes',
      descriptionKey: 'documents.snippets.if_notes_desc',
      code: '{% if certificate.notes %}\n  <div class="notes">\n    <strong>Note:</strong> {{certificate.notes}}\n  </div>\n{% endif %}',
    },
  ],
  loops: [
    {
      id: 'for_simple',
      labelKey: 'documents.snippets.for_simple',
      descriptionKey: 'documents.snippets.for_simple_desc',
      code: '{% for item in items %}\n  <p>{{item}}</p>\n{% endfor %}',
    },
    {
      id: 'for_medications',
      labelKey: 'documents.snippets.for_medications',
      descriptionKey: 'documents.snippets.for_medications_desc',
      code: '{% for med in prescription.medications %}\n  <div class="medication">\n    <strong>{{med.name}}</strong> {{med.strength}}\n    <p>{{med.dosage}} - {{med.instructions}}</p>\n  </div>\n{% endfor %}',
    },
    {
      id: 'for_diagnoses',
      labelKey: 'documents.snippets.for_diagnoses',
      descriptionKey: 'documents.snippets.for_diagnoses_desc',
      code: '{% for diag in visit.diagnoses %}\n  <li><strong>{{diag.code}}</strong>: {{diag.description}}</li>\n{% endfor %}',
    },
    {
      id: 'for_lab_tests',
      labelKey: 'documents.snippets.for_lab_tests',
      descriptionKey: 'documents.snippets.for_lab_tests_desc',
      code: '{% for test in lab.tests %}\n  <tr>\n    <td>{{test.code}}</td>\n    <td>{{test.name}}</td>\n    <td>{{test.priority}}</td>\n  </tr>\n{% endfor %}',
    },
  ],
  tables: [
    {
      id: 'table_simple',
      labelKey: 'documents.snippets.table_simple',
      descriptionKey: 'documents.snippets.table_simple_desc',
      code: '<table class="info-table">\n  <tr>\n    <th>Campo</th>\n    <td>Valore</td>\n  </tr>\n</table>',
    },
    {
      id: 'table_patient_info',
      labelKey: 'documents.snippets.table_patient_info',
      descriptionKey: 'documents.snippets.table_patient_info_desc',
      code: '<table class="patient-info">\n  <tr>\n    <th>Paziente</th>\n    <td>{{patient.full_name}}</td>\n  </tr>\n  <tr>\n    <th>Data di Nascita</th>\n    <td>{{patient.date_of_birth}}</td>\n  </tr>\n  <tr>\n    <th>Codice Fiscale</th>\n    <td>{{patient.fiscal_code}}</td>\n  </tr>\n</table>',
    },
    {
      id: 'table_vital_signs',
      labelKey: 'documents.snippets.table_vital_signs',
      descriptionKey: 'documents.snippets.table_vital_signs_desc',
      code: '<table class="vital-signs">\n  <tr>\n    <th>Pressione</th>\n    <td>{{visit.vital_signs.blood_pressure}} mmHg</td>\n  </tr>\n  <tr>\n    <th>Frequenza Cardiaca</th>\n    <td>{{visit.vital_signs.heart_rate}} bpm</td>\n  </tr>\n  <tr>\n    <th>Temperatura</th>\n    <td>{{visit.vital_signs.temperature}} °C</td>\n  </tr>\n  <tr>\n    <th>SpO2</th>\n    <td>{{visit.vital_signs.spo2}}%</td>\n  </tr>\n</table>',
    },
  ],
  sections: [
    {
      id: 'header_clinic',
      labelKey: 'documents.snippets.header_clinic',
      descriptionKey: 'documents.snippets.header_clinic_desc',
      code: '<div class="header">\n  <h1>{{clinic.name}}</h1>\n  <p>{{clinic.address}}, {{clinic.city}} ({{clinic.province}})</p>\n  <p>Tel: {{clinic.phone}} | Email: {{clinic.email}}</p>\n</div>',
    },
    {
      id: 'signature_block',
      labelKey: 'documents.snippets.signature_block',
      descriptionKey: 'documents.snippets.signature_block_desc',
      code: '<div class="signature">\n  <p>{{clinic.city}}, {{document.date}}</p>\n  <div class="signature-line"></div>\n  <p><strong>{{provider.full_name}}</strong></p>\n  <p>{{provider.specialization}}</p>\n  <p>Ord. Medici n. {{provider.license_number}}</p>\n</div>',
    },
    {
      id: 'footer_page',
      labelKey: 'documents.snippets.footer_page',
      descriptionKey: 'documents.snippets.footer_page_desc',
      code: '<div class="footer">\n  <p>Pagina {{page_number}} di {{total_pages}}</p>\n</div>',
    },
  ],
};

/**
 * HTML elements for quick insertion
 */
const HTML_ELEMENTS = [
  { id: 'h1', icon: Heading1, code: '<h1></h1>' },
  { id: 'h2', icon: Heading2, code: '<h2></h2>' },
  { id: 'h3', icon: Heading3, code: '<h3></h3>' },
  { id: 'bold', icon: Bold, code: '<strong></strong>' },
  { id: 'italic', icon: Italic, code: '<em></em>' },
  { id: 'hr', icon: Minus, code: '<hr />' },
];

interface TemplateEditorToolbarProps {
  /** Callback to insert text at cursor position */
  onInsert: (text: string) => void;
}

/**
 * TemplateEditorToolbar Component
 */
export function TemplateEditorToolbar({ onInsert }: TemplateEditorToolbarProps) {
  const { t } = useTranslation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  /**
   * Handle snippet insertion
   */
  const handleSnippetInsert = (snippet: CodeSnippet) => {
    onInsert(snippet.code);
    setOpenMenu(null);
  };

  /**
   * Handle HTML element insertion
   */
  const handleHtmlInsert = (code: string) => {
    onInsert(code);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 bg-muted/50 rounded-t-md border border-b-0">
        {/* Conditionals dropdown */}
        <DropdownMenu open={openMenu === 'conditionals'} onOpenChange={(open) => setOpenMenu(open ? 'conditionals' : null)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Braces className="h-4 w-4 mr-1" />
                  <span className="text-xs">{t('documents.toolbar.conditionals')}</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('documents.toolbar.conditionals_tooltip')}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>{t('documents.toolbar.conditionals')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SNIPPETS.conditionals.map((snippet) => (
              <DropdownMenuItem
                key={snippet.id}
                onClick={() => handleSnippetInsert(snippet)}
                className="flex flex-col items-start"
              >
                <span className="font-medium">{t(snippet.labelKey)}</span>
                {snippet.descriptionKey && (
                  <span className="text-xs text-muted-foreground">
                    {t(snippet.descriptionKey)}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Loops dropdown */}
        <DropdownMenu open={openMenu === 'loops'} onOpenChange={(open) => setOpenMenu(open ? 'loops' : null)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  <span className="text-xs">{t('documents.toolbar.loops')}</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('documents.toolbar.loops_tooltip')}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>{t('documents.toolbar.loops')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SNIPPETS.loops.map((snippet) => (
              <DropdownMenuItem
                key={snippet.id}
                onClick={() => handleSnippetInsert(snippet)}
                className="flex flex-col items-start"
              >
                <span className="font-medium">{t(snippet.labelKey)}</span>
                {snippet.descriptionKey && (
                  <span className="text-xs text-muted-foreground">
                    {t(snippet.descriptionKey)}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tables dropdown */}
        <DropdownMenu open={openMenu === 'tables'} onOpenChange={(open) => setOpenMenu(open ? 'tables' : null)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Table className="h-4 w-4 mr-1" />
                  <span className="text-xs">{t('documents.toolbar.tables')}</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('documents.toolbar.tables_tooltip')}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>{t('documents.toolbar.tables')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SNIPPETS.tables.map((snippet) => (
              <DropdownMenuItem
                key={snippet.id}
                onClick={() => handleSnippetInsert(snippet)}
                className="flex flex-col items-start"
              >
                <span className="font-medium">{t(snippet.labelKey)}</span>
                {snippet.descriptionKey && (
                  <span className="text-xs text-muted-foreground">
                    {t(snippet.descriptionKey)}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sections dropdown */}
        <DropdownMenu open={openMenu === 'sections'} onOpenChange={(open) => setOpenMenu(open ? 'sections' : null)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <List className="h-4 w-4 mr-1" />
                  <span className="text-xs">{t('documents.toolbar.sections')}</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('documents.toolbar.sections_tooltip')}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>{t('documents.toolbar.sections')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SNIPPETS.sections.map((snippet) => (
              <DropdownMenuItem
                key={snippet.id}
                onClick={() => handleSnippetInsert(snippet)}
                className="flex flex-col items-start"
              >
                <span className="font-medium">{t(snippet.labelKey)}</span>
                {snippet.descriptionKey && (
                  <span className="text-xs text-muted-foreground">
                    {t(snippet.descriptionKey)}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* HTML element buttons */}
        {HTML_ELEMENTS.map((element) => {
          const Icon = element.icon;
          return (
            <Tooltip key={element.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleHtmlInsert(element.code)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <code className="text-xs">{element.code}</code>
              </TooltipContent>
            </Tooltip>
          );
        })}

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleHtmlInsert('<div style="text-align: left;"></div>')}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('documents.toolbar.align_left')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleHtmlInsert('<div style="text-align: center;"></div>')}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('documents.toolbar.align_center')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleHtmlInsert('<div style="text-align: right;"></div>')}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('documents.toolbar.align_right')}</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        {/* Code icon indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Code2 className="h-4 w-4" />
              <span className="text-xs">HTML + Jinja2</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>{t('documents.toolbar.syntax_info')}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export { SNIPPETS };
