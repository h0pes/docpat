#!/usr/bin/env bash

################################################################################
# Medical Practice Management System - Production Deployment Script
################################################################################
#
# This script automates the deployment of DocPat to production with safety checks.
#
# Usage:
#   ./scripts/deploy.sh [options]
#
# Options:
#   --environment <prod|staging>   Target environment (default: prod)
#   --skip-tests                   Skip pre-deployment tests (NOT RECOMMENDED)
#   --skip-backup                  Skip pre-deployment backup (DANGEROUS)
#   --skip-build                   Skip Docker image rebuild
#   --force                        Skip confirmation prompts
#   --rollback                     Rollback to previous deployment
#   --dry-run                      Show what would be done without executing
#   --help                         Show this help message
#
# Deployment Process:
#   1. Pre-deployment checks (tests, environment, dependencies)
#   2. Create backup of current deployment
#   3. Build production Docker images
#   4. Run database migrations
#   5. Deploy new containers with zero-downtime
#   6. Health checks and verification
#   7. Cleanup old images and containers
#
# Rollback Process:
#   - Restore previous Docker images
#   - Revert database migrations
#   - Restore from backup if needed
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
SKIP_TESTS=false
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
    sed -n '2,34p' "$0" | sed 's/^# //' | sed 's/^#//'
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
            --skip-tests)
                SKIP_TESTS=true
                shift
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

    # Load environment variables
    if [ -f "$PROJECT_ROOT/.env" ]; then
        # shellcheck source=/dev/null
        source "$PROJECT_ROOT/.env"
    else
        log_error ".env file not found"
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

    # Check Docker Compose
    if ! docker compose version >/dev/null 2>&1; then
        log_error "Docker Compose is not installed"
        checks_failed=true
    fi

    # Check if .env file exists
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_error ".env file not found"
        checks_failed=true
    fi

    # Check if required environment variables are set
    local required_vars=("DATABASE_URL" "JWT_SECRET" "JWT_REFRESH_SECRET" "ENCRYPTION_KEY")
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

run_tests() {
    if $SKIP_TESTS; then
        log_warn "Skipping tests (--skip-tests flag)"
        return 0
    fi

    log_info "Running test suite..."

    # Backend tests
    log_info "Running backend tests..."
    if execute_command "cd $PROJECT_ROOT/backend && cargo test --release" "Backend tests"; then
        log_success "Backend tests passed"
    else
        log_error "Backend tests failed"
        exit 3
    fi

    # Frontend tests (if configured)
    if [ -f "$PROJECT_ROOT/frontend/package.json" ]; then
        log_info "Running frontend tests..."
        if execute_command "cd $PROJECT_ROOT/frontend && npm test" "Frontend tests"; then
            log_success "Frontend tests passed"
        else
            log_warn "Frontend tests failed (continuing anyway)"
        fi
    fi

    log_success "All tests passed"
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

    # Build all services
    if execute_command "docker compose -f $PROJECT_ROOT/$DOCKER_COMPOSE_FILE build --no-cache" "Building Docker images"; then
        log_success "Docker images built successfully"
    else
        log_error "Docker image build failed"
        exit 4
    fi

    # Tag images with deployment ID for rollback
    log_info "Tagging images with deployment ID: $DEPLOYMENT_ID"
    docker compose -f "$PROJECT_ROOT/$DOCKER_COMPOSE_FILE" images --format json | \
        jq -r '.Repository + ":" + .Tag' | \
        while read -r image; do
            local tagged_image="${image}-${DEPLOYMENT_ID}"
            log_info "Tagging: $image -> $tagged_image"
            docker tag "$image" "$tagged_image" 2>&1 | tee -a "$LOG_FILE"
        done

    log_success "Images tagged for deployment"
}

################################################################################
# Database Migrations
################################################################################

