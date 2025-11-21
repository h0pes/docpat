/**
 * QuickTextSelector Component
 *
 * Provides quick text template insertion for SOAP notes and clinical documentation.
 * Displays categorized common clinical phrases and templates that can be inserted
 * into text fields with a single click.
 *
 * Features:
 * - Categorized templates (Subjective, Objective, Assessment, Plan, General)
 * - Search/filter templates
 * - Insert at cursor position or append
 * - Customizable templates
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Search } from 'lucide-react';

/**
 * Quick text template structure
 */
interface QuickTextTemplate {
  id: string;
  category: 'subjective' | 'objective' | 'assessment' | 'plan' | 'general';
  title: string;
  content: string;
}

/**
 * QuickTextSelector component props
 */
interface QuickTextSelectorProps {
  /**
   * Callback when a template is selected
   * @param text - The template text to insert
   */
  onSelectTemplate: (text: string) => void;

  /**
   * Optional button variant
   */
  variant?: 'default' | 'outline' | 'ghost';

  /**
   * Optional button size
   */
  size?: 'default' | 'sm' | 'lg';
}

/**
 * Default quick text templates
 * These should eventually come from backend/user preferences
 */
const DEFAULT_TEMPLATES: QuickTextTemplate[] = [
  // Subjective
  {
    id: 's1',
    category: 'subjective',
    title: 'No complaints',
    content: 'Patient reports no new complaints since last visit.',
  },
  {
    id: 's2',
    category: 'subjective',
    title: 'Pain assessment',
    content: 'Patient reports pain level of [X]/10, described as [sharp/dull/aching/burning].',
  },
  {
    id: 's3',
    category: 'subjective',
    title: 'Medication compliance',
    content: 'Patient reports good compliance with current medication regimen.',
  },

  // Objective
  {
    id: 'o1',
    category: 'objective',
    title: 'Normal exam',
    content: 'Physical examination within normal limits. Patient appears well.',
  },
  {
    id: 'o2',
    category: 'objective',
    title: 'Vital signs stable',
    content: 'Vital signs stable and within normal range for patient.',
  },

  // Assessment
  {
    id: 'a1',
    category: 'assessment',
    title: 'Improving',
    content: 'Condition improving with current treatment plan.',
  },
  {
    id: 'a2',
    category: 'assessment',
    title: 'Stable',
    content: 'Condition stable, no acute concerns at this time.',
  },
  {
    id: 'a3',
    category: 'assessment',
    title: 'Requires monitoring',
    content: 'Condition requires close monitoring and follow-up.',
  },

  // Plan
  {
    id: 'p1',
    category: 'plan',
    title: 'Continue current',
    content: 'Continue current medication regimen and lifestyle modifications.',
  },
  {
    id: 'p2',
    category: 'plan',
    title: 'Follow-up',
    content: 'Schedule follow-up appointment in [X] weeks/months.',
  },
  {
    id: 'p3',
    category: 'plan',
    title: 'Lab work',
    content: 'Order laboratory work: [specify tests]. Review results at next visit.',
  },

  // General
  {
    id: 'g1',
    category: 'general',
    title: 'Patient education',
    content: 'Patient education provided regarding condition and treatment plan. Patient demonstrates understanding.',
  },
  {
    id: 'g2',
    category: 'general',
    title: 'Emergency instructions',
    content: 'Patient instructed to seek immediate medical attention if symptoms worsen or new concerns arise.',
  },
];

/**
 * QuickTextSelector component
 */
export function QuickTextSelector({
  onSelectTemplate,
  variant = 'outline',
  size = 'sm',
}: QuickTextSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { value: 'all', label: t('visits.quickText.categories.all') },
    { value: 'subjective', label: t('visits.quickText.categories.subjective') },
    { value: 'objective', label: t('visits.quickText.categories.objective') },
    { value: 'assessment', label: t('visits.quickText.categories.assessment') },
    { value: 'plan', label: t('visits.quickText.categories.plan') },
    { value: 'general', label: t('visits.quickText.categories.general') },
  ];

  // Filter templates based on search and category
  const filteredTemplates = DEFAULT_TEMPLATES.filter((template) => {
    const matchesSearch =
      !searchQuery ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory || selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (content: string) => {
    onSelectTemplate(content);
    setOpen(false);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <FileText className="h-4 w-4 mr-2" />
          {t('visits.quickText.buttonLabel')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('visits.quickText.title')}</DialogTitle>
          <DialogDescription>{t('visits.quickText.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('visits.quickText.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Badge
                key={cat.value}
                variant={selectedCategory === cat.value || (!selectedCategory && cat.value === 'all') ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat.value === 'all' ? null : cat.value)}
              >
                {cat.label}
              </Badge>
            ))}
          </div>

          {/* Templates list */}
          <ScrollArea className="h-[400px] pr-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {t('visits.quickText.noResults')}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleSelectTemplate(template.content)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{template.title}</h4>
                      <Badge variant="secondary" className="ml-2">
                        {t(`visits.quickText.categories.${template.category}`)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{template.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
