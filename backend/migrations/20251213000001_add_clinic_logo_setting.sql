-- Add clinic.logo setting for storing practice logo as base64
-- This allows storing small logo images directly in the settings table

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
) VALUES (
    'clinic.logo',
    'clinic',
    'Practice Logo',
    '""',
    'STRING',
    'Practice logo as base64-encoded data URL (max 2MB recommended)',
    '""',
    true,
    false,
    false
) ON CONFLICT (setting_key) DO NOTHING;