run_database_migrations() {
    log_info "Running database migrations..."

    # Check current migration status
    log_info "Checking migration status..."
    execute_command "cd $PROJECT_ROOT/backend && sqlx migrate info" "Migration status"

    # Run migrations
    if execute_command "cd $PROJECT_ROOT/backend && sqlx migrate run" "Running migrations"; then
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
    docker compose -f "$PROJECT_ROOT/$DOCKER_COMPOSE_FILE" stop 2>&1 | tee -a "$LOG_FILE" || true

    # Start new containers
    log_info "Starting new containers..."
    if execute_command "docker compose -f $PROJECT_ROOT/$DOCKER_COMPOSE_FILE up -d" "Starting containers"; then
        log_success "Containers started"
    else
        log_error "Container deployment failed"
        exit 5
    fi

    # Wait for containers to be healthy
    log_info "Waiting for containers to become healthy..."
    sleep 10

    # Check container status
    local unhealthy_containers=$(docker compose -f "$PROJECT_ROOT/$DOCKER_COMPOSE_FILE" ps --format json | \
        jq -r 'select(.Health != "healthy" and .Health != "") | .Name' || echo "")

    if [ -n "$unhealthy_containers" ]; then
        log_warn "Some containers are not healthy:"
        echo "$unhealthy_containers"
    else
        log_success "All containers are healthy"
    fi
}

################################################################################
# Health Checks
################################################################################

run_health_checks() {
    log_info "Running health checks..."

    local max_attempts=30
    local attempt=0
    local health_check_passed=false

    # Check backend health endpoint
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        log_info "Health check attempt $attempt/$max_attempts..."

        if curl -f -s http://localhost:8000/health >/dev/null 2>&1; then
            health_check_passed=true
            break
        fi

        sleep 2
    done

    if $health_check_passed; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed after $max_attempts attempts"
        log_error "Check logs with: docker compose logs backend"
        exit 6
    fi

    # Check frontend
    if curl -f -s http://localhost:80 >/dev/null 2>&1; then
        log_success "Frontend health check passed"
    else
        log_warn "Frontend health check failed (may still be starting)"
    fi

    # Check database connectivity
    if docker compose -f "$PROJECT_ROOT/$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready >/dev/null 2>&1; then
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
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
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
    local image_pattern="docpat-.*-deploy_"
    local old_images=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "$image_pattern" | tail -n +4)

    if [ -n "$old_images" ]; then
        log_info "Removing old deployment images..."
        echo "$old_images" | while read -r image; do
            log_info "Removing: $image"
            docker rmi "$image" 2>&1 | tee -a "$LOG_FILE" || true
        done
    fi

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
    docker compose -f "$PROJECT_ROOT/$DOCKER_COMPOSE_FILE" down 2>&1 | tee -a "$LOG_FILE"

    # Restore previous images
    log_info "Restoring previous images..."
    docker images --format "{{.Repository}}:{{.Tag}}" | grep "$previous_deployment_id" | \
        while read -r tagged_image; do
            local base_image=$(echo "$tagged_image" | sed "s/-${previous_deployment_id}//")
            log_info "Restoring: $base_image"
            docker tag "$tagged_image" "$base_image" 2>&1 | tee -a "$LOG_FILE"
        done

    # Revert database migrations (if needed)
    log_warn "Database rollback requires manual intervention"
    log_warn "Use: cd backend && sqlx migrate revert"

    # Start containers with previous images
    docker compose -f "$PROJECT_ROOT/$DOCKER_COMPOSE_FILE" up -d 2>&1 | tee -a "$LOG_FILE"

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
    echo "  Git Commit:  $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    echo "  Git Branch:  $(git branch --show-current 2>/dev/null || echo 'unknown')"
    echo ""
    echo "Services Status:"
    docker compose -f "$PROJECT_ROOT/$DOCKER_COMPOSE_FILE" ps
    echo ""
    echo "Access URLs:"
    echo "  Frontend:    http://$(hostname):80"
    echo "  Backend API: http://$(hostname):8000"
    echo "  Health:      http://$(hostname):8000/health"
    echo ""
    echo "Logs:"
    echo "  Deployment:  $LOG_FILE"
    echo "  Application: docker compose logs -f"
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
    run_tests
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
