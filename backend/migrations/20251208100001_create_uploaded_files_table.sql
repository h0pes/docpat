-- Migration: Create uploaded_files table
-- Date: 2025-12-08
-- Purpose: Store metadata for uploaded files (logos, attachments, etc.)
-- Security: OWASP File Upload security compliance

-- Create enum type for file purposes/categories
CREATE TYPE file_purpose AS ENUM (
    'LOGO',           -- Practice logo
    'ATTACHMENT',     -- Generic attachment
    'DOCUMENT',       -- Document file
    'AVATAR'          -- User profile image (future)
);

-- Create uploaded_files table
CREATE TABLE IF NOT EXISTS uploaded_files (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Original filename (for display purposes only, not used for storage)
    original_filename VARCHAR(255) NOT NULL,

    -- Stored filename (UUID-based for security)
    stored_filename VARCHAR(255) NOT NULL UNIQUE,

    -- MIME type validated on upload
    mime_type VARCHAR(100) NOT NULL,

    -- File size in bytes (for validation and display)
    file_size_bytes BIGINT NOT NULL,

    -- File purpose/category
    purpose file_purpose NOT NULL DEFAULT 'ATTACHMENT',

    -- Storage path relative to uploads directory
    storage_path VARCHAR(500) NOT NULL,

    -- SHA-256 hash of file content (for integrity verification)
    content_hash VARCHAR(64) NOT NULL,

    -- Alt text for images (accessibility)
    alt_text VARCHAR(500),

    -- Optional description
    description TEXT,

    -- Audit fields
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Soft delete support
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_file_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760), -- Max 10MB
    CONSTRAINT valid_mime_type CHECK (mime_type ~ '^[a-z]+/[a-z0-9.+-]+$')
);

-- Create index for looking up files by purpose (e.g., find logo)
CREATE INDEX idx_uploaded_files_purpose ON uploaded_files(purpose) WHERE deleted_at IS NULL;

-- Create index for finding files by creator
CREATE INDEX idx_uploaded_files_created_by ON uploaded_files(created_by) WHERE deleted_at IS NULL;

-- Create index for content hash (duplicate detection)
CREATE INDEX idx_uploaded_files_content_hash ON uploaded_files(content_hash) WHERE deleted_at IS NULL;

-- Create trigger for updated_at timestamp
CREATE TRIGGER set_uploaded_files_updated_at
    BEFORE UPDATE ON uploaded_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploaded_files
-- Policy: Allow all authenticated users to read non-deleted files
CREATE POLICY uploaded_files_select_policy ON uploaded_files
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND current_setting('app.current_user_id', true) IS NOT NULL
    );

-- Policy: Allow admins to insert files
CREATE POLICY uploaded_files_insert_policy ON uploaded_files
    FOR INSERT
    WITH CHECK (
        current_setting('app.current_user_role', true) = 'ADMIN'
    );

-- Policy: Allow admins to update files
CREATE POLICY uploaded_files_update_policy ON uploaded_files
    FOR UPDATE
    USING (
        current_setting('app.current_user_role', true) = 'ADMIN'
        AND deleted_at IS NULL
    )
    WITH CHECK (
        current_setting('app.current_user_role', true) = 'ADMIN'
    );

-- Policy: Allow admins to delete files
CREATE POLICY uploaded_files_delete_policy ON uploaded_files
    FOR DELETE
    USING (
        current_setting('app.current_user_role', true) = 'ADMIN'
    );

-- Add comment for documentation
COMMENT ON TABLE uploaded_files IS 'Stores metadata for uploaded files with OWASP security compliance';
COMMENT ON COLUMN uploaded_files.stored_filename IS 'UUID-based filename used for actual storage, prevents path traversal attacks';
COMMENT ON COLUMN uploaded_files.content_hash IS 'SHA-256 hash for integrity verification and duplicate detection';
COMMENT ON COLUMN uploaded_files.mime_type IS 'Validated MIME type from magic bytes, not from file extension';
