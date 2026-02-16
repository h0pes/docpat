#!/usr/bin/env bash

################################################################################
# Medical Practice Management System - Automated Backup Script
################################################################################
#
# This script creates backups of the DocPat database and files.
# Supports both Docker and local PostgreSQL deployment modes.
# Complies with HIPAA requirements for data protection and retention.
#
# Usage:
#   ./scripts/backup.sh [options]
#
# Options:
#   --type <daily|monthly|yearly>  Backup type (default: daily)
#   --db-only                      Backup only the database
#   --files-only                   Backup only files
#   --no-encrypt                   Skip GPG encryption
#   --verify                       Verify backup after creation
#   --docker                       Force Docker mode
#   --local                        Force local mode
#   --config <path>                Use custom backup configuration file
#   --help                         Show this help message
#
# Environment Variables:
#   BACKUP_DIR                     Base directory for backups (default: /var/backups/docpat)
#   GPG_RECIPIENT                  GPG key ID or email for encryption (optional)
#   RETENTION_DAILY                Number of daily backups to keep (default: 30)
#   RETENTION_MONTHLY              Number of monthly backups to keep (default: 12)
#   RETENTION_YEARLY               Number of yearly backups to keep (default: 7)
#
# Retention Policy (HIPAA Compliant):
#   - Daily backups:   30 days
#   - Monthly backups: 12 months
#   - Yearly backups:  7 years (HIPAA minimum for medical records)
#
# Exit Codes:
#   0 - Success
#   1 - General error
#   2 - Configuration error
#   3 - Backup creation failed
#   4 - Encryption failed
#   5 - Verification failed
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
BACKUP_TYPE="daily"
DB_ONLY=false
FILES_ONLY=false
NO_ENCRYPT=false
VERIFY_BACKUP=false
FORCE_MODE=""
CONFIG_FILE=""

# Project paths
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/docpat}"
RETENTION_DAILY="${RETENTION_DAILY:-30}"
RETENTION_MONTHLY="${RETENTION_MONTHLY:-12}"
RETENTION_YEARLY="${RETENTION_YEARLY:-7}"
GPG_RECIPIENT="${GPG_RECIPIENT:-}"

# Backup metadata
readonly TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
readonly DATE_DAILY=$(date +"%Y-%m-%d")

# Log file
readonly LOG_DIR="$BACKUP_DIR/logs"
LOG_FILE=""  # Set in setup_directories after mkdir

# Deployment mode and DB credentials (set during load_configuration)
DEPLOY_MODE=""
DB_HOST=""
DB_PORT=""
DB_NAME=""
DB_USER=""
DB_PASS=""

################################################################################
# Helper Functions
################################################################################

log_info() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $1"
    echo -e "${BLUE}$msg${NC}"
    [ -n "$LOG_FILE" ] && echo "$msg" >> "$LOG_FILE"
}

log_success() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS] $1"
    echo -e "${GREEN}$msg${NC}"
    [ -n "$LOG_FILE" ] && echo "$msg" >> "$LOG_FILE"
}

log_warn() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [WARN] $1"
    echo -e "${YELLOW}$msg${NC}"
    [ -n "$LOG_FILE" ] && echo "$msg" >> "$LOG_FILE"
}

log_error() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $1"
    echo -e "${RED}$msg${NC}"
    [ -n "$LOG_FILE" ] && echo "$msg" >> "$LOG_FILE"
}

show_help() {
    sed -n '2,38p' "$0" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

################################################################################
# Parse Command Line Arguments
################################################################################

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                BACKUP_TYPE="$2"
                shift 2
                ;;
            --db-only)
                DB_ONLY=true
                shift
                ;;
            --files-only)
                FILES_ONLY=true
                shift
                ;;
            --no-encrypt)
                NO_ENCRYPT=true
                shift
                ;;
            --verify)
                VERIFY_BACKUP=true
                shift
                ;;
            --docker)
                FORCE_MODE="docker"
                shift
                ;;
            --local)
                FORCE_MODE="local"
                shift
                ;;
            --config)
                CONFIG_FILE="$2"
                shift 2
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

    # Validate backup type
    if [[ ! "$BACKUP_TYPE" =~ ^(daily|monthly|yearly)$ ]]; then
        log_error "Invalid backup type: $BACKUP_TYPE (must be daily, monthly, or yearly)"
        exit 2
    fi
}

################################################################################
# Detect Deployment Mode
################################################################################

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
        exit 2
    fi
}

################################################################################
# Configuration
################################################################################

