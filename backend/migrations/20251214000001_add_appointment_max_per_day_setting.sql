-- Add appointment.max_per_day setting for maximum appointments per day
-- This setting limits how many appointments can be scheduled in a single day

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
    'appointment.max_per_day',
    'appointment',
    'Maximum Appointments Per Day',
    '20',
    'INTEGER',
    'Maximum number of appointments that can be scheduled per day',
    '20',
    true,
    false,
    false
) ON CONFLICT (setting_key) DO NOTHING;
