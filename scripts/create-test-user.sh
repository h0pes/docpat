#!/bin/bash
#
# DocPat - Create Test User Script
#
# Creates a test user in the database for development/testing purposes.
# Supports both Docker and local PostgreSQL deployment modes.
#
# Usage:
#   ./scripts/create-test-user.sh [options]
#
# Options:
#   --docker           Force Docker mode (use docker compose exec)
#   --local            Force local mode (use psql directly)
#   --database <name>  Target database (default: auto-detect)
#   --role <role>      User role: ADMIN or DOCTOR (default: DOCTOR)
#   --help             Show this help message
#
# Default credentials:
#   Username: testdoctor
#   Email:    test@docpat.local
#   Password: Test123!
#

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Project paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Options
FORCE_MODE=""
DB_NAME=""
USER_ROLE="DOCTOR"

# User details
USERNAME="testdoctor"
EMAIL="test@docpat.local"
PASSWORD="Test123!"
FIRST_NAME="Test"
LAST_NAME="Doctor"

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    sed -n '2,22p' "$0" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --docker) FORCE_MODE="docker"; shift ;;
        --local) FORCE_MODE="local"; shift ;;
        --database) DB_NAME="$2"; shift 2 ;;
        --role) USER_ROLE="$2"; shift 2 ;;
        --help|-h) show_help ;;
        *) log_error "Unknown option: $1"; exit 1 ;;
    esac
done

# Validate role
if [[ ! "$USER_ROLE" =~ ^(ADMIN|DOCTOR)$ ]]; then
    log_error "Invalid role: $USER_ROLE (must be ADMIN or DOCTOR)"
    exit 1
fi

# Detect deployment mode
detect_mode() {
    if [ -n "$FORCE_MODE" ]; then
        echo "$FORCE_MODE"
        return
    fi

    # Check if Docker containers are running
    if docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps --format json 2>/dev/null | grep -q "docpat-postgres"; then
        echo "docker"
    elif command -v psql &>/dev/null; then
        echo "local"
    else
        log_error "Cannot detect mode: no Docker containers running and psql not found"
        exit 1
    fi
}

MODE=$(detect_mode)

# Set database name based on mode
if [ -z "$DB_NAME" ]; then
    if [ "$MODE" = "docker" ]; then
        # Read from .env or default to mpms_prod
        if [ -f "$PROJECT_ROOT/.env" ]; then
            DB_NAME=$(grep '^POSTGRES_DB=' "$PROJECT_ROOT/.env" | cut -d'=' -f2 | tr -d '"' || echo "mpms_prod")
        fi
        DB_NAME="${DB_NAME:-mpms_prod}"
    else
        DB_NAME="mpms_dev"
    fi
fi

log_info "Mode: $MODE | Database: $DB_NAME | Role: $USER_ROLE"
echo ""

# Generate Argon2 password hash at runtime
log_info "Generating password hash..."

if ! command -v python3 &>/dev/null; then
    log_error "python3 is required to generate password hashes"
    log_info "Install with: pacman -S python (Arch) or apt install python3 (Debian)"
    exit 1
fi

# Ensure argon2-cffi is available
if ! python3 -c "import argon2" 2>/dev/null; then
    log_warn "argon2-cffi not installed. Installing..."
    pip3 install argon2-cffi --quiet
fi

PASSWORD_HASH=$(python3 -c "from argon2 import PasswordHasher; ph = PasswordHasher(); print(ph.hash('''${PASSWORD}'''))")

if [ -z "$PASSWORD_HASH" ]; then
    log_error "Failed to generate password hash"
    exit 1
fi

log_success "Password hash generated"

# Build SQL via temp file (avoids SQL injection from shell interpolation)
SQL_FILE=$(mktemp)
trap 'rm -f "$SQL_FILE"' EXIT

printf "INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, is_active, mfa_enabled, created_at, updated_at)
VALUES (gen_random_uuid(), '%s', '%s', '%s', '%s', '%s', '%s', true, false, NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

SELECT id, username, email, role, is_active, mfa_enabled FROM users WHERE username = '%s';
" "$USERNAME" "$EMAIL" "$PASSWORD_HASH" "$USER_ROLE" "$FIRST_NAME" "$LAST_NAME" "$USERNAME" > "$SQL_FILE"

# Execute SQL
log_info "Creating test user..."

if [ "$MODE" = "docker" ]; then
    # Docker mode: copy SQL to container and execute
    docker cp "$SQL_FILE" docpat-postgres:/tmp/create_test_user.sql
    docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres \
        psql -U mpms_user -d "$DB_NAME" -f /tmp/create_test_user.sql
else
    # Local mode: use psql directly
    psql -U mpms_user -d "$DB_NAME" -f "$SQL_FILE"
fi

echo ""
log_success "Test user created successfully!"
echo ""
echo "Login credentials:"
echo "  Username: $USERNAME"
echo "  Email:    $EMAIL"
echo "  Password: $PASSWORD"
echo "  Role:     $USER_ROLE"
echo ""
