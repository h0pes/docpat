-- Create document_templates table for PDF document generation templates
-- Templates use variable substitution for dynamic content

CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template identification
    template_key VARCHAR(100) UNIQUE NOT NULL,  -- e.g., "medical_certificate", "referral_letter"
    template_name VARCHAR(255) NOT NULL,        -- Human-readable name
    description TEXT,

    -- Template type/category
    document_type VARCHAR(50) NOT NULL CHECK (
        document_type IN ('MEDICAL_CERTIFICATE', 'REFERRAL_LETTER', 'LAB_REQUEST', 'VISIT_SUMMARY', 'PRESCRIPTION', 'CUSTOM')
    ),

    -- Template content (HTML with variable placeholders)
    -- Variables format: {{variable_name}}
    -- Example: {{patient.first_name}}, {{patient.last_name}}, {{visit.diagnosis}}
    template_html TEXT NOT NULL,

    -- Template variables (JSON schema)
    -- Defines what variables are available and required
    -- Example: {"patient": ["first_name", "last_name"], "visit": ["date", "diagnosis"]}
    template_variables JSONB,

    -- Header/Footer templates
    header_html TEXT,  -- Optional header content
    footer_html TEXT,  -- Optional footer content (e.g., clinic info, page numbers)

    -- Styling
    css_styles TEXT,  -- Custom CSS for this template

    -- PDF Generation Settings
    page_size VARCHAR(20) DEFAULT 'A4',  -- A4, Letter, Legal
    page_orientation VARCHAR(20) DEFAULT 'PORTRAIT',  -- PORTRAIT, LANDSCAPE
    margin_top_mm INT DEFAULT 20,
    margin_bottom_mm INT DEFAULT 20,
    margin_left_mm INT DEFAULT 20,
    margin_right_mm INT DEFAULT 20,

    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,  -- Default template for this document type

    -- Language support
    language VARCHAR(5) DEFAULT 'it' CHECK (language IN ('it', 'en')),

    -- Version control
    version INT DEFAULT 1 NOT NULL,
    previous_version_id UUID REFERENCES document_templates(id),

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Indexes for performance
-- Partial unique index to ensure only one default template per document_type and language
CREATE UNIQUE INDEX idx_document_templates_unique_default
    ON document_templates(document_type, language)
    WHERE is_default = true AND is_active = true;
CREATE INDEX idx_document_templates_template_key ON document_templates(template_key);
CREATE INDEX idx_document_templates_document_type ON document_templates(document_type);
CREATE INDEX idx_document_templates_is_active ON document_templates(is_active);
CREATE INDEX idx_document_templates_language ON document_templates(language);
CREATE INDEX idx_document_templates_is_default ON document_templates(is_default) WHERE is_default = true;

-- Composite index for common queries
CREATE INDEX idx_document_templates_type_lang_active ON document_templates(document_type, language, is_active);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to ensure only one default template per type and language
CREATE OR REPLACE FUNCTION validate_default_template()
RETURNS TRIGGER AS $$
BEGIN
    -- When setting as default, unset other defaults for this document_type and language
    IF NEW.is_default = true AND NEW.is_active = true THEN
        UPDATE document_templates
        SET is_default = false
        WHERE document_type = NEW.document_type
        AND language = NEW.language
        AND is_active = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_default_template
    BEFORE INSERT OR UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION validate_default_template();

-- Trigger to increment version on template changes
CREATE OR REPLACE FUNCTION increment_template_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment version when template_html changes
    IF OLD.template_html IS DISTINCT FROM NEW.template_html THEN
        NEW.version := OLD.version + 1;
        NEW.previous_version_id := OLD.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_template_version
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    WHEN (OLD.template_html IS DISTINCT FROM NEW.template_html)
    EXECUTE FUNCTION increment_template_version();

-- Comments for documentation
COMMENT ON TABLE document_templates IS 'Templates for PDF document generation with variable substitution';
COMMENT ON COLUMN document_templates.template_key IS 'Unique identifier for template (e.g., medical_certificate, referral_letter)';
COMMENT ON COLUMN document_templates.template_html IS 'HTML template with {{variable}} placeholders for substitution';
COMMENT ON COLUMN document_templates.template_variables IS 'JSON schema defining available and required variables';
COMMENT ON COLUMN document_templates.is_default IS 'Whether this is the default template for its document_type and language';
COMMENT ON COLUMN document_templates.page_size IS 'PDF page size (A4, Letter, Legal)';
COMMENT ON COLUMN document_templates.language IS 'Template language (it=Italian, en=English)';
COMMENT ON COLUMN document_templates.version IS 'Template version number (auto-increments on HTML changes)';
