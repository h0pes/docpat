-- Add full-text search capabilities for patients table
-- Uses PostgreSQL's built-in text search with GIN indexes for fast searching

-- ====================
-- TEXT SEARCH CONFIGURATION
-- ====================

-- Create a text search configuration for medical records
-- Using Italian language for better stemming and stop words
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'medical_italian') THEN
        CREATE TEXT SEARCH CONFIGURATION medical_italian (COPY = italian);
    END IF;
END $$;

-- ====================
-- PATIENT SEARCH COLUMNS
-- ====================

-- Add a generated tsvector column for full-text search
-- This will be automatically updated on INSERT/UPDATE
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('medical_italian'::regconfig, COALESCE(first_name, '')), 'A') ||
        setweight(to_tsvector('medical_italian'::regconfig, COALESCE(last_name, '')), 'A') ||
        setweight(to_tsvector('medical_italian'::regconfig, COALESCE(fiscal_code, '')), 'B') ||
        setweight(to_tsvector('medical_italian'::regconfig, COALESCE(email, '')), 'C') ||
        setweight(to_tsvector('medical_italian'::regconfig, COALESCE(phone_primary, '')), 'C')
    ) STORED;

-- ====================
-- FULL-TEXT SEARCH INDEXES
-- ====================

-- Create GIN index on the tsvector column for fast full-text search
-- Supports queries like: WHERE search_vector @@ to_tsquery('italian', 'rossi & mario')
CREATE INDEX IF NOT EXISTS idx_patients_fulltext_search
    ON patients USING GIN (search_vector);

-- Additional GIN index for trigram similarity search (fuzzy matching)
-- Requires pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fuzzy name search using trigrams
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm
    ON patients USING GIN (last_name gin_trgm_ops, first_name gin_trgm_ops);

-- GIN index for fuzzy fiscal code search
CREATE INDEX IF NOT EXISTS idx_patients_fiscal_code_trgm
    ON patients USING GIN (fiscal_code gin_trgm_ops);

-- ====================
-- SEARCH HELPER FUNCTIONS
-- ====================

-- Function to search patients by name (supports partial matching)
CREATE OR REPLACE FUNCTION search_patients_by_name(search_term TEXT)
RETURNS TABLE (
    patient_id UUID,
    full_name TEXT,
    fiscal_code VARCHAR(16),
    date_of_birth DATE,
    phone_primary VARCHAR(20),
    similarity_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.first_name || ' ' || p.last_name AS full_name,
        p.fiscal_code,
        p.date_of_birth,
        p.phone_primary,
        GREATEST(
            similarity(p.first_name, search_term),
            similarity(p.last_name, search_term),
            similarity(p.first_name || ' ' || p.last_name, search_term)
        ) AS similarity_score
    FROM patients p
    WHERE
        p.status = 'ACTIVE'
        AND (
            p.search_vector @@ plainto_tsquery('medical_italian', search_term)
            OR p.first_name % search_term
            OR p.last_name % search_term
            OR (p.first_name || ' ' || p.last_name) % search_term
        )
    ORDER BY similarity_score DESC, p.last_name, p.first_name
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to search patients by fiscal code (exact and fuzzy)
CREATE OR REPLACE FUNCTION search_patients_by_fiscal_code(search_term TEXT)
RETURNS TABLE (
    patient_id UUID,
    full_name TEXT,
    fiscal_code VARCHAR(16),
    date_of_birth DATE,
    similarity_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.first_name || ' ' || p.last_name AS full_name,
        p.fiscal_code,
        p.date_of_birth,
        similarity(COALESCE(p.fiscal_code, ''), search_term) AS similarity_score
    FROM patients p
    WHERE
        p.status = 'ACTIVE'
        AND p.fiscal_code IS NOT NULL
        AND (
            p.fiscal_code = search_term
            OR p.fiscal_code % search_term
        )
    ORDER BY
        CASE WHEN p.fiscal_code = search_term THEN 0 ELSE 1 END,
        similarity_score DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function for general patient search (name, fiscal code, phone, email)
CREATE OR REPLACE FUNCTION search_patients_general(search_term TEXT)
RETURNS TABLE (
    patient_id UUID,
    full_name TEXT,
    fiscal_code VARCHAR(16),
    date_of_birth DATE,
    phone_primary VARCHAR(20),
    email VARCHAR(255),
    rank_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.first_name || ' ' || p.last_name AS full_name,
        p.fiscal_code,
        p.date_of_birth,
        p.phone_primary,
        p.email,
        ts_rank(p.search_vector, plainto_tsquery('medical_italian', search_term)) AS rank_score
    FROM patients p
    WHERE
        p.status = 'ACTIVE'
        AND p.search_vector @@ plainto_tsquery('medical_italian', search_term)
    ORDER BY rank_score DESC, p.last_name, p.first_name
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- ====================
-- COMMENTS FOR DOCUMENTATION
-- ====================

COMMENT ON COLUMN patients.search_vector IS 'Full-text search vector for patient name, fiscal code, email, and phone';
COMMENT ON INDEX idx_patients_fulltext_search IS 'GIN index for full-text search on patient information';
COMMENT ON INDEX idx_patients_name_trgm IS 'GIN trigram index for fuzzy name matching';
COMMENT ON INDEX idx_patients_fiscal_code_trgm IS 'GIN trigram index for fuzzy fiscal code matching';
COMMENT ON FUNCTION search_patients_by_name IS 'Search patients by name with fuzzy matching, returns top 50 results';
COMMENT ON FUNCTION search_patients_by_fiscal_code IS 'Search patients by fiscal code with exact and fuzzy matching';
COMMENT ON FUNCTION search_patients_general IS 'General patient search across all indexed fields with ranking';

-- ====================
-- USAGE EXAMPLES
-- ====================

-- Example 1: Full-text search for patient name
-- SELECT * FROM search_patients_by_name('mario rossi');

-- Example 2: Fuzzy search for fiscal code
-- SELECT * FROM search_patients_by_fiscal_code('RSSMRA80A01H501');

-- Example 3: General search (searches all fields)
-- SELECT * FROM search_patients_general('mario');

-- Example 4: Direct query with text search
-- SELECT * FROM patients WHERE search_vector @@ to_tsquery('medical_italian', 'mario & rossi') ORDER BY ts_rank(search_vector, to_tsquery('medical_italian', 'mario & rossi')) DESC;

-- Example 5: Fuzzy similarity search
-- SELECT * FROM patients WHERE similarity(last_name, 'Rosi') > 0.3 ORDER BY similarity(last_name, 'Rosi') DESC;