load_configuration() {
    log_info "Loading backup configuration..."

    # Load custom config if specified
    if [ -n "$CONFIG_FILE" ] && [ -f "$CONFIG_FILE" ]; then
        log_info "Loading config from: $CONFIG_FILE"
        # shellcheck source=/dev/null
        source "$CONFIG_FILE"
    fi

    # Detect deployment mode
    DEPLOY_MODE=$(detect_mode)
    log_info "Deployment mode: $DEPLOY_MODE"

    if [ "$DEPLOY_MODE" = "docker" ]; then
        # Docker mode: read credentials from root .env
        if [ -f "$PROJECT_ROOT/.env" ]; then
            set -a
            # shellcheck source=/dev/null
            source "$PROJECT_ROOT/.env"
            set +a
        fi
        DB_USER="${POSTGRES_USER:-mpms_user}"
        DB_NAME="${POSTGRES_DB:-mpms_prod}"
        DB_PASS="${POSTGRES_PASSWORD:-}"
        DB_HOST="postgres"  # Docker service name (used only for reference)
        DB_PORT="5432"
    else
        # Local mode: read from backend/.env or root .env
        if [ -f "$PROJECT_ROOT/.env" ]; then
            # shellcheck source=/dev/null
            source "$PROJECT_ROOT/.env"
        fi
        if [ -f "$PROJECT_ROOT/backend/.env" ]; then
            # shellcheck source=/dev/null
            source "$PROJECT_ROOT/backend/.env"
        fi

        if [ -n "${DATABASE_URL:-}" ]; then
            DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
            DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
            DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
            DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
            DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        else
            DB_HOST="localhost"
            DB_PORT="5432"
            DB_NAME="mpms_dev"
            DB_USER="mpms_user"
            DB_PASS="${POSTGRES_PASSWORD:-dev_password_change_in_production}"
        fi
    fi

    # GPG encryption: optional — warn if not configured but don't fail
    if ! $NO_ENCRYPT && [ -z "$GPG_RECIPIENT" ]; then
        log_warn "GPG_RECIPIENT not set - backups will NOT be encrypted"
        log_warn "Set GPG_RECIPIENT in .env for encrypted backups (recommended for production)"
        NO_ENCRYPT=true
    fi

    if ! $NO_ENCRYPT; then
        if ! gpg --list-keys "$GPG_RECIPIENT" >/dev/null 2>&1; then
            log_warn "GPG key not found for recipient: $GPG_RECIPIENT - skipping encryption"
            NO_ENCRYPT=true
        fi
    fi

    log_success "Configuration loaded (mode=$DEPLOY_MODE, db=$DB_NAME)"
}

################################################################################
# Setup Backup Directories
################################################################################

setup_directories() {
    log_info "Setting up backup directories..."

    # Create base backup directory
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"

    # Create backup type directories
    mkdir -p "$BACKUP_DIR/daily"
    mkdir -p "$BACKUP_DIR/monthly"
    mkdir -p "$BACKUP_DIR/yearly"

    # Create log directory
    mkdir -p "$LOG_DIR"
    chmod 700 "$LOG_DIR"

    # Set log file now that directory exists
    LOG_FILE="$LOG_DIR/backup_${TIMESTAMP}.log"

    # Create temporary directory for this backup
    readonly TEMP_DIR=$(mktemp -d -p "$BACKUP_DIR" backup.XXXXXX)
    chmod 700 "$TEMP_DIR"

    log_success "Backup directories created"
}

################################################################################
# Database Backup
################################################################################

backup_database() {
    if $FILES_ONLY; then
        log_info "Skipping database backup (--files-only flag)"
        return 0
    fi

    log_info "Starting database backup..."
    local db_backup_file="$TEMP_DIR/database_${TIMESTAMP}.sql"

    if [ "$DEPLOY_MODE" = "docker" ]; then
        # Docker mode: use docker compose exec
        log_info "Backing up database via Docker..."
        if docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres \
            pg_dump -U "$DB_USER" -d "$DB_NAME" \
            --format=custom \
            --compress=9 \
            --verbose 2>&1 > "$db_backup_file" | tee -a "$LOG_FILE"; then

            local db_size
            db_size=$(du -h "$db_backup_file" | cut -f1)
            log_success "Database backup created: $db_size"
        else
            log_error "Database backup failed"
            cleanup
            exit 3
        fi
    else
        # Local mode: use pg_dump directly
        log_info "Backing up database locally..."
        export PGPASSWORD="$DB_PASS"
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --format=custom \
            --compress=9 \
            --verbose \
            --file="$db_backup_file" 2>&1 | tee -a "$LOG_FILE"; then

            local db_size
            db_size=$(du -h "$db_backup_file" | cut -f1)
            log_success "Database backup created: $db_size"
        else
            log_error "Database backup failed"
            unset PGPASSWORD
            cleanup
            exit 3
        fi
        unset PGPASSWORD
    fi

    # Calculate and store checksum
    sha256sum "$db_backup_file" > "$db_backup_file.sha256"
    log_info "Database backup checksum stored"
}

