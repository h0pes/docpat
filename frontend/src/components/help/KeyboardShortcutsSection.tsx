/**
 * KeyboardShortcutsSection Component
 *
 * Displays a reference guide for keyboard shortcuts organized by category.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Shortcut item IDs - must match keys in help.shortcuts.items
 */
const SHORTCUT_ITEMS = [
  // Navigation
  'global_search',
  'go_dashboard',
  'go_patients',
  'go_appointments',
  'go_visits',
  'toggle_sidebar',
  // Actions
  'new_patient',
  'new_appointment',
  'new_visit',
  // Forms
  'save',
  'cancel',
  'next_field',
  'prev_field',
] as const;

type ShortcutItemId = (typeof SHORTCUT_ITEMS)[number];

/**
 * Category configuration
 */
const CATEGORIES = ['navigation', 'actions', 'forms'] as const;

type CategoryId = (typeof CATEGORIES)[number];

/**
 * KeyboardShortcutsSection Component
 *
 * Displays keyboard shortcuts organized by category in a clean table format.
 */
export function KeyboardShortcutsSection() {
  const { t } = useTranslation();

  // Get shortcut items with their data
  const shortcutItems = useMemo(() => {
    return SHORTCUT_ITEMS.map((id) => ({
      id,
      category: t(`help.shortcuts.items.${id}.category`) as CategoryId,
      keys: t(`help.shortcuts.items.${id}.keys`),
      description: t(`help.shortcuts.items.${id}.description`),
    }));
  }, [t]);

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<CategoryId, typeof shortcutItems> = {} as Record<
      CategoryId,
      typeof shortcutItems
    >;

    for (const category of CATEGORIES) {
      groups[category] = shortcutItems.filter((item) => item.category === category);
    }

    return groups;
  }, [shortcutItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Keyboard className="h-6 w-6" />
          {t('help.shortcuts.title')}
        </h2>
        <p className="text-muted-foreground">
          {t('help.shortcuts.subtitle')}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        {t('help.shortcuts.intro')}
      </p>

      {/* macOS Note */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('help.shortcuts.note')}
        </AlertDescription>
      </Alert>

      {/* Shortcuts by Category */}
      <div className="space-y-6">
        {CATEGORIES.map((category) => {
          const shortcuts = groupedShortcuts[category];
          if (!shortcuts || shortcuts.length === 0) return null;

          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {t(`help.shortcuts.categories.${category}`)}
                  <Badge variant="secondary">{shortcuts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Shortcut</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shortcuts.map((shortcut) => (
                      <TableRow key={shortcut.id}>
                        <TableCell>
                          <KeyboardKey keys={shortcut.keys} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {shortcut.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders keyboard keys with proper styling
 */
interface KeyboardKeyProps {
  keys: string;
}

function KeyboardKey({ keys }: KeyboardKeyProps) {
  // Split keys by + to render individual key badges
  const keyParts = keys.split('+').map((k) => k.trim());

  return (
    <div className="flex items-center gap-1">
      {keyParts.map((key, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span className="text-muted-foreground">+</span>}
          <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground">
            {key}
          </kbd>
        </span>
      ))}
    </div>
  );
}

export default KeyboardShortcutsSection;
