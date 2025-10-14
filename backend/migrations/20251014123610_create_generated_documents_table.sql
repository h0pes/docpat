-- Create generated_documents table for tracking generated PDF documents
-- Stores metadata and file paths for all generated documents

CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References
    template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE RESTRICT,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    visit_id UUID,
    visit_date DATE,  -- Required for partitioned foreign key to visits
    provider_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Foreign key to visits table (optional)
    FOREIGN KEY (visit_id, visit_date) REFERENCES visits(id, visit_date) ON DELETE SET NULL,

    -- Document metadata
    document_type VARCHAR(50) NOT NULL CHECK (
        document_type IN ('MEDICAL_CERTIFICATE', 'REFERRAL_LETTER', 'LAB_REQUEST', 'VISIT_SUMMARY', 'PRESCRIPTION', 'CUSTOM')
    ),
    document_title VARCHAR(255) NOT NULL,
    document_filename VARCHAR(255) NOT NULL,  -- e.g., "medical_cert_20241015_123456.pdf"

    -- File storage
    file_path TEXT NOT NULL,  -- Full path or URL to generated PDF file
    file_size_bytes BIGINT,
    file_hash VARCHAR(64),  -- SHA-256 hash for integrity verification

    -- Generation details
    template_version INT,  -- Version of template used for generation
    generation_data JSONB,  -- Data used for variable substitution (🔒 May contain PHI, encrypt if storing)

    -- Status
    status VARCHAR(20) DEFAULT 'GENERATED' NOT NULL CHECK (
        status IN ('GENERATING', 'GENERATED', 'DELIVERED', 'FAILED', 'DELETED')
    ),
    generation_error TEXT,  -- Error message if generation failed

    -- Delivery tracking
    delivered_to VARCHAR(255),  -- Email or method of delivery
    delivered_at TIMESTAMPTZ,

    -- Expiration/Retention
    expires_at TIMESTAMPTZ,  -- Optional expiration date for document
    deleted_at TIMESTAMPTZ,  -- Soft delete timestamp

    -- Digital signature (if signed)
    is_signed BOOLEAN DEFAULT false,
    signature_hash TEXT,
    signed_at TIMESTAMPTZ,
    signed_by UUID REFERENCES users(id),

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT valid_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
    CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at),
    CONSTRAINT valid_generation_error CHECK (
        (status = 'FAILED' AND generation_error IS NOT NULL) OR
        (status != 'FAILED')
    ),
    CONSTRAINT valid_signature CHECK (
        (is_signed = true AND signature_hash IS NOT NULL AND signed_at IS NOT NULL AND signed_by IS NOT NULL) OR
        (is_signed = false)
    )
);

