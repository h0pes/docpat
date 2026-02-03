/**
 * FeatureGuideSection Component
 *
 * Displays feature guides for each major module in the application.
 * Uses accordion for organized, expandable content.
 */

import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Pill,
  File,
  BarChart3,
  Bell,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

/**
 * Feature category configuration
 */
interface FeatureCategory {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: FeatureCategory[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'patients', icon: Users },
  { id: 'appointments', icon: Calendar },
  { id: 'visits', icon: FileText },
  { id: 'prescriptions', icon: Pill },
  { id: 'documents', icon: File },
  { id: 'reports', icon: BarChart3 },
  { id: 'notifications', icon: Bell },
  { id: 'admin', icon: Settings },
];

interface FeatureGuideSectionProps {
  /** Optional search query to filter/highlight features */
  searchQuery?: string;
}

/**
 * FeatureGuideSection Component
 *
 * Provides detailed guides for each major feature module.
 * Each category can be expanded to show description and feature list.
 */
export function FeatureGuideSection({ searchQuery }: FeatureGuideSectionProps) {
  const { t } = useTranslation();

  // Filter categories based on search query if provided
  const filteredCategories = searchQuery
    ? CATEGORIES.filter((cat) => {
        const title = t(`help.features.categories.${cat.id}.title`).toLowerCase();
        const description = t(`help.features.categories.${cat.id}.description`).toLowerCase();
        const content = t(`help.features.categories.${cat.id}.content`).toLowerCase();
        const query = searchQuery.toLowerCase();
        return title.includes(query) || description.includes(query) || content.includes(query);
      })
    : CATEGORIES;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {t('help.features.title')}
        </h2>
        <p className="text-muted-foreground">
          {t('help.features.subtitle')}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('help.features.intro')}
      </p>

      {/* Feature Categories */}
      {filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('help.no_results', { query: searchQuery })}
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            const features = t(`help.features.categories.${category.id}.features`, {
              returnObjects: true,
            }) as string[];

            return (
              <AccordionItem key={category.id} value={category.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">
                        {t(`help.features.categories.${category.id}.title`)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t(`help.features.categories.${category.id}.description`)}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-2">
                  <Card>
                    <CardContent className="pt-4 space-y-4">
                      {/* Description */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t(`help.features.categories.${category.id}.content`)}
                      </p>

                      {/* Features List */}
                      {Array.isArray(features) && features.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Key Features:</h4>
                          <ul className="space-y-2">
                            {features.map((feature, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2 text-sm text-muted-foreground"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Admin-only badge for admin category */}
                      {category.id === 'admin' && (
                        <Badge variant="secondary" className="mt-2">
                          Admin Only
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

export default FeatureGuideSection;
