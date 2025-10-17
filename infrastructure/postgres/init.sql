-- ==============================================================================
-- PostgreSQL Initialization Script
-- Medical Practice Management System (MPMS)
-- ==============================================================================
--
-- This script runs once when the PostgreSQL container is first initialized.
-- It sets up required extensions and initial configuration.
--
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create medical_italian text search configuration (if not exists)
-- This will be used for full-text search on patient names and medical terms
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'medical_italian') THEN
        CREATE TEXT SEARCH CONFIGURATION medical_italian (COPY = italian);
    END IF;
END
$$;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL initialization complete. Extensions enabled.';
END
$$;
