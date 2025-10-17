#!/usr/bin/env bash

################################################################################
# Medical Practice Management System - Development Environment Setup
################################################################################
#
# This script automates the setup of the development environment for DocPat.
#
# Usage:
#   ./scripts/setup-dev.sh [options]
#
# Options:
#   --skip-deps        Skip dependency installation check
#   --skip-db          Skip database setup
#   --skip-docker      Skip Docker setup
#   --reset-db         Drop and recreate database (WARNING: destroys data)
#   --help             Show this help message
#
# Prerequisites:
#   - Arch Linux (tested on 6.17.1-arch1-1)
#   - Rust 1.90+
#   - Node.js 20+
#   - PostgreSQL 17+
#   - Redis 7.2+
#   - Docker and Docker Compose
#
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Script options
SKIP_DEPS=false
SKIP_DB=false
SKIP_DOCKER=false
RESET_DB=false

# Project paths
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly BACKEND_DIR="$PROJECT_ROOT/backend"
readonly FRONTEND_DIR="$PROJECT_ROOT/frontend"

################################################################################
# Helper Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

check_version() {
    local cmd=$1
    local min_version=$2
    local current_version=$($cmd)
    log_info "$cmd version: $current_version (minimum: $min_version)"
}

show_help() {
    sed -n '2,21p' "$0" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

################################################################################
# Parse Command Line Arguments
################################################################################

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --skip-docker)
                SKIP_DOCKER=true
                shift
                ;;
            --reset-db)
                RESET_DB=true
                shift
                ;;
            --help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
}

################################################################################
# Dependency Checks
################################################################################

check_dependencies() {
    if $SKIP_DEPS; then
        log_warn "Skipping dependency checks (--skip-deps flag)"
        return 0
    fi

    log_info "Checking required dependencies..."

    local missing_deps=()

    # Check Rust
    if command_exists rustc; then
        check_version "rustc --version" "1.90"
        check_version "cargo --version" "1.90"
    else
        missing_deps+=("Rust 1.90+")
    fi

    # Check Node.js
    if command_exists node; then
        check_version "node --version" "20.0"
        check_version "npm --version" "10.0"
    else
        missing_deps+=("Node.js 20+")
    fi

    # Check PostgreSQL
    if command_exists psql; then
        check_version "psql --version" "17.0"
    else
        missing_deps+=("PostgreSQL 17+")
    fi

    # Check Redis
    if command_exists redis-cli; then
        check_version "redis-cli --version" "7.2"
    else
        missing_deps+=("Redis 7.2+")
    fi

    # Check Docker
    if command_exists docker; then
        check_version "docker --version" "20.0"
        check_version "docker compose version" "2.0"
    else
        missing_deps+=("Docker & Docker Compose")
    fi

    # Check cargo tools
    if ! command_exists cargo-watch; then
        missing_deps+=("cargo-watch")
    fi

    if ! command_exists sqlx; then
        missing_deps+=("sqlx-cli")
    fi

    # Report missing dependencies
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        log_info "Please install missing dependencies and run this script again."
        log_info "See docs/PLANNING.md for installation instructions."
        exit 1
    fi

    log_success "All required dependencies are installed"
}

################################################################################
# Environment File Setup
################################################################################

setup_env_files() {
    log_info "Setting up environment files..."

    # Backend .env
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        if [ -f "$BACKEND_DIR/.env.example" ]; then
            cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
            log_success "Created backend/.env from .env.example"
            log_warn "Please update backend/.env with your configuration (database password, secrets, etc.)"
        else
            log_error "backend/.env.example not found"
            exit 1
        fi
    else
        log_info "backend/.env already exists"
    fi

    # Frontend .env
    if [ ! -f "$FRONTEND_DIR/.env" ]; then
        if [ -f "$FRONTEND_DIR/.env.example" ]; then
            cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
            log_success "Created frontend/.env from .env.example"
        else
            log_error "frontend/.env.example not found"
            exit 1
        fi
    else
        log_info "frontend/.env already exists"
    fi

    # Root .env for Docker Compose
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            log_success "Created .env from .env.example"
            log_warn "Please update .env with secure secrets for Docker Compose"
        fi
    else
        log_info ".env already exists"
    fi
}

################################################################################
# PostgreSQL Setup
################################################################################

setup_postgresql() {
    if $SKIP_DB; then
        log_warn "Skipping database setup (--skip-db flag)"
        return 0
    fi

    log_info "Setting up PostgreSQL database..."

    # Check if PostgreSQL is running
    if ! sudo systemctl is-active --quiet postgresql; then
        log_info "Starting PostgreSQL service..."
        sudo systemctl start postgresql
        sleep 2
    fi

    # Load database configuration from .env
    if [ -f "$BACKEND_DIR/.env" ]; then
        # Extract database connection details
        DB_NAME=$(grep '^DATABASE_URL=' "$BACKEND_DIR/.env" | cut -d'/' -f4 | cut -d'?' -f1 || echo "mpms_dev")
        DB_USER=$(grep '^DATABASE_URL=' "$BACKEND_DIR/.env" | cut -d':' -f2 | cut -d'/' -f3 || echo "mpms_user")
    else
        DB_NAME="mpms_dev"
        DB_USER="mpms_user"
    fi

    # Drop database if --reset-db flag is set
    if $RESET_DB; then
        log_warn "Resetting database (--reset-db flag)"
        read -p "Are you sure you want to drop and recreate the database? This will destroy all data! (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
            log_info "Dropped database: $DB_NAME"
        else
            log_info "Database reset cancelled"
            return 0
        fi
    fi

    # Create database user if it doesn't exist
    if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
        log_info "Creating database user: $DB_USER"
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD 'dev_password_change_in_production';"
        log_success "Created database user: $DB_USER"
    else
        log_info "Database user already exists: $DB_USER"
    fi

    # Create database if it doesn't exist
    if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log_info "Creating database: $DB_NAME"
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
        log_success "Created database: $DB_NAME"
    else
        log_info "Database already exists: $DB_NAME"
    fi

    # Enable required extensions
    log_info "Enabling PostgreSQL extensions..."
    sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" >/dev/null
    sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" >/dev/null
    sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS btree_gist;" >/dev/null
    sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" >/dev/null
    log_success "PostgreSQL extensions enabled"

    # Run migrations
    log_info "Running database migrations..."
    cd "$BACKEND_DIR"
    if sqlx migrate run; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        exit 1
    fi
    cd "$PROJECT_ROOT"
}

