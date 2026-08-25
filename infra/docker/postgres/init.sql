-- =============================================================
-- NovaCP — PostgreSQL Initialization Script
-- Run automatically by Docker on first container creation.
-- =============================================================

-- Create extensions needed by the application
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";  -- Query performance tracking

-- Set sensible defaults for the novacp database
ALTER DATABASE novacp SET timezone = 'UTC';
ALTER DATABASE novacp SET statement_timeout = '30s';
ALTER DATABASE novacp SET lock_timeout = '10s';
ALTER DATABASE novacp SET idle_in_transaction_session_timeout = '60s';

-- Log slow queries (queries taking > 100ms)
ALTER DATABASE novacp SET log_min_duration_statement = '100';

-- =============================================================
-- Note: Tables are created by Alembic migrations, not here.
-- This file only handles PostgreSQL-level setup that must
-- happen before the application connects.
-- =============================================================
