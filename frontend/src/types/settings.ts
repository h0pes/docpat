/**
 * System Settings Type Definitions
 *
 * Type definitions for system settings management.
 * These types align with the backend API in handlers/settings.rs
 * and models/system_setting.rs
 */

/**
 * Setting value types for validation and proper parsing
 * Matches SettingValueType enum in backend
 */
export type SettingValueType =
  | 'STRING'
  | 'INTEGER'
  | 'FLOAT'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'JSON'
  | 'ARRAY';

/**
 * Setting groups for organization
 * Matches SettingGroup enum in backend
 */
export type SettingGroup =
  | 'clinic'
  | 'appointment'
  | 'notification'
  | 'security'
  | 'backup'
  | 'localization'
  | 'system';

/**
 * System setting response from API
 * Matches SystemSettingResponse in backend/src/models/system_setting.rs
 */
export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_group: string;
  setting_name: string;
  setting_value: unknown;
  value_type: SettingValueType;
  description: string | null;
  default_value: unknown | null;
  is_public: boolean;
  is_readonly: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Request to update a setting value
 * Matches UpdateSettingRequest in backend
 */
export interface UpdateSettingRequest {
  value: unknown;
}

/**
 * Individual setting update in bulk operation
 * Matches SettingUpdate in backend
 */
export interface SettingUpdate {
  key: string;
  value: unknown;
}

/**
 * Request to bulk update settings
 * Matches BulkUpdateSettingsRequest in backend
 */
export interface BulkUpdateSettingsRequest {
  settings: SettingUpdate[];
}

/**
 * Response for listing settings
 * Matches ListSettingsResponse in backend
 */
export interface ListSettingsResponse {
  settings: SystemSetting[];
  total: number;
}

/**
 * Filter for listing settings
 * Matches SettingsFilter in backend
 */
export interface SettingsFilter {
  group?: string;
  public_only?: boolean;
  search?: string;
}

/**
 * Setting group information
 * Matches SettingGroupInfo in backend
 */
export interface SettingGroupInfo {
  key: string;
  name: string;
  setting_count: number;
}

/**
 * Response for listing setting groups
 * Matches ListSettingGroupsResponse in backend
 */
export interface ListSettingGroupsResponse {
  groups: SettingGroupInfo[];
}

/**
 * Get display name for setting group
 * @param group - Setting group key
 * @returns Display name string
 */
export function getSettingGroupDisplayName(group: SettingGroup): string {
  const names: Record<SettingGroup, string> = {
    clinic: 'Clinic Settings',
    appointment: 'Appointment Settings',
    notification: 'Notification Settings',
    security: 'Security Settings',
    backup: 'Backup Settings',
    localization: 'Localization Settings',
    system: 'System Settings',
  };
  return names[group] || group;
}

/**
 * Get setting value as string for display
 * @param setting - System setting object
 * @returns Formatted value string
 */
export function formatSettingValue(setting: SystemSetting): string {
  const { setting_value, value_type } = setting;

  if (setting_value === null || setting_value === undefined) {
    return '-';
  }

  switch (value_type) {
    case 'BOOLEAN':
      return setting_value ? 'Enabled' : 'Disabled';
    case 'JSON':
    case 'ARRAY':
      return JSON.stringify(setting_value, null, 2);
    case 'DATE':
    case 'DATETIME':
      return new Date(setting_value as string).toLocaleString();
    default:
      return String(setting_value);
  }
}

/**
 * Validate setting value based on type
 * @param value - Value to validate
 * @param valueType - Expected value type
 * @returns True if valid, false otherwise
 */
export function validateSettingValue(
  value: unknown,
  valueType: SettingValueType
): boolean {
  if (value === null || value === undefined) {
    return true; // Allow null for optional settings
  }

  switch (valueType) {
    case 'STRING':
      return typeof value === 'string';
    case 'INTEGER':
      return Number.isInteger(value);
    case 'FLOAT':
      return typeof value === 'number' && !isNaN(value);
    case 'BOOLEAN':
      return typeof value === 'boolean';
    case 'DATE':
    case 'DATETIME':
      return typeof value === 'string' && !isNaN(Date.parse(value));
    case 'JSON':
      return typeof value === 'object';
    case 'ARRAY':
      return Array.isArray(value);
    default:
      return true;
  }
}

/**
 * All available setting groups
 */
export const SETTING_GROUPS: SettingGroup[] = [
  'clinic',
  'appointment',
  'notification',
  'security',
  'backup',
  'localization',
  'system',
];
