#!/usr/bin/env bash

################################################################################
# Medical Practice Management System - Production Deployment Script
################################################################################
#
# This script automates the deployment of DocPat to production with safety checks.
# Targets the Docker Compose architecture with nginx reverse proxy.
#
# Usage:
#   ./scripts/deploy.sh [options]
#
# Options:
#   --environment <prod|staging>   Target environment (default: prod)
#   --skip-backup                  Skip pre-deployment backup (DANGEROUS)
#   --skip-build                   Skip Docker image rebuild
#   --force                        Skip confirmation prompts
#   --rollback                     Rollback to previous deployment
#   --dry-run                      Show what would be done without executing
#   --help                         Show this help message
#
# Deployment Process:
#   1. Pre-deployment checks (environment, dependencies)
#   2. Create backup of current deployment
#   3. Build production Docker images
#   4. Run database migrations (via Docker)
#   5. Deploy new containers with nginx profile
#   6. Health checks and verification
#   7. Cleanup old images and containers
#
# Rollback Process:
#   - Restore previous Docker images
#   - Restart containers
#   - Database rollback requires manual intervention
#
# Exit Codes:
#   0 - Success
#   1 - General error
#   2 - Configuration error
#   3 - Pre-deployment checks failed
#   4 - Build failed
#   5 - Deployment failed
#   6 - Health check failed
#   7 - Rollback failed
#
################################################################################

set -e
set -u
set -o pipefail

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Script options
ENVIRONMENT="prod"
SKIP_BACKUP=false
SKIP_BUILD=false
FORCE=false
ROLLBACK=false
DRY_RUN=false

# Project paths
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Deployment configuration
readonly TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
readonly DEPLOYMENT_ID="deploy_${TIMESTAMP}"
readonly DOCKER_COMPOSE_FILE="docker-compose.yml"

# Docker compose command with nginx profile (required for production)
DC="docker compose -f $PROJECT_ROOT/$DOCKER_COMPOSE_FILE --profile with-nginx"

# Log configuration
readonly LOG_DIR="$PROJECT_ROOT/logs"
readonly LOG_FILE="$LOG_DIR/deployment_${TIMESTAMP}.log"

# Deployment state tracking
readonly STATE_DIR="$PROJECT_ROOT/.deployment"
readonly CURRENT_DEPLOYMENT_FILE="$STATE_DIR/current"
readonly PREVIOUS_DEPLOYMENT_FILE="$STATE_DIR/previous"

################################################################################
# Helper Functions
################################################################################

log_info() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $1"
    echo -e "${BLUE}$msg${NC}"
    echo "$msg" >> "$LOG_FILE"
}

log_success() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS] $1"
    echo -e "${GREEN}$msg${NC}"
    echo "$msg" >> "$LOG_FILE"
}

log_warn() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [WARN] $1"
    echo -e "${YELLOW}$msg${NC}"
    echo "$msg" >> "$LOG_FILE"
}

log_error() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $1"
    echo -e "${RED}$msg${NC}"
    echo "$msg" >> "$LOG_FILE"
}

show_help() {
    sed -n '2,38p' "$0" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

execute_command() {
    local cmd="$1"
    local description="$2"

    if $DRY_RUN; then
        log_info "[DRY-RUN] Would execute: $cmd"
        return 0
    fi

    log_info "$description"
    if eval "$cmd" 2>&1 | tee -a "$LOG_FILE"; then
        return 0
    else
        return 1
    fi
}

################################################################################
# Parse Command Line Arguments
################################################################################

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
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

    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(prod|staging)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT (must be prod or staging)"
        exit 2
    fi
}

################################################################################
# Setup
################################################################################

setup_deployment() {
    log_info "Setting up deployment environment..."

    # Create log directory
    mkdir -p "$LOG_DIR"
    chmod 750 "$LOG_DIR"

    # Create state directory
    mkdir -p "$STATE_DIR"
    chmod 700 "$STATE_DIR"

    # Load environment variables (set -a exports them for docker compose)
    if [ -f "$PROJECT_ROOT/.env" ]; then
        set -a
        # shellcheck source=/dev/null
        source "$PROJECT_ROOT/.env"
        set +a
    else
        log_error ".env file not found at $PROJECT_ROOT/.env"
        exit 2
    fi

    log_success "Deployment setup complete"
}

################################################################################
# Pre-Deployment Checks
################################################################################

check_prerequisites() {
    log_info "Running pre-deployment checks..."

    local checks_failed=false

    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        checks_failed=true
    fi

    # Check Docker Compose v2
    if ! docker compose version >/dev/null 2>&1; then
        log_error "Docker Compose v2 is not installed"
        checks_failed=true
    fi

    # Check if .env file exists
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_error ".env file not found"
        checks_failed=true
    fi

    # Check required environment variables (Docker constructs DATABASE_URL internally)
    local required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "JWT_REFRESH_SECRET" "ENCRYPTION_KEY")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "Required environment variable not set: $var"
            checks_failed=true
        fi
    done

    # Check if docker-compose.yml exists
    if [ ! -f "$PROJECT_ROOT/$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        checks_failed=true
    fi

    if $checks_failed; then
        log_error "Pre-deployment checks failed"
        exit 3
    fi

    log_success "Pre-deployment checks passed"
}

