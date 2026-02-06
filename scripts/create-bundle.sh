#!/bin/bash
# ==============================================================================
# DocPat Bundle Creator
# Creates a distributable package with all required files and Docker images
# ==============================================================================
#
# Usage:
#   ./scripts/create-bundle.sh [output-directory]
#
# Output:
#   docpat-bundle-YYYYMMDD.tar.gz
#
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${GREEN}[STEP]${NC} $1"; }
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT_DIR="${1:-${PROJECT_ROOT}}"
DATE=$(date +%Y%m%d)
BUNDLE_NAME="docpat-bundle-${DATE}"
BUNDLE_DIR="${OUTPUT_DIR}/${BUNDLE_NAME}"

echo ""
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}  DocPat Bundle Creator${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# Check we're in the right place
if [ ! -f "${PROJECT_ROOT}/docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Run this script from the project root."
    exit 1
fi

# Check Docker images exist
print_step "Checking Docker images..."

IMAGES=(
    "docpat-backend:latest"
    "docpat-frontend:latest"
    "docpat-nginx:latest"
    "postgres:18-alpine"
)

for img in "${IMAGES[@]}"; do
    if ! docker image inspect "$img" &> /dev/null; then
        print_error "Image not found: $img"
        print_info "Build images first with: docker compose --profile with-nginx build"
        exit 1
    fi
done
print_success "All images found"

# Clean up any existing bundle directory
if [ -d "${BUNDLE_DIR}" ]; then
    print_info "Removing existing bundle directory..."
    rm -rf "${BUNDLE_DIR}"
fi

# Create bundle structure
print_step "Creating bundle structure..."
mkdir -p "${BUNDLE_DIR}/images"
mkdir -p "${BUNDLE_DIR}/infrastructure/postgres"
mkdir -p "${BUNDLE_DIR}/infrastructure/docker"
mkdir -p "${BUNDLE_DIR}/backend/casbin"
mkdir -p "${BUNDLE_DIR}/backend/migrations"

# Export Docker images
print_step "Exporting Docker images (this may take a few minutes)..."

for img in "${IMAGES[@]}"; do
    FILENAME=$(echo "$img" | tr ':' '-' | tr '/' '-').tar.gz
    print_info "Exporting $img..."
    docker save "$img" | gzip > "${BUNDLE_DIR}/images/${FILENAME}"
done
print_success "Images exported"

# Copy configuration files
print_step "Copying configuration files..."

# docker-compose.yml
cp "${PROJECT_ROOT}/docker-compose.yml" "${BUNDLE_DIR}/"

# PostgreSQL config
cp "${PROJECT_ROOT}/infrastructure/postgres/postgresql.conf" "${BUNDLE_DIR}/infrastructure/postgres/"
cp "${PROJECT_ROOT}/infrastructure/postgres/init.sql" "${BUNDLE_DIR}/infrastructure/postgres/"

# Casbin policies
cp -r "${PROJECT_ROOT}/backend/casbin/"* "${BUNDLE_DIR}/backend/casbin/"

# Migrations
cp -r "${PROJECT_ROOT}/backend/migrations/"* "${BUNDLE_DIR}/backend/migrations/"

print_success "Configuration files copied"

# Copy install script
print_step "Copying install script..."
cp "${SCRIPT_DIR}/install.sh" "${BUNDLE_DIR}/"
chmod +x "${BUNDLE_DIR}/install.sh"
print_success "Install script copied"

# Create .env.example
print_step "Creating .env.example..."
cat > "${BUNDLE_DIR}/.env.example" << 'EOF'
# ===========================================
# DocPat Docker Production Configuration
# ===========================================
# Copy this file to .env and update values
# Or let install.sh generate it automatically

# PostgreSQL Database
POSTGRES_DB=mpms_prod
POSTGRES_USER=mpms_user
POSTGRES_PASSWORD=CHANGE_ME_generate_with_openssl_rand_base64_24

# JWT Authentication (generate with: openssl rand -base64 64)
JWT_SECRET=CHANGE_ME_generate_64_byte_secret
JWT_REFRESH_SECRET=CHANGE_ME_generate_64_byte_secret

# Data Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=CHANGE_ME_generate_32_byte_key

# Volume Paths (relative to docker-compose.yml)
DATA_DIR=./data
BACKUP_DIR=./backups

# Logging
RUST_LOG=info

# CORS (update with your domain)
CORS_ALLOWED_ORIGINS=https://localhost
EOF
print_success ".env.example created"

# Create README
print_step "Creating README..."
cat > "${BUNDLE_DIR}/README.md" << EOF
# DocPat Distribution Bundle

**Version:** $(date +%Y-%m-%d)

This bundle contains everything needed to run DocPat Medical Practice Management System.

## Quick Start

1. Extract this bundle to your server
2. Run the installer:

\`\`\`bash
cd ${BUNDLE_NAME}
./install.sh
\`\`\`

3. Access the application at https://your-server-ip/

## Requirements

- Docker Engine 24+
- Docker Compose v2.20+
- 4GB RAM minimum
- 20GB disk space

## What's Included

\`\`\`
${BUNDLE_NAME}/
├── install.sh              # Automated installer
├── docker-compose.yml      # Container orchestration
├── .env.example            # Configuration template
├── README.md               # This file
├── images/                 # Docker images
│   ├── docpat-backend-latest.tar.gz
│   ├── docpat-frontend-latest.tar.gz
│   ├── docpat-nginx-latest.tar.gz
│   └── postgres-18-alpine.tar.gz
├── infrastructure/
│   └── postgres/
│       ├── postgresql.conf
│       └── init.sql
└── backend/
    ├── casbin/             # RBAC policies
    └── migrations/         # Database schema
\`\`\`

## Manual Installation

If you prefer manual installation:

\`\`\`bash
# 1. Load Docker images
for f in images/*.tar.gz; do docker load < "\$f"; done

# 2. Create data directories
mkdir -p data/postgres backups/postgres
sudo chown -R 999:999 data/postgres backups/postgres

# 3. Create .env from template
cp .env.example .env
# Edit .env and set secure passwords/secrets

# 4. Start services
docker compose --profile with-nginx up -d

# 5. Run migrations
docker cp backend/migrations docpat-postgres:/tmp/migrations
docker compose exec postgres sh -c 'for f in /tmp/migrations/*.sql; do psql -U mpms_user -d mpms_prod -f "\$f"; done'
\`\`\`

## Support

Documentation: https://github.com/h0pes/docpat

## Security Notes

- Change default admin password immediately after first login
- The default installation uses self-signed SSL certificates
- For production, configure proper SSL certificates (see docs/DEPLOYMENT.md)
EOF
print_success "README created"

# Create the final archive
print_step "Creating final archive..."
cd "${OUTPUT_DIR}"
tar -czvf "${BUNDLE_NAME}.tar.gz" "${BUNDLE_NAME}"
print_success "Archive created: ${OUTPUT_DIR}/${BUNDLE_NAME}.tar.gz"

# Cleanup
print_step "Cleaning up..."
rm -rf "${BUNDLE_DIR}"
print_success "Temporary files removed"

# Summary
echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}  Bundle created successfully!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo "Output file: ${OUTPUT_DIR}/${BUNDLE_NAME}.tar.gz"
echo ""

# Show file size
SIZE=$(du -h "${OUTPUT_DIR}/${BUNDLE_NAME}.tar.gz" | cut -f1)
echo "Bundle size: ${SIZE}"
echo ""

echo "To distribute:"
echo "  1. Copy ${BUNDLE_NAME}.tar.gz to the target server"
echo "  2. Extract: tar -xzf ${BUNDLE_NAME}.tar.gz"
echo "  3. Run: cd ${BUNDLE_NAME} && ./install.sh"
echo ""