################################################################################
# File Backup
################################################################################

backup_files() {
    if $DB_ONLY; then
        log_info "Skipping file backup (--db-only flag)"
        return 0
    fi

    log_info "Starting file backup..."
    local files_backup="$TEMP_DIR/files_${TIMESTAMP}.tar.gz"

    # List of directories to backup
    local backup_items=()

    # Always backup migrations and infrastructure config
    [ -d "$PROJECT_ROOT/backend/migrations" ] && backup_items+=("$PROJECT_ROOT/backend/migrations")
    [ -d "$PROJECT_ROOT/infrastructure" ] && backup_items+=("$PROJECT_ROOT/infrastructure")
    [ -d "$PROJECT_ROOT/docs" ] && backup_items+=("$PROJECT_ROOT/docs")

    # Backup data directory if it exists (Docker volume bind-mount)
    local data_dir="${DATA_DIR:-$PROJECT_ROOT/data}"
    if [ -d "$data_dir" ]; then
        backup_items+=("$data_dir")
    fi

    # Add uploads directory if it exists (local mode)
    if [ -d "$PROJECT_ROOT/uploads" ]; then
        backup_items+=("$PROJECT_ROOT/uploads")
    fi

    if [ ${#backup_items[@]} -eq 0 ]; then
        log_warn "No files to backup"
        return 0
    fi

    # Create tar archive with compression
    if tar -czf "$files_backup" \
        --exclude='*.log' \
        --exclude='target' \
        --exclude='node_modules' \
        --exclude='.git' \
        "${backup_items[@]}" 2>&1 | tee -a "$LOG_FILE"; then

        local files_size
        files_size=$(du -h "$files_backup" | cut -f1)
        log_success "File backup created: $files_size"

        # Calculate and store checksum
        sha256sum "$files_backup" > "$files_backup.sha256"
        log_info "File backup checksum stored"
    else
        log_error "File backup failed"
        cleanup
        exit 3
    fi
}

################################################################################
# GPG Encryption
################################################################################

encrypt_backups() {
    if $NO_ENCRYPT; then
        log_warn "Skipping encryption (GPG not configured or --no-encrypt flag)"
        return 0
    fi

    log_info "Encrypting backups with GPG..."

    for file in "$TEMP_DIR"/*; do
        # Skip checksum files and already encrypted files
        if [[ "$file" == *.sha256 ]] || [[ "$file" == *.gpg ]]; then
            continue
        fi

        log_info "Encrypting: $(basename "$file")"

        if gpg --encrypt \
            --recipient "$GPG_RECIPIENT" \
            --trust-model always \
            --compress-algo bzip2 \
            --output "${file}.gpg" \
            "$file" 2>&1 | tee -a "$LOG_FILE"; then

            log_success "Encrypted: $(basename "$file").gpg"

            # Remove unencrypted file
            rm -f "$file"
        else
            log_error "Encryption failed for: $(basename "$file")"
            cleanup
            exit 4
        fi
    done

    log_success "All backups encrypted"
}

################################################################################
# Move Backups to Final Location
################################################################################

finalize_backups() {
    log_info "Finalizing backups..."

    local dest_dir="$BACKUP_DIR/$BACKUP_TYPE"
    local backup_name="backup_${DATE_DAILY}_${TIMESTAMP}"

    # Create final backup directory
    local final_dir="$dest_dir/$backup_name"
    mkdir -p "$final_dir"
    chmod 700 "$final_dir"

    # Move all files from temp directory to final location
    mv "$TEMP_DIR"/* "$final_dir/"
    rmdir "$TEMP_DIR"

    # Create a manifest file
    cat > "$final_dir/MANIFEST.txt" <<EOF
DocPat Backup Manifest
======================
Backup Type:    $BACKUP_TYPE
Timestamp:      $(date +'%Y-%m-%d %H:%M:%S')
Database:       $DB_NAME
Deploy Mode:    $DEPLOY_MODE
Host:           $(hostname)
Encrypted:      $(if $NO_ENCRYPT; then echo "No"; else echo "Yes (GPG: $GPG_RECIPIENT)"; fi)

Files:
EOF
    ls -lh "$final_dir" >> "$final_dir/MANIFEST.txt"

    log_success "Backup finalized: $final_dir"

    # Print backup summary
    echo ""
    echo "Backup Summary:"
    echo "  Location: $final_dir"
    echo "  Type:     $BACKUP_TYPE"
    echo "  Mode:     $DEPLOY_MODE"
    echo "  Size:     $(du -sh "$final_dir" | cut -f1)"
    echo "  Files:    $(ls -1 "$final_dir" | wc -l)"
    echo ""
}

################################################################################
# Verification
################################################################################

verify_backup() {
    if ! $VERIFY_BACKUP; then
        return 0
    fi

    log_info "Verifying backup integrity..."

    local dest_dir="$BACKUP_DIR/$BACKUP_TYPE"
    local backup_name="backup_${DATE_DAILY}_${TIMESTAMP}"
    local final_dir="$dest_dir/$backup_name"

    # Verify checksums
    for checksum_file in "$final_dir"/*.sha256; do
        if [ -f "$checksum_file" ]; then
            local original_file
            original_file=$(basename "$checksum_file" .sha256)
            log_info "Verifying checksum for: $original_file"

            if (cd "$final_dir" && sha256sum -c "$(basename "$checksum_file")" 2>&1 | tee -a "$LOG_FILE"); then
                log_success "Checksum verified: $original_file"
            else
                log_error "Checksum verification failed: $original_file"
                exit 5
            fi
        fi
    done

    # Test GPG decryption (without actually decrypting)
    if ! $NO_ENCRYPT; then
        for gpg_file in "$final_dir"/*.gpg; do
            if [ -f "$gpg_file" ]; then
                log_info "Testing GPG decryption: $(basename "$gpg_file")"

                if gpg --list-packets "$gpg_file" >/dev/null 2>&1; then
                    log_success "GPG file is valid: $(basename "$gpg_file")"
                else
                    log_error "GPG file is corrupt: $(basename "$gpg_file")"
                    exit 5
                fi
            fi
        done
    fi

    log_success "Backup verification passed"
}

################################################################################
# Cleanup Old Backups (Retention Policy)
################################################################################

cleanup_old_backups() {
    log_info "Applying retention policy..."

    # Daily backups: keep RETENTION_DAILY
    local daily_count
    daily_count=$(ls -1d "$BACKUP_DIR/daily"/backup_* 2>/dev/null | wc -l)
    if [ "$daily_count" -gt "$RETENTION_DAILY" ]; then
        local to_delete=$((daily_count - RETENTION_DAILY))
        log_info "Removing $to_delete old daily backup(s)..."
        ls -1dt "$BACKUP_DIR/daily"/backup_* | tail -n "$to_delete" | while read -r old_backup; do
            log_info "Deleting: $(basename "$old_backup")"
            rm -rf "$old_backup"
        done
    fi

    # Monthly backups: keep RETENTION_MONTHLY
    local monthly_count
    monthly_count=$(ls -1d "$BACKUP_DIR/monthly"/backup_* 2>/dev/null | wc -l)
    if [ "$monthly_count" -gt "$RETENTION_MONTHLY" ]; then
        local to_delete=$((monthly_count - RETENTION_MONTHLY))
        log_info "Removing $to_delete old monthly backup(s)..."
        ls -1dt "$BACKUP_DIR/monthly"/backup_* | tail -n "$to_delete" | while read -r old_backup; do
            log_info "Deleting: $(basename "$old_backup")"
            rm -rf "$old_backup"
        done
    fi

    # Yearly backups: keep RETENTION_YEARLY
    local yearly_count
    yearly_count=$(ls -1d "$BACKUP_DIR/yearly"/backup_* 2>/dev/null | wc -l)
    if [ "$yearly_count" -gt "$RETENTION_YEARLY" ]; then
        local to_delete=$((yearly_count - RETENTION_YEARLY))
        log_info "Removing $to_delete old yearly backup(s)..."
        ls -1dt "$BACKUP_DIR/yearly"/backup_* | tail -n "$to_delete" | while read -r old_backup; do
            log_info "Deleting: $(basename "$old_backup")"
            rm -rf "$old_backup"
        done
    fi

    log_success "Retention policy applied"
}

################################################################################
# Cleanup on Error
################################################################################

cleanup() {
    if [ -d "${TEMP_DIR:-}" ]; then
        log_warn "Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
    fi
}

trap cleanup EXIT ERR INT TERM

################################################################################
# Main Execution
################################################################################

main() {
    echo "=========================================="
    echo "DocPat Backup System - $BACKUP_TYPE"
    echo "=========================================="
    echo ""

    parse_args "$@"
    setup_directories
    load_configuration

    log_info "Starting backup process..."
    log_info "Backup type: $BACKUP_TYPE"
    log_info "Timestamp: $TIMESTAMP"

    backup_database
    backup_files
    encrypt_backups
    finalize_backups
    verify_backup
    cleanup_old_backups

    log_success "Backup completed successfully!"
    echo ""
    echo "Log file: $LOG_FILE"
    echo ""

    # Return success
    exit 0
}

main "$@"
