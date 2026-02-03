/**
 * GettingStartedSection Component
 *
 * Displays a step-by-step getting started guide with cards
 * for each major workflow step.
 */

import { useTranslation } from 'react-i18next';
import {
  LogIn,
  Layout,
  UserPlus,
  Calendar,
  FileText,
  Pill,
  File,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/**
 * Step configuration
 */
interface Step {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  { id: 'login', icon: LogIn },
  { id: 'navigation', icon: Layout },
  { id: 'first_patient', icon: UserPlus },
  { id: 'schedule', icon: Calendar },
  { id: 'visit', icon: FileText },
  { id: 'prescriptions', icon: Pill },
  { id: 'documents', icon: File },
];

/**
 * GettingStartedSection Component
 *
 * Displays an onboarding guide with step-by-step instructions
 * for new users to get started with DocPat.
 */
export function GettingStartedSection() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {t('help.getting_started.title')}
        </h2>
        <p className="text-muted-foreground">
          {t('help.getting_started.subtitle')}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('help.getting_started.intro')}
      </p>

      {/* Steps Accordion */}
      <Accordion type="single" collapsible className="space-y-2">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <AccordionItem key={step.id} value={step.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">
                      {t(`help.getting_started.steps.${step.id}.title`)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t(`help.getting_started.steps.${step.id}.description`)}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`help.getting_started.steps.${step.id}.content`)}
                    </p>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Quick Tips */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            {t('help.getting_started.tips.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertDescription>
              {t('help.getting_started.tips.tip1')}
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              {t('help.getting_started.tips.tip2')}
            </AlertDescription>
          </Alert>
          <Alert>
            <AlertDescription>
              {t('help.getting_started.tips.tip3')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

export default GettingStartedSection;