################################################################################
# Backup Current Deployment
################################################################################

backup_current_deployment() {
    if $SKIP_BACKUP; then
        log_warn "Skipping pre-deployment backup (--skip-backup flag) - DANGEROUS"
        return 0
    fi

    log_info "Creating pre-deployment backup..."

    if [ -f "$SCRIPT_DIR/backup.sh" ]; then
        if execute_command "$SCRIPT_DIR/backup.sh --type daily --verify" "Pre-deployment backup"; then
            log_success "Pre-deployment backup created"
        else
            log_error "Pre-deployment backup failed"
            exit 3
        fi
    else
        log_warn "Backup script not found, skipping backup"
    fi
}

################################################################################
# Build Production Images
################################################################################

build_production_images() {
    if $SKIP_BUILD; then
        log_warn "Skipping Docker image rebuild (--skip-build flag)"
        return 0
    fi

    log_info "Building production Docker images..."

    # Build all services (including nginx profile)
    if execute_command "$DC build --no-cache" "Building Docker images"; then
        log_success "Docker images built successfully"
    else
        log_error "Docker image build failed"
        exit 4
    fi

    # Tag images with deployment ID for rollback
    log_info "Tagging images with deployment ID: $DEPLOYMENT_ID"
    local images=("docpat-backend" "docpat-frontend" "docpat-nginx")
    for img in "${images[@]}"; do
        if docker image inspect "${img}:latest" &>/dev/null; then
            docker tag "${img}:latest" "${img}:${DEPLOYMENT_ID}" 2>&1 | tee -a "$LOG_FILE"
            log_info "Tagged: ${img}:latest -> ${img}:${DEPLOYMENT_ID}"
        fi
    done

    log_success "Images tagged for deployment"
}

################################################################################
# Database Migrations
################################################################################

run_database_migrations() {
    log_info "Running database migrations..."

    # Ensure postgres container is running
    if ! $DC ps postgres --format json 2>/dev/null | grep -q "running"; then
        log_info "Starting postgres container for migrations..."
        $DC up -d postgres
        sleep 5

        # Wait for postgres to be ready
        local retries=30
        until $DC exec -T postgres pg_isready -U "${POSTGRES_USER:-mpms_user}" -d "${POSTGRES_DB:-mpms_prod}" &>/dev/null || [ $retries -eq 0 ]; do
            log_info "Waiting for PostgreSQL... ($retries attempts remaining)"
            retries=$((retries - 1))
            sleep 2
        done

        if [ $retries -eq 0 ]; then
            log_error "PostgreSQL failed to start"
            exit 5
        fi
    fi

    # Copy migrations to postgres container and run them
    log_info "Copying migrations to container..."
    docker cp "$PROJECT_ROOT/backend/migrations" docpat-postgres:/tmp/migrations

    log_info "Applying migrations..."
    if $DC exec -T postgres sh -c \
        'for f in /tmp/migrations/*.sql; do echo "Running $f..."; psql -U '"${POSTGRES_USER:-mpms_user}"' -d '"${POSTGRES_DB:-mpms_prod}"' -f "$f" 2>&1; done'; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        log_error "Database may be in an inconsistent state - manual intervention required"
        exit 5
    fi
}

################################################################################
# Deploy Containers
################################################################################

deploy_containers() {
    log_info "Deploying containers..."

    # Stop old containers gracefully
    log_info "Stopping old containers..."
    $DC stop 2>&1 | tee -a "$LOG_FILE" || true

    # Start new containers (with nginx profile for production)
    log_info "Starting new containers..."
    if execute_command "$DC up -d" "Starting containers"; then
        log_success "Containers started"
    else
        log_error "Container deployment failed"
        exit 5
    fi

    # Wait for containers to become healthy
    log_info "Waiting for containers to become healthy..."
    sleep 10

    # Check container status
    log_info "Container status:"
    $DC ps 2>&1 | tee -a "$LOG_FILE"
}

################################################################################
# Health Checks
################################################################################

run_health_checks() {
    log_info "Running health checks..."

    local max_attempts=30
    local attempt=0
    local health_check_passed=false

    # Check backend health via nginx (HTTPS)
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        log_info "Health check attempt $attempt/$max_attempts..."

        if curl -fsk https://localhost/health >/dev/null 2>&1; then
            health_check_passed=true
            break
        fi

        sleep 2
    done

    if $health_check_passed; then
        log_success "Backend health check passed (via nginx)"
    else
        log_error "Backend health check failed after $max_attempts attempts"
        log_error "Check logs with: $DC logs backend"
        exit 6
    fi

    # Check frontend via nginx
    if curl -fsk https://localhost/ >/dev/null 2>&1; then
        log_success "Frontend health check passed"
    else
        log_warn "Frontend health check failed (may still be starting)"
    fi

    # Check database connectivity
    if $DC exec -T postgres pg_isready >/dev/null 2>&1; then
        log_success "Database health check passed"
    else
        log_error "Database health check failed"
        exit 6
    fi

    log_success "All health checks passed"
}

