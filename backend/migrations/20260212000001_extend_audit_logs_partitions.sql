-- Extend audit_logs partitions through end of 2027
-- The original migration only created partitions through January 2026.
-- This migration adds February 2026 through December 2027 to prevent
-- "no partition found for row" errors as time progresses.
--
-- IMPORTANT: Use explicit UTC timestamps to avoid timezone-dependent
-- boundary interpretation. The original migration used plain dates which
-- were interpreted in the server's local timezone at creation time.
-- Using +00 suffix ensures consistent boundaries regardless of server TZ.
--
-- NOTE: Per migration 20251218000001, new partitions do NOT need RLS
-- disabled (RLS is not enabled on them by default). The parent table's
-- RLS policies handle access control.
--
-- NOTE: If this system runs beyond 2027, a similar migration will be needed.

-- 2026 (February through December)
CREATE TABLE IF NOT EXISTS audit_logs_202602 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202603 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202604 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202605 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202606 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202607 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202608 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202609 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202610 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202611 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202612 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- 2027 (full year)
CREATE TABLE IF NOT EXISTS audit_logs_202701 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202702 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-02-01 00:00:00+00') TO ('2027-03-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202703 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-03-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202704 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-04-01 00:00:00+00') TO ('2027-05-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202705 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-05-01 00:00:00+00') TO ('2027-06-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202706 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-06-01 00:00:00+00') TO ('2027-07-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202707 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-07-01 00:00:00+00') TO ('2027-08-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202708 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-08-01 00:00:00+00') TO ('2027-09-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202709 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-09-01 00:00:00+00') TO ('2027-10-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202710 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-10-01 00:00:00+00') TO ('2027-11-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202711 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-11-01 00:00:00+00') TO ('2027-12-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS audit_logs_202712 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-12-01 00:00:00+00') TO ('2028-01-01 00:00:00+00');
