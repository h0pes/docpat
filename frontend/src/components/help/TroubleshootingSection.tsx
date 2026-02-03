/**
 * TroubleshootingSection Component
 *
 * Displays a searchable troubleshooting guide with categorized
 * issues and step-by-step solutions.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { highlightText } from './HelpSearch';
import { cn } from '@/lib/utils';

/**
 * Troubleshooting item IDs - must match keys in help.troubleshooting.items
 */
const TROUBLESHOOTING_ITEMS = [
  // Login
  'cannot_login',
  'mfa_not_working',
  'session_expired',
  // Performance
  'slow_loading',
  'page_not_responding',
  // Data
  'data_not_saving',
  'missing_data',
  // Printing
  'pdf_not_generating',
  'print_layout_wrong',
  // Notifications
  'email_not_received',
  'notification_failed',
] as const;

type TroubleshootingItemId = (typeof TROUBLESHOOTING_ITEMS)[number];

/**
 * Category configuration
 */
const CATEGORIES = ['login', 'performance', 'data', 'printing', 'notifications'] as const;

type CategoryId = (typeof CATEGORIES)[number];

/**
 * Severity configuration
 */
type Severity = 'info' | 'warning' | 'error';

const severityConfig: Record<
  Severity,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  info: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950',
  },
};

interface TroubleshootingSectionProps {
  /** Search query to filter issues */
  searchQuery?: string;
}

/**
 * TroubleshootingSection Component
 *
 * Provides a searchable troubleshooting guide with categorized issues
 * and step-by-step solutions.
 */
export function TroubleshootingSection({ searchQuery = '' }: TroubleshootingSectionProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');

  // Get troubleshooting items with their data
  const troubleshootingItems = useMemo(() => {
    return TROUBLESHOOTING_ITEMS.map((id) => {
      const solutions = t(`help.troubleshooting.items.${id}.solutions`, {
        returnObjects: true,
      }) as string[];

      return {
        id,
        category: t(`help.troubleshooting.items.${id}.category`) as CategoryId,
        severity: t(`help.troubleshooting.items.${id}.severity`) as Severity,
        issue: t(`help.troubleshooting.items.${id}.issue`),
        solutions: Array.isArray(solutions) ? solutions : [],
      };
    });
  }, [t]);

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    let filtered = troubleshootingItems;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.issue.toLowerCase().includes(query) ||
          item.solutions.some((s) => s.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [troubleshootingItems, selectedCategory, searchQuery]);

  // Group items by category for display
  const groupedItems = useMemo(() => {
    const groups: Record<CategoryId, typeof filteredItems> = {} as Record<
      CategoryId,
      typeof filteredItems
    >;

    for (const category of CATEGORIES) {
      const items = filteredItems.filter((item) => item.category === category);
      if (items.length > 0) {
        groups[category] = items;
      }
    }

    return groups;
  }, [filteredItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {t('help.troubleshooting.title')}
        </h2>
        <p className="text-muted-foreground">
          {t('help.troubleshooting.subtitle')}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('help.troubleshooting.intro')}
      </p>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All
        </Button>
        {CATEGORIES.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {t(`help.troubleshooting.categories.${category}`)}
          </Button>
        ))}
      </div>

      {/* Troubleshooting Content */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('help.no_results', { query: searchQuery || selectedCategory })}</p>
          </CardContent>
        </Card>
      ) : selectedCategory === 'all' ? (
        // Show grouped by category
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {t(`help.troubleshooting.categories.${category}`)}
                <Badge variant="secondary">{items.length}</Badge>
              </h3>
              <div className="space-y-3">
                {items.map((item) => (
                  <TroubleshootingItem
                    key={item.id}
                    {...item}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Show flat list for single category
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <TroubleshootingItem
              key={item.id}
              {...item}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual troubleshooting item component
 */
interface TroubleshootingItemProps {
  id: string;
  issue: string;
  severity: Severity;
  solutions: string[];
  searchQuery?: string;
}

function TroubleshootingItem({
  id,
  issue,
  severity,
  solutions,
  searchQuery,
}: TroubleshootingItemProps) {
  const { t } = useTranslation();
  const config = severityConfig[severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value={id} className="border rounded-lg">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-3 text-left">
            <div className={cn('p-2 rounded-lg', config.bgColor)}>
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
            <div>
              <div className="font-medium">
                {searchQuery ? highlightText(issue, searchQuery) : issue}
              </div>
              <Badge
                variant="outline"
                className={cn('mt-1 text-xs', config.color)}
              >
                {t(`help.troubleshooting.severity.${severity}`)}
              </Badge>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="pl-12 space-y-3">
            <h4 className="text-sm font-medium">Solutions:</h4>
            <ol className="space-y-2">
              {solutions.map((solution, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary flex-shrink-0">
                    {index + 1}
                  </span>
                  <span>
                    {searchQuery ? highlightText(solution, searchQuery) : solution}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default TroubleshootingSection;