################################################################################
# Save Deployment State
################################################################################

save_deployment_state() {
    log_info "Saving deployment state..."

    # Save previous deployment
    if [ -f "$CURRENT_DEPLOYMENT_FILE" ]; then
        cp "$CURRENT_DEPLOYMENT_FILE" "$PREVIOUS_DEPLOYMENT_FILE"
    fi

    # Save current deployment
    cat > "$CURRENT_DEPLOYMENT_FILE" <<EOF
DEPLOYMENT_ID=$DEPLOYMENT_ID
TIMESTAMP=$TIMESTAMP
ENVIRONMENT=$ENVIRONMENT
DOCKER_COMPOSE_FILE=$DOCKER_COMPOSE_FILE
GIT_COMMIT=$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || echo "unknown")
EOF

    log_success "Deployment state saved"
}

################################################################################
# Cleanup
################################################################################

cleanup_old_images() {
    log_info "Cleaning up old Docker images..."

    # Remove dangling images
    docker image prune -f 2>&1 | tee -a "$LOG_FILE"

    # Remove old deployment images (keep last 3)
    for img in docpat-backend docpat-frontend docpat-nginx; do
        local old_tags
        old_tags=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "^${img}:deploy_" | tail -n +4)
        if [ -n "$old_tags" ]; then
            log_info "Removing old $img deployment tags..."
            echo "$old_tags" | while read -r tag; do
                docker rmi "$tag" 2>&1 | tee -a "$LOG_FILE" || true
            done
        fi
    done

    log_success "Cleanup complete"
}

################################################################################
# Rollback
################################################################################

perform_rollback() {
    log_warn "=== STARTING ROLLBACK ==="

    if [ ! -f "$PREVIOUS_DEPLOYMENT_FILE" ]; then
        log_error "No previous deployment found - cannot rollback"
        exit 7
    fi

    # Load previous deployment info
    # shellcheck source=/dev/null
    source "$PREVIOUS_DEPLOYMENT_FILE"
    local previous_deployment_id="$DEPLOYMENT_ID"

    log_info "Rolling back to deployment: $previous_deployment_id"

    # Stop current containers
    log_info "Stopping current containers..."
    $DC down 2>&1 | tee -a "$LOG_FILE"

    # Restore previous images
    log_info "Restoring previous images..."
    for img in docpat-backend docpat-frontend docpat-nginx; do
        local tagged="${img}:${previous_deployment_id}"
        if docker image inspect "$tagged" &>/dev/null; then
            docker tag "$tagged" "${img}:latest" 2>&1 | tee -a "$LOG_FILE"
            log_info "Restored: ${img}:latest from $tagged"
        else
            log_warn "Previous image not found: $tagged"
        fi
    done

    # Revert database migrations (requires manual intervention)
    log_warn "Database rollback requires manual intervention"
    log_warn "Inspect the migrations directory and revert manually if needed"

    # Start containers with previous images
    $DC up -d 2>&1 | tee -a "$LOG_FILE"

    log_success "Rollback complete"
    log_warn "Remember to manually revert database migrations if needed"
}

################################################################################
# Deployment Summary
################################################################################

show_deployment_summary() {
    echo ""
    echo "=========================================="
    log_success "Deployment Complete!"
    echo "=========================================="
    echo ""
    echo "Deployment Details:"
    echo "  ID:          $DEPLOYMENT_ID"
    echo "  Environment: $ENVIRONMENT"
    echo "  Timestamp:   $(date +'%Y-%m-%d %H:%M:%S')"
    echo "  Git Commit:  $(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    echo "  Git Branch:  $(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || echo 'unknown')"
    echo ""
    echo "Services Status:"
    $DC ps
    echo ""
    echo "Access URLs:"
    echo "  Application: https://$(hostname)"
    echo "  Health:      https://$(hostname)/health"
    echo ""
    echo "Logs:"
    echo "  Deployment:  $LOG_FILE"
    echo "  Application: docker compose --profile with-nginx logs -f"
    echo ""
    echo "Rollback:"
    echo "  ./scripts/deploy.sh --rollback"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    echo "=========================================="
    echo "DocPat Production Deployment"
    echo "=========================================="
    echo ""

    parse_args "$@"
    setup_deployment

    # Handle rollback
    if $ROLLBACK; then
        perform_rollback
        exit 0
    fi

    # Show dry-run notice
    if $DRY_RUN; then
        log_warn "DRY-RUN MODE - No changes will be made"
        echo ""
    fi

    # Confirmation prompt
    if ! $FORCE && ! $DRY_RUN; then
        echo "You are about to deploy to: $ENVIRONMENT"
        read -p "Continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
        echo ""
    fi

    # Deployment steps
    log_info "Starting deployment to $ENVIRONMENT..."

    check_prerequisites
    backup_current_deployment
    build_production_images
    run_database_migrations
    deploy_containers
    run_health_checks
    save_deployment_state
    cleanup_old_images

    show_deployment_summary

    log_success "Deployment completed successfully!"

    exit 0
}

main "$@"
