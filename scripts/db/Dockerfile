# PostgreSQL 16 with PostGIS + pgvector pre-built
# Avoids slow apt-get install at every container start.
FROM postgis/postgis:16-3.4

ARG PGVECTOR_VERSION=v0.7.4

RUN apt-get update -qq \
 && apt-get install -y --no-install-recommends \
      postgresql-16-pgvector \
 && rm -rf /var/lib/apt/lists/*
