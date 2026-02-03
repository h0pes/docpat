/**
 * HelpPage Component
 *
 * Main help center page with tabbed navigation for different help sections.
 * Includes search functionality that filters FAQ and troubleshooting content.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Rocket,
  Layers,
  HelpCircle,
  AlertTriangle,
  Keyboard,
  Download,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  HelpSearch,
  GettingStartedSection,
  FeatureGuideSection,
  FAQSection,
  TroubleshootingSection,
  KeyboardShortcutsSection,
} from '@/components/help';

/**
 * Tab configuration
 */
interface TabConfig {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  searchable?: boolean;
}

const TABS: TabConfig[] = [
  { id: 'overview', icon: BookOpen },
  { id: 'getting_started', icon: Rocket },
  { id: 'features', icon: Layers, searchable: true },
  { id: 'faq', icon: HelpCircle, searchable: true },
  { id: 'troubleshooting', icon: AlertTriangle, searchable: true },
  { id: 'shortcuts', icon: Keyboard },
];

/**
 * HelpPage Component
 *
 * The main help center providing access to all documentation,
 * FAQs, troubleshooting guides, and feature guides.
 */
export function HelpPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle search - only applies to searchable tabs
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // If user searches, switch to FAQ tab if not already on a searchable tab
    if (query && !['features', 'faq', 'troubleshooting'].includes(activeTab)) {
      setActiveTab('faq');
    }
  }, [activeTab]);

  // Check if search is active
  const isSearchActive = searchQuery.trim().length > 0;

  // Get PDF download URL based on current language
  const pdfUrl = i18n.language === 'it'
    ? '/docs/user-manual-it.pdf'
    : '/docs/user-manual-en.pdf';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('help.title')}</h1>
          <p className="text-muted-foreground">{t('help.description')}</p>
        </div>
        <Button variant="outline" asChild>
          <a href={pdfUrl} download className="gap-2">
            <Download className="h-4 w-4" />
            {t('help.download_manual')}
          </a>
        </Button>
      </div>

      {/* Search */}
      <HelpSearch
        onSearch={handleSearch}
        className="max-w-md"
      />

      {/* Search Results Indicator */}
      {isSearchActive && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Searching for: </span>
          <Badge variant="secondary">{searchQuery}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="h-6 px-2"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t(`help.tabs.${tab.id}`)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewSection />
        </TabsContent>

        {/* Getting Started Tab */}
        <TabsContent value="getting_started">
          <GettingStartedSection />
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features">
          <FeatureGuideSection searchQuery={isSearchActive ? searchQuery : undefined} />
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq">
          <FAQSection searchQuery={searchQuery} />
        </TabsContent>

        {/* Troubleshooting Tab */}
        <TabsContent value="troubleshooting">
          <TroubleshootingSection searchQuery={searchQuery} />
        </TabsContent>

        {/* Shortcuts Tab */}
        <TabsContent value="shortcuts">
          <KeyboardShortcutsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Overview Section Component
 *
 * Displays welcome message and quick links to common help topics.
 */
function OverviewSection() {
  const { t } = useTranslation();

  const quickLinks = [
    { key: 'link_new_patient', tab: 'getting_started' },
    { key: 'link_schedule', tab: 'getting_started' },
    { key: 'link_visit', tab: 'getting_started' },
    { key: 'link_prescription', tab: 'features' },
    { key: 'link_documents', tab: 'features' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {t('help.overview.title')}
          </CardTitle>
          <CardDescription>{t('help.overview.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('help.overview.intro')}
          </p>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('help.overview.quick_links')}</CardTitle>
          <CardDescription>{t('help.overview.quick_links_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {quickLinks.map((link) => (
              <Button
                key={link.key}
                variant="outline"
                className="justify-start gap-2 h-auto py-3"
                asChild
              >
                <a href={`#${link.tab}`}>
                  <ExternalLink className="h-4 w-4" />
                  {t(`help.overview.${link.key}`)}
                </a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('help.overview.support_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('help.overview.support_description')}
          </p>
        </CardContent>
      </Card>

      {/* Version Info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{t('help.overview.version')}: 1.0.0</span>
        <Separator orientation="vertical" className="h-4" />
        <span>{t('help.overview.last_updated')}: January 2026</span>
      </div>
    </div>
  );
}

export default HelpPage;