-- Indexes for performance
CREATE INDEX idx_generated_documents_patient_id ON generated_documents(patient_id, created_at DESC);
CREATE INDEX idx_generated_documents_provider_id ON generated_documents(provider_id, created_at DESC);
CREATE INDEX idx_generated_documents_visit_id ON generated_documents(visit_id, visit_date);
CREATE INDEX idx_generated_documents_template_id ON generated_documents(template_id);
CREATE INDEX idx_generated_documents_document_type ON generated_documents(document_type);
CREATE INDEX idx_generated_documents_status ON generated_documents(status);
CREATE INDEX idx_generated_documents_file_hash ON generated_documents(file_hash);
CREATE INDEX idx_generated_documents_created_at ON generated_documents(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_generated_documents_patient_type ON generated_documents(patient_id, document_type, created_at DESC);
CREATE INDEX idx_generated_documents_visit ON generated_documents(visit_id, visit_date, created_at DESC) WHERE visit_id IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_generated_documents_updated_at
    BEFORE UPDATE ON generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-generate filename
CREATE OR REPLACE FUNCTION generate_document_filename()
RETURNS TRIGGER AS $$
DECLARE
    date_part VARCHAR(8);
    time_part VARCHAR(6);
    type_abbrev VARCHAR(10);
BEGIN
    IF NEW.document_filename IS NULL OR NEW.document_filename = '' THEN
        date_part := TO_CHAR(NOW(), 'YYYYMMDD');
        time_part := TO_CHAR(NOW(), 'HH24MISS');

        -- Abbreviate document type
        type_abbrev := CASE NEW.document_type
            WHEN 'MEDICAL_CERTIFICATE' THEN 'med_cert'
            WHEN 'REFERRAL_LETTER' THEN 'referral'
            WHEN 'LAB_REQUEST' THEN 'lab_req'
            WHEN 'VISIT_SUMMARY' THEN 'visit_sum'
            WHEN 'PRESCRIPTION' THEN 'rx'
            ELSE 'doc'
        END;

        NEW.document_filename := type_abbrev || '_' || date_part || '_' || time_part || '.pdf';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_document_filename
    BEFORE INSERT ON generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION generate_document_filename();

-- Trigger to validate status transitions
CREATE OR REPLACE FUNCTION validate_document_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- GENERATING can go to: GENERATED, FAILED
    IF OLD.status = 'GENERATING' AND NEW.status NOT IN ('GENERATING', 'GENERATED', 'FAILED') THEN
        RAISE EXCEPTION 'Invalid status transition from GENERATING to %', NEW.status;
    END IF;

    -- GENERATED can go to: DELIVERED, DELETED
    IF OLD.status = 'GENERATED' AND NEW.status NOT IN ('GENERATED', 'DELIVERED', 'DELETED') THEN
        RAISE EXCEPTION 'Invalid status transition from GENERATED to %', NEW.status;
    END IF;

    -- DELIVERED can go to: DELETED
    IF OLD.status = 'DELIVERED' AND NEW.status NOT IN ('DELIVERED', 'DELETED') THEN
        RAISE EXCEPTION 'Invalid status transition from DELIVERED to %', NEW.status;
    END IF;

    -- FAILED and DELETED are final states
    IF OLD.status IN ('FAILED', 'DELETED') AND NEW.status != OLD.status THEN
        RAISE EXCEPTION 'Cannot change status from %', OLD.status;
    END IF;

    -- Auto-set delivered_at when moving to DELIVERED
    IF NEW.status = 'DELIVERED' AND OLD.status != 'DELIVERED' AND NEW.delivered_at IS NULL THEN
        NEW.delivered_at := NOW();
    END IF;

    -- Auto-set deleted_at when moving to DELETED
    IF NEW.status = 'DELETED' AND OLD.status != 'DELETED' AND NEW.deleted_at IS NULL THEN
        NEW.deleted_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_document_status
    BEFORE UPDATE ON generated_documents
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION validate_document_status_transition();

-- Comments for documentation
COMMENT ON TABLE generated_documents IS 'Metadata and tracking for all generated PDF documents';
COMMENT ON COLUMN generated_documents.id IS 'Unique document identifier';
COMMENT ON COLUMN generated_documents.template_id IS 'Reference to document template used';
COMMENT ON COLUMN generated_documents.patient_id IS 'Reference to patient';
COMMENT ON COLUMN generated_documents.visit_id IS 'Optional reference to visit';
COMMENT ON COLUMN generated_documents.file_path IS 'Full path or URL to generated PDF file';
COMMENT ON COLUMN generated_documents.file_hash IS 'SHA-256 hash for file integrity verification';
COMMENT ON COLUMN generated_documents.generation_data IS 'Data used for template variable substitution (may contain PHI - encrypt if storing)';
COMMENT ON COLUMN generated_documents.status IS 'Document status: GENERATING → GENERATED → DELIVERED (or FAILED/DELETED)';
COMMENT ON COLUMN generated_documents.document_filename IS 'Auto-generated filename (type_YYYYMMDD_HHMMSS.pdf)';
COMMENT ON COLUMN generated_documents.is_signed IS 'Whether document has been digitally signed';
