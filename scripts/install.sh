#!/bin/bash
# ==============================================================================
# DocPat Installation Script
# One-command installer for DocPat Medical Practice Management System
# ==============================================================================
#
# Usage:
#   ./install.sh                    # Interactive installation
#   ./install.sh --non-interactive  # Use defaults (for automation)
#
# Requirements:
#   - Docker Engine 24+
#   - Docker Compose v2.20+
#   - At least 4GB RAM, 20GB disk space
#
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Support running from both bundle root (./install.sh) and git repo (./scripts/install.sh)
if [ -f "${SCRIPT_DIR}/docker-compose.yml" ]; then
    INSTALL_DIR="${SCRIPT_DIR}"
else
    INSTALL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi
DATA_DIR="${INSTALL_DIR}/data"
BACKUP_DIR="${INSTALL_DIR}/backups"
IMAGES_DIR="${INSTALL_DIR}/images"
NON_INTERACTIVE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --non-interactive)
            NON_INTERACTIVE=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./install.sh [--non-interactive]"
            echo ""
            echo "Options:"
            echo "  --non-interactive  Use default values, no prompts"
            echo "  --help, -h         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ==============================================================================
# Helper Functions
# ==============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}==============================================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

confirm() {
    if [ "$NON_INTERACTIVE" = true ]; then
        return 0
    fi
    read -p "$1 [y/N] " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

generate_secret() {
    # Generate base64 secret and remove any newlines (openssl wraps at 76 chars)
    openssl rand -base64 "$1" 2>/dev/null | tr -d '\n' || head -c "$1" /dev/urandom | base64 | tr -d '\n'
}

generate_password() {
    # Generate URL-safe password (hex only - no special characters that break URLs)
    openssl rand -hex "$1" 2>/dev/null || head -c "$1" /dev/urandom | xxd -p | tr -d '\n'
}

# ==============================================================================
# Pre-flight Checks
# ==============================================================================

print_header "DocPat Installation"

echo "This script will install DocPat Medical Practice Management System."
echo ""
echo "Installation directory: ${INSTALL_DIR}"
echo ""

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root is not recommended. Consider using a regular user with Docker permissions."
    if ! confirm "Continue anyway?"; then
        exit 1
    fi
fi

print_step "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    echo "  Visit: https://docs.docker.com/engine/install/"
    exit 1
fi

DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
print_success "Docker installed (version ${DOCKER_VERSION})"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose v2 is not installed. Please install Docker Compose plugin."
    echo "  Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

COMPOSE_VERSION=$(docker compose version | grep -oE '[0-9]+\.[0-9]+' | head -1)
print_success "Docker Compose installed (version ${COMPOSE_VERSION})"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker."
    exit 1
fi
print_success "Docker daemon is running"

# Check for required files
print_step "Checking bundle contents..."

REQUIRED_FILES=(
    "docker-compose.yml"
    "infrastructure/postgres/postgresql.conf"
    "infrastructure/postgres/init.sql"
    "backend/casbin/policy.csv"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "${INSTALL_DIR}/${file}" ]; then
        print_error "Missing required file: ${file}"
        exit 1
    fi
done
print_success "All configuration files present"

# Check for image files
REQUIRED_IMAGES=(
    "docpat-backend-latest.tar.gz"
    "docpat-frontend-latest.tar.gz"
    "docpat-nginx-latest.tar.gz"
    "postgres-18-alpine.tar.gz"
)

for image in "${REQUIRED_IMAGES[@]}"; do
    if [ ! -f "${IMAGES_DIR}/${image}" ]; then
        print_error "Missing image file: images/${image}"
        exit 1
    fi
done
print_success "All Docker images present"

# Check ports
print_step "Checking port availability..."

check_port() {
    if command -v lsof &> /dev/null; then
        lsof -i ":$1" &> /dev/null && return 1 || return 0
    elif command -v ss &> /dev/null; then
        ss -tuln | grep -q ":$1 " && return 1 || return 0
    else
        return 0  # Can't check, assume OK
    fi
}

if ! check_port 80; then
    print_warning "Port 80 is in use. You may need to stop the conflicting service."
fi

if ! check_port 443; then
    print_warning "Port 443 is in use. You may need to stop the conflicting service."
fi

print_success "Port check complete"

# ==============================================================================
# Load Docker Images
# ==============================================================================

print_header "Loading Docker Images"

for image in "${REQUIRED_IMAGES[@]}"; do
    print_step "Loading ${image}..."
    docker load < "${IMAGES_DIR}/${image}"
    print_success "Loaded ${image}"
done

# Verify images
print_step "Verifying images..."
docker images | grep -E "docpat|postgres" || true
print_success "All images loaded"

# ==============================================================================
# Create Data Directories
# ==============================================================================

print_header "Creating Data Directories"

print_step "Creating directories..."
mkdir -p "${DATA_DIR}/postgres"
mkdir -p "${BACKUP_DIR}/postgres"
print_success "Directories created"

print_step "Setting permissions..."
# PostgreSQL container runs as UID 999
if [ "$EUID" -eq 0 ]; then
    chown -R 999:999 "${DATA_DIR}/postgres"
    chown -R 999:999 "${BACKUP_DIR}/postgres"
else
    sudo chown -R 999:999 "${DATA_DIR}/postgres"
    sudo chown -R 999:999 "${BACKUP_DIR}/postgres"
fi
print_success "Permissions set"

# ==============================================================================
# Generate Configuration
# ==============================================================================

print_header "Generating Configuration"

if [ -f "${INSTALL_DIR}/.env" ]; then
    print_warning ".env file already exists"
    if confirm "Overwrite existing .env file?"; then
        rm "${INSTALL_DIR}/.env"
    else
        print_info "Keeping existing .env file"
    fi
fi

if [ ! -f "${INSTALL_DIR}/.env" ]; then
    print_step "Generating security keys..."

    POSTGRES_PASSWORD=$(generate_password 24)
    JWT_SECRET=$(generate_secret 64)
    JWT_REFRESH_SECRET=$(generate_secret 64)
    ENCRYPTION_KEY=$(generate_secret 32)

    print_step "Creating .env file..."

    cat > "${INSTALL_DIR}/.env" << EOF
# ===========================================
# DocPat Docker Production Configuration
# Generated by install.sh on $(date)
# ===========================================

# PostgreSQL Database
POSTGRES_DB=mpms_prod
POSTGRES_USER=mpms_user
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"

# JWT Authentication
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"

# Data Encryption (AES-256)
ENCRYPTION_KEY="${ENCRYPTION_KEY}"

# Volume Paths
DATA_DIR=${DATA_DIR}
BACKUP_DIR=${BACKUP_DIR}

# Logging
RUST_LOG=debug

# CORS (update with your domain if needed)
CORS_ALLOWED_ORIGINS=https://localhost

# Argon2 password hashing parameters
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=4
EOF

    chmod 600 "${INSTALL_DIR}/.env"
    print_success ".env file created with generated secrets"
fi

# ==============================================================================
# Start Services
# ==============================================================================

print_header "Starting Services"

cd "${INSTALL_DIR}"

print_step "Starting Docker containers..."
docker compose --profile with-nginx up -d

print_step "Waiting for services to be healthy..."
sleep 10

# Wait for postgres to be ready
RETRIES=30
until docker compose exec -T postgres pg_isready -U mpms_user -d mpms_prod &> /dev/null || [ $RETRIES -eq 0 ]; do
    echo "Waiting for PostgreSQL... ($RETRIES attempts remaining)"
    RETRIES=$((RETRIES-1))
    sleep 2
done

if [ $RETRIES -eq 0 ]; then
    print_error "PostgreSQL failed to start. Check logs with: docker compose logs postgres"
    exit 1
fi

print_success "PostgreSQL is ready"

# ==============================================================================
# Run Migrations
# ==============================================================================

print_header "Running Database Migrations"

print_step "Copying migrations to container..."
docker cp "${INSTALL_DIR}/backend/migrations" docpat-postgres:/tmp/migrations

print_step "Running migrations..."
docker compose exec -T postgres sh -c 'for f in /tmp/migrations/*.sql; do echo "Running $f..."; psql -U mpms_user -d mpms_prod -f "$f" 2>&1; done'

print_success "Migrations complete"

# Disable global MFA requirement so admin can log in without being forced to set up MFA.
# The admin can re-enable this later via Settings > Security in the UI.
print_step "Disabling global MFA requirement for initial setup..."
docker compose exec -T postgres psql -U mpms_user -d mpms_prod -c \
    "UPDATE system_settings SET setting_value = 'false' WHERE setting_key = 'security.mfa_required';"
print_success "Global MFA requirement disabled (can be re-enabled in Settings > Security)"

# ==============================================================================
# Create Admin User
# ==============================================================================

print_header "Create Admin User"

if [ "$NON_INTERACTIVE" = true ]; then
    print_warning "Skipping admin user creation in non-interactive mode"
    print_info "Create admin user manually after installation"
else
    if confirm "Create an admin user now?"; then
        echo ""
        read -p "Admin username [admin]: " ADMIN_USER
        ADMIN_USER=${ADMIN_USER:-admin}

        read -p "Admin email [admin@localhost]: " ADMIN_EMAIL
        ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}

        while true; do
            read -s -p "Admin password (min 8 chars): " ADMIN_PASS
            echo ""
            if [ ${#ADMIN_PASS} -ge 8 ]; then
                break
            fi
            print_warning "Password must be at least 8 characters"
        done

        # Generate password hash using Python
        if command -v python3 &> /dev/null; then
            print_step "Generating password hash..."

            # Check if argon2 is available
            if ! python3 -c "import argon2" 2>/dev/null; then
                print_warning "argon2-cffi not installed. Installing..."
                pip3 install argon2-cffi --quiet
            fi

            # Generate hash
            HASH=$(python3 -c "from argon2 import PasswordHasher; ph = PasswordHasher(); print(ph.hash('''${ADMIN_PASS}'''))")

            print_step "Creating admin user..."

            # Write SQL to temp file using printf to avoid shell expansion of $ in hash
            SQL_FILE=$(mktemp)
            printf "INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_active, mfa_enabled, created_at, updated_at) VALUES (gen_random_uuid(), '%s', '%s', '%s', 'ADMIN', 'System', 'Administrator', true, false, NOW(), NOW()) ON CONFLICT (username) DO NOTHING;\n" "$ADMIN_USER" "$ADMIN_EMAIL" "$HASH" > "$SQL_FILE"

            # Copy SQL file to container and execute
            docker cp "$SQL_FILE" docpat-postgres:/tmp/create_admin.sql
            docker compose exec -T postgres psql -U mpms_user -d mpms_prod -f /tmp/create_admin.sql
            rm "$SQL_FILE"

            print_success "Admin user created"
        else
            print_warning "Python3 not found. Please create admin user manually."
        fi
    fi
fi

# ==============================================================================
# Verify Installation
# ==============================================================================

print_header "Verifying Installation"

print_step "Checking container status..."
docker compose --profile with-nginx ps

echo ""
print_step "Testing health endpoints..."

# Wait a bit more for everything to stabilize
sleep 5

if curl -sk https://localhost/health &> /dev/null; then
    print_success "Backend health check passed"
else
    print_warning "Backend health check failed (may still be starting)"
fi

if curl -sk https://localhost/ &> /dev/null; then
    print_success "Frontend is accessible"
else
    print_warning "Frontend check failed (may still be starting)"
fi

# ==============================================================================
# Complete
# ==============================================================================

print_header "Installation Complete!"

echo -e "${GREEN}"
echo "  DocPat has been successfully installed!"
echo ""
echo "  Access the application at:"
echo "    https://localhost/"
echo "    (or https://YOUR_SERVER_IP/)"
echo ""
echo "  Note: You will see a browser warning about the self-signed certificate."
echo "        This is normal - accept it to proceed."
echo -e "${NC}"

echo "Useful commands:"
echo "  docker compose --profile with-nginx ps      # Check status"
echo "  docker compose --profile with-nginx logs -f # View logs"
echo "  docker compose --profile with-nginx down    # Stop services"
echo "  docker compose --profile with-nginx up -d   # Start services"
echo ""

if [ ! -z "${ADMIN_USER}" ]; then
    echo "Admin login:"
    echo "  Username: ${ADMIN_USER}"
    echo "  Email: ${ADMIN_EMAIL}"
    echo ""
fi

echo "Important files:"
echo "  Configuration: ${INSTALL_DIR}/.env"
echo "  Database data: ${DATA_DIR}/postgres"
echo "  Backups: ${BACKUP_DIR}/postgres"
echo ""

print_warning "SECURITY REMINDER: Keep your admin credentials secure!"
echo ""
