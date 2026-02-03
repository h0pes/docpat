/**
 * FAQSection Component
 *
 * Displays a searchable, categorized FAQ section with accordion items.
 * Supports filtering by category and search query.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { highlightText } from './HelpSearch';
import { cn } from '@/lib/utils';

/**
 * FAQ item IDs - must match keys in help.faq.items
 */
const FAQ_ITEMS = [
  // General
  'what_is_docpat',
  'supported_browsers',
  'mobile_support',
  'change_language',
  'change_theme',
  // Account
  'reset_password',
  'enable_mfa',
  'mfa_lost_phone',
  'session_timeout',
  // Patients
  'add_patient',
  'search_patients',
  'delete_patient',
  // Appointments
  'schedule_appointment',
  'recurring_appointments',
  'cancel_appointment',
  'appointment_conflict',
  // Visits
  'create_visit',
  'sign_visit',
  'lock_visit',
  'visit_templates',
  // Prescriptions
  'create_prescription',
  'drug_interactions',
  'renew_prescription',
  'custom_medication',
  // Documents
  'generate_document',
  'email_document',
  'create_template',
  // Security
  'data_security',
  'audit_logs',
] as const;

type FAQItemId = (typeof FAQ_ITEMS)[number];

/**
 * Category configuration
 */
const CATEGORIES = [
  'general',
  'account',
  'patients',
  'appointments',
  'visits',
  'prescriptions',
  'documents',
  'security',
] as const;

type CategoryId = (typeof CATEGORIES)[number];

interface FAQSectionProps {
  /** Search query to filter FAQs */
  searchQuery?: string;
}

/**
 * FAQSection Component
 *
 * Provides a searchable and filterable FAQ section organized by categories.
 * Each FAQ item can be expanded to show the full answer.
 */
export function FAQSection({ searchQuery = '' }: FAQSectionProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');

  // Get FAQ items with their data
  const faqItems = useMemo(() => {
    return FAQ_ITEMS.map((id) => ({
      id,
      category: t(`help.faq.items.${id}.category`) as CategoryId,
      question: t(`help.faq.items.${id}.question`),
      answer: t(`help.faq.items.${id}.answer`),
    }));
  }, [t]);

  // Filter FAQs based on search and category
  const filteredFAQs = useMemo(() => {
    let filtered = faqItems;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((faq) => faq.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [faqItems, selectedCategory, searchQuery]);

  // Group FAQs by category for display
  const groupedFAQs = useMemo(() => {
    const groups: Record<CategoryId, typeof filteredFAQs> = {} as Record<
      CategoryId,
      typeof filteredFAQs
    >;

    for (const category of CATEGORIES) {
      const items = filteredFAQs.filter((faq) => faq.category === category);
      if (items.length > 0) {
        groups[category] = items;
      }
    }

    return groups;
  }, [filteredFAQs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {t('help.faq.title')}
        </h2>
        <p className="text-muted-foreground">
          {t('help.faq.subtitle')}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('help.faq.intro')}
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
            {t(`help.faq.categories.${category}`)}
          </Button>
        ))}
      </div>

      {/* FAQ Content */}
      {filteredFAQs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('help.no_results', { query: searchQuery || selectedCategory })}</p>
          </CardContent>
        </Card>
      ) : selectedCategory === 'all' ? (
        // Show grouped by category
        <div className="space-y-6">
          {Object.entries(groupedFAQs).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {t(`help.faq.categories.${category}`)}
                <Badge variant="secondary">{items.length}</Badge>
              </h3>
              <Accordion type="single" collapsible className="space-y-2">
                {items.map((faq) => (
                  <FAQItem
                    key={faq.id}
                    id={faq.id}
                    question={faq.question}
                    answer={faq.answer}
                    searchQuery={searchQuery}
                  />
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      ) : (
        // Show flat list for single category
        <Accordion type="single" collapsible className="space-y-2">
          {filteredFAQs.map((faq) => (
            <FAQItem
              key={faq.id}
              id={faq.id}
              question={faq.question}
              answer={faq.answer}
              searchQuery={searchQuery}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}

/**
 * Individual FAQ item component
 */
interface FAQItemProps {
  id: string;
  question: string;
  answer: string;
  searchQuery?: string;
}

function FAQItem({ id, question, answer, searchQuery }: FAQItemProps) {
  return (
    <AccordionItem value={id}>
      <AccordionTrigger className="text-left hover:no-underline">
        <span className="pr-4">
          {searchQuery ? highlightText(question, searchQuery) : question}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {searchQuery ? highlightText(answer, searchQuery) : answer}
            </p>
          </CardContent>
        </Card>
      </AccordionContent>
    </AccordionItem>
  );
}

export default FAQSection;
