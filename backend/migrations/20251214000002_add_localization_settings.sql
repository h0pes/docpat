-- Add missing localization settings for timezone and first day of week

INSERT INTO system_settings (
    setting_key,
    setting_group,
    setting_name,
    setting_value,
    value_type,
    description,
    default_value,
    is_public,
    is_encrypted,
    is_readonly
) VALUES
(
    'localization.timezone',
    'localization',
    'Timezone',
    '"Europe/Rome"',
    'STRING',
    'Default timezone for the application',
    '"Europe/Rome"',
    true,
    false,
    false
),
(
    'localization.first_day_of_week',
    'localization',
    'First Day of Week',
    '"monday"',
    'STRING',
    'First day of the week for calendar displays',
    '"monday"',
    true,
    false,
    false
)
ON CONFLICT (setting_key) DO NOTHING;
