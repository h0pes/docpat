/**
 * TemplateHelpDrawer Component
 *
 * A drawer/sheet component providing comprehensive documentation
 * on template syntax, best practices, and examples.
 */

import { useTranslation } from 'react-i18next';
import { HelpCircle, BookOpen, Code2, Lightbulb, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Code example component
 */
function CodeExample({ code, title }: { code: string; title?: string }) {
  return (
    <div className="space-y-1">
      {title && <p className="text-xs font-medium text-muted-foreground">{title}</p>}
      <pre className="bg-muted p-3 rounded-md overflow-x-auto">
        <code className="text-xs">{code}</code>
      </pre>
    </div>
  );
}

interface TemplateHelpDrawerProps {
  /** Whether the drawer is controlled externally */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

/**
 * TemplateHelpDrawer Component
 */
export function TemplateHelpDrawer({ open, onOpenChange }: TemplateHelpDrawerProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          {t('documents.help.title')}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('documents.help.title')}
          </SheetTitle>
          <SheetDescription>
            {t('documents.help.description')}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          <Accordion type="single" collapsible defaultValue="basics" className="space-y-2">
            {/* Basic Syntax */}
            <AccordionItem value="basics">
              <AccordionTrigger className="text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  {t('documents.help.basics.title')}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('documents.help.basics.variables')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('documents.help.basics.variables_desc')}
                  </p>
                  <CodeExample
                    code={`<p>Paziente: {{patient.full_name}}</p>
<p>Data di nascita: {{patient.date_of_birth}}</p>
<p>Codice fiscale: {{patient.fiscal_code}}</p>`}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('documents.help.basics.nested')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('documents.help.basics.nested_desc')}
                  </p>
                  <CodeExample
                    code={`{{patient.full_name}}
{{visit.vital_signs.blood_pressure}}
{{clinic.name}}`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Conditionals */}
            <AccordionItem value="conditionals">
              <AccordionTrigger className="text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  {t('documents.help.conditionals.title')}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  {t('documents.help.conditionals.desc')}
                </p>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('documents.help.conditionals.simple')}</h4>
                  <CodeExample
                    code={`{% if patient.phone %}
  <p>Telefono: {{patient.phone}}</p>
{% endif %}`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('documents.help.conditionals.if_else')}</h4>
                  <CodeExample
                    code={`{% if certificate.prognosis_days %}
  <p>Prognosi: {{certificate.prognosis_days}} giorni</p>
{% else %}
  <p>Prognosi: da valutare</p>
{% endif %}`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('documents.help.conditionals.multiple')}</h4>
                  <CodeExample
                    code={`{% if visit.vital_signs.blood_pressure %}
  <p>Pressione: {{visit.vital_signs.blood_pressure}}</p>
{% endif %}

{% if visit.vital_signs.heart_rate %}
  <p>Frequenza: {{visit.vital_signs.heart_rate}} bpm</p>
{% endif %}`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Loops */}
            <AccordionItem value="loops">
              <AccordionTrigger className="text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  {t('documents.help.loops.title')}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  {t('documents.help.loops.desc')}
                </p>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('documents.help.loops.medications')}</h4>
                  <CodeExample
                    code={`<h3>Prescrizioni</h3>
<ul>
{% for med in prescription.medications %}
  <li>
    <strong>{{med.name}}</strong> {{med.strength}}
    <br/>Posologia: {{med.dosage}}
    <br/>{{med.instructions}}
  </li>
{% endfor %}
</ul>`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('documents.help.loops.diagnoses')}</h4>
                  <CodeExample
                    code={`<h3>Diagnosi</h3>
<table>
  <tr>
    <th>Codice</th>
    <th>Descrizione</th>
  </tr>
{% for diag in visit.diagnoses %}
  <tr>
    <td>{{diag.code}}</td>
    <td>{{diag.description}}</td>
  </tr>
{% endfor %}
</table>`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('documents.help.loops.lab_tests')}</h4>
                  <CodeExample
                    code={`<h3>Esami Richiesti</h3>
{% for test in lab.tests %}
  <div class="test">
    <strong>{{test.code}}</strong> - {{test.name}}
    <span class="priority">{{test.priority}}</span>
  </div>
{% endfor %}`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Best Practices */}
            <AccordionItem value="best-practices">
              <AccordionTrigger className="text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  {t('documents.help.best_practices.title')}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    {t('documents.help.best_practices.tip1')}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('documents.help.best_practices.optional_fields')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('documents.help.best_practices.optional_fields_desc')}
                  </p>
                  <CodeExample
                    code={`<!-- BUONA PRATICA -->
{% if patient.email %}
  <p>Email: {{patient.email}}</p>
{% endif %}

<!-- EVITARE: mostra campo vuoto -->
<p>Email: {{patient.email}}</p>`}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('documents.help.best_practices.structure')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('documents.help.best_practices.structure_desc')}
                  </p>
                  <CodeExample
                    code={`<!-- Struttura consigliata -->
<div class="document">
  <header>
    <!-- Intestazione clinica -->
  </header>

  <main>
    <!-- Contenuto principale -->
  </main>

  <footer>
    <!-- Firma e data -->
  </footer>
</div>`}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('documents.help.best_practices.css_classes')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('documents.help.best_practices.css_classes_desc')}
                  </p>
                  <CodeExample
                    code={`<!-- Nel Template HTML -->
<div class="patient-info">...</div>
<div class="signature-block">...</div>

<!-- Nel CSS Styles -->
.patient-info {
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 20px;
}
.signature-block {
  margin-top: 50px;
  text-align: right;
}`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Common Patterns */}
            <AccordionItem value="patterns">
              <AccordionTrigger className="text-sm font-medium">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {t('documents.help.patterns.title')}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('documents.help.patterns.clinic_header')}</h4>
                  <CodeExample
                    code={`<div class="header">
  <h1>{{clinic.name}}</h1>
  <p>{{clinic.address}}</p>
  <p>{{clinic.city}} ({{clinic.province}})</p>
  <p>Tel: {{clinic.phone}}</p>
  {% if clinic.email %}
    <p>Email: {{clinic.email}}</p>
  {% endif %}
</div>`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('documents.help.patterns.patient_info')}</h4>
                  <CodeExample
                    code={`<div class="patient-info">
  <h3>Dati Paziente</h3>
  <table>
    <tr>
      <th>Nome</th>
      <td>{{patient.full_name}}</td>
    </tr>
    <tr>
      <th>Data di Nascita</th>
      <td>{{patient.date_of_birth}}</td>
    </tr>
    <tr>
      <th>Codice Fiscale</th>
      <td>{{patient.fiscal_code}}</td>
    </tr>
  </table>
</div>`}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('documents.help.patterns.signature')}</h4>
                  <CodeExample
                    code={`<div class="signature">
  <p>{{clinic.city}}, {{document.date}}</p>
  <br/><br/><br/>
  <div class="signature-line">
    _________________________
  </div>
  <p><strong>{{provider.full_name}}</strong></p>
  <p>{{provider.specialization}}</p>
  <p>Ordine dei Medici n. {{provider.license_number}}</p>
</div>`}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Troubleshooting */}
            <AccordionItem value="troubleshooting">
              <AccordionTrigger className="text-sm font-medium">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t('documents.help.troubleshooting.title')}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('documents.help.troubleshooting.undefined_vars')}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('documents.help.troubleshooting.empty_values')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('documents.help.troubleshooting.empty_values_desc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('documents.help.troubleshooting.syntax_errors')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('documents.help.troubleshooting.syntax_errors_desc')}
                  </p>
                  <CodeExample
                    title={t('documents.help.troubleshooting.common_mistakes')}
                    code={`<!-- ERRORE: parentesi mancante -->
{{ patient.name }

<!-- CORRETTO -->
{{patient.name}}

<!-- ERRORE: endif mancante -->
{% if condition %}
  content

<!-- CORRETTO -->
{% if condition %}
  content
{% endif %}`}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('documents.help.troubleshooting.type_specific')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('documents.help.troubleshooting.type_specific_desc')}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