################################################################################
# Redis Setup
################################################################################

setup_redis() {
    if $SKIP_DB; then
        log_warn "Skipping Redis setup (--skip-db flag)"
        return 0
    fi

    log_info "Setting up Redis..."

    # Check if Redis is running
    if ! sudo systemctl is-active --quiet redis; then
        log_info "Starting Redis service..."
        sudo systemctl start redis
        sleep 1
    fi

    # Test Redis connection
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Redis is running and accessible"
    else
        log_error "Redis is not accessible"
        exit 1
    fi
}

################################################################################
# Backend Setup
################################################################################

setup_backend() {
    log_info "Setting up Rust backend..."

    cd "$BACKEND_DIR"

    # Install dependencies
    log_info "Building backend dependencies (this may take a while on first run)..."
    if cargo build; then
        log_success "Backend dependencies installed"
    else
        log_error "Backend build failed"
        exit 1
    fi

    # Run tests
    log_info "Running backend tests..."
    if cargo test --quiet; then
        log_success "Backend tests passed"
    else
        log_warn "Some backend tests failed"
    fi

    cd "$PROJECT_ROOT"
}

################################################################################
# Frontend Setup
################################################################################

setup_frontend() {
    log_info "Setting up React frontend..."

    cd "$FRONTEND_DIR"

    # Install dependencies
    log_info "Installing frontend dependencies (this may take a while)..."
    if npm install --legacy-peer-deps; then
        log_success "Frontend dependencies installed"
    else
        log_error "Frontend dependency installation failed"
        exit 1
    fi

    # Run linter
    log_info "Running frontend linter..."
    if npm run lint; then
        log_success "Frontend linting passed"
    else
        log_warn "Frontend has linting issues"
    fi

    cd "$PROJECT_ROOT"
}

################################################################################
# Docker Setup
################################################################################

setup_docker() {
    if $SKIP_DOCKER; then
        log_warn "Skipping Docker setup (--skip-docker flag)"
        return 0
    fi

    log_info "Setting up Docker environment..."

    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        log_info "Start Docker with: sudo systemctl start docker"
        exit 1
    fi

    # Check if user is in docker group
    if ! groups | grep -q docker; then
        log_warn "Current user is not in the 'docker' group"
        log_info "Add user to docker group: sudo usermod -aG docker \$USER"
        log_info "Then log out and log back in"
    fi

    # Build development images (optional, can be done later)
    read -p "Do you want to build Docker development images now? (yes/no): " build_docker
    if [ "$build_docker" = "yes" ]; then
        log_info "Building Docker development images..."
        if docker compose -f docker-compose.dev.yml build; then
            log_success "Docker images built successfully"
        else
            log_error "Docker image build failed"
            exit 1
        fi
    else
        log_info "Skipping Docker image build (you can build later with: docker compose -f docker-compose.dev.yml build)"
    fi
}

################################################################################
# Summary and Next Steps
################################################################################

show_summary() {
    echo ""
    echo "=========================================="
    log_success "Development environment setup complete!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Review and update configuration files:"
    echo "   - backend/.env  (database credentials, JWT secrets)"
    echo "   - frontend/.env (API URL)"
    echo "   - .env          (Docker Compose secrets)"
    echo ""
    echo "2. Start the development servers:"
    echo ""
    echo "   Terminal 1 - Backend:"
    echo "   $ cd backend"
    echo "   $ cargo watch -x run"
    echo ""
    echo "   Terminal 2 - Frontend:"
    echo "   $ cd frontend"
    echo "   $ npm run dev"
    echo ""
    echo "   OR use Docker Compose:"
    echo "   $ docker compose -f docker-compose.dev.yml up"
    echo ""
    echo "3. Access the application:"
    echo "   - Frontend: http://localhost:5173"
    echo "   - Backend:  http://localhost:8000"
    echo "   - API Docs: http://localhost:8000/api/health"
    echo ""
    echo "4. Run tests:"
    echo "   - Backend:  cd backend && cargo test"
    echo "   - Frontend: cd frontend && npm test"
    echo ""
    echo "For more information, see docs/PLANNING.md"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    echo "=========================================="
    echo "DocPat Development Environment Setup"
    echo "=========================================="
    echo ""

    parse_args "$@"

    check_dependencies
    setup_env_files
    setup_postgresql
    setup_redis
    setup_backend
    setup_frontend
    setup_docker

    show_summary
}

# Run main function with all arguments
main "$@"
