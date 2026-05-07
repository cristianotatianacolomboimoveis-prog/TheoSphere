-- Enable PostGIS (already bundled in postgis/postgis image)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pgvector (installed via apt in docker-compose command)
CREATE EXTENSION IF NOT EXISTS vector;
