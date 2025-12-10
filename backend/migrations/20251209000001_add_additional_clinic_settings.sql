-- Add additional clinic settings for document generation
-- These settings enhance the practice information available in document templates

-- Add new clinic settings (only if they don't already exist)
INSERT INTO system_settings (setting_key, setting_group, setting_name, setting_value, value_type, description, default_value, is_public, is_readonly)
VALUES
    ('clinic.vat_number', 'clinic', 'VAT Number (P.IVA)', '""', 'STRING', 'Practice VAT number (Partita IVA)', '""', true, false),
    ('clinic.website', 'clinic', 'Website', '""', 'STRING', 'Practice website URL', '""', true, false),
    ('clinic.fax', 'clinic', 'Fax Number', '""', 'STRING', 'Practice fax number', '""', true, false)
ON CONFLICT (setting_key) DO NOTHING;
