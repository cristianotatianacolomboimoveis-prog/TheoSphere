-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: enable required PostgreSQL extensions
--
-- Runs FIRST (lexicographic dir name `00000000000000_*`) so that subsequent
-- migrations can declare `vector(...)` and `geography(...)` columns without
-- failing on a fresh database.
--
-- Idempotent: `CREATE EXTENSION IF NOT EXISTS` is a no-op when the extension
-- already exists. Safe to (re-)apply on Supabase / hosted Postgres where
-- extensions were enabled via dashboard.
--
-- NOTE: On managed Postgres (Supabase/Neon/RDS) where the migration role
-- lacks `CREATEROLE`/`SUPERUSER`, you must enable these via the dashboard
-- BEFORE running migrations:
--   - vector   (pgvector)
--   - postgis
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;
