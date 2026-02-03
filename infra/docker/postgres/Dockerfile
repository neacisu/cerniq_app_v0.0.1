# Cerniq.app PostgreSQL 18.1 + PostGIS 3.6 + pgvector 0.8
# Reference: ADR-0004, docs/infrastructure/docker-compose-reference.md
# 
# Contracte tehnice:
# - PostgreSQL 18.1
# - PostGIS 3.6.1
# - pgvector 0.8.1
# - pg_trgm (built-in)

FROM postgis/postgis:18-3.6

LABEL maintainer="Cerniq.app <admin@cerniq.app>"
LABEL description="PostgreSQL 18.1 with PostGIS 3.6 and pgvector 0.8 for Cerniq.app"

# Install build dependencies for pgvector
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    postgresql-server-dev-18 \
    && rm -rf /var/lib/apt/lists/*

# Install pgvector 0.8.1 (required for PostgreSQL 18 compatibility)
# Reference: https://github.com/pgvector/pgvector
RUN cd /tmp \
    && git clone --branch v0.8.1 https://github.com/pgvector/pgvector.git \
    && cd pgvector \
    && make \
    && make install \
    && cd / \
    && rm -rf /tmp/pgvector

# Cleanup build dependencies to reduce image size
RUN apt-get purge -y --auto-remove \
    build-essential \
    git \
    postgresql-server-dev-18 \
    && rm -rf /var/lib/apt/lists/*

# Verify extensions are available
RUN postgres --version && \
    echo "PostGIS and pgvector installed successfully"
