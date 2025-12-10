/**
 * SettingsSection Component
 *
 * A reusable container for grouping related settings.
 * Provides consistent styling and layout for settings sections.
 */

import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Props for SettingsSection component
 */
interface SettingsSectionProps {
  /** Section title */
  title: string;
  /** Section description */
  description?: string;
  /** Section content */
  children: ReactNode;
  /** Optional icon component */
  icon?: ReactNode;
  /** Optional action buttons in header */
  actions?: ReactNode;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * SettingsSection component
 *
 * Container for grouping related settings with a title and description.
 * Used within the SettingsPage to organize settings into logical groups.
 *
 * @param props - SettingsSection props
 * @returns SettingsSection component
 */
export function SettingsSection({
  title,
  description,
  children,
  icon,
  actions,
  className = '',
}: SettingsSectionProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Props for SettingsField component
 */
interface SettingsFieldProps {
  /** Field label */
  label: string;
  /** Field description/help text */
  description?: string;
  /** Field input or control */
  children: ReactNode;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Error message */
  error?: string;
}

/**
 * SettingsField component
 *
 * Individual setting field with label and optional description.
 *
 * @param props - SettingsField props
 * @returns SettingsField component
 */
export function SettingsField({
  label,
  description,
  children,
  readOnly = false,
  error,
}: SettingsFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {readOnly && (
            <span className="ml-2 text-xs text-muted-foreground">(Read-only)</span>
          )}
        </label>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div>{children}</div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Props for SettingsRow component
 */
interface SettingsRowProps {
  /** Row content */
  children: ReactNode;
  /** Number of columns (default: 2) */
  columns?: 1 | 2 | 3 | 4;
}

/**
 * SettingsRow component
 *
 * Grid row for laying out multiple settings fields.
 *
 * @param props - SettingsRow props
 * @returns SettingsRow component
 */
export function SettingsRow({ children, columns = 2 }: SettingsRowProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return <div className={`grid gap-6 ${columnClasses[columns]}`}>{children}</div>;
}

/**
 * Props for SettingsDivider component
 */
interface SettingsDividerProps {
  /** Optional label for the divider */
  label?: string;
}

/**
 * SettingsDivider component
 *
 * Visual divider between setting groups within a section.
 *
 * @param props - SettingsDivider props
 * @returns SettingsDivider component
 */
export function SettingsDivider({ label }: SettingsDividerProps) {
  if (label) {
    return (
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{label}</span>
        </div>
      </div>
    );
  }

  return <hr className="my-6" />;
}
