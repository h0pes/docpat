#!/usr/bin/env bash

################################################################################
# Medical Practice Management System - Backup Restoration Script
################################################################################
#
# This script restores backups of the DocPat database and files.
# Supports both Docker and local PostgreSQL deployment modes.
# Implements disaster recovery procedures with safety checks.
#
# Usage:
#   ./scripts/restore.sh [options]
#
# Options:
#   --backup-dir <path>            Directory containing backup to restore
#   --list-backups                 List available backups and exit
#   --type <daily|monthly|yearly>  Backup type to list (with --list-backups)
#   --db-only                      Restore only the database
#   --files-only                   Restore only files
#   --force                        Skip confirmation prompts (DANGEROUS)
#   --no-backup                    Skip creating restore point before restoration
#   --verify-only                  Only verify backup integrity, don't restore
#   --docker                       Force Docker mode
#   --local                        Force local mode
#   --config <path>                Use custom restoration configuration file
#   --help                         Show this help message
#
# Environment Variables:
#   BACKUP_DIR                     Base directory for backups (default: /var/backups/docpat)
#   RESTORE_POINT_DIR              Directory for pre-restore backups (default: /var/backups/docpat/restore-points)
#
# Safety Features:
#   - Creates restore point before restoring (unless --no-backup)
#   - Verifies backup checksums before restoration
#   - Prompts for confirmation (unless --force)
#   - Validates backup integrity
#   - Logs all operations for audit trail
#
# Exit Codes:
#   0 - Success
#   1 - General error
#   2 - Configuration error
#   3 - Backup verification failed
#   4 - Decryption failed
#   5 - Restoration failed
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
LIST_BACKUPS=false
BACKUP_TYPE=""
DB_ONLY=false
FILES_ONLY=false
FORCE=false
NO_BACKUP=false
VERIFY_ONLY=false
FORCE_MODE=""
CONFIG_FILE=""
BACKUP_TO_RESTORE=""

# Project paths
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Restoration configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/docpat}"
RESTORE_POINT_DIR="${RESTORE_POINT_DIR:-/var/backups/docpat/restore-points}"

# Timestamp
readonly TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Log file
readonly LOG_DIR="$BACKUP_DIR/logs"
LOG_FILE=""  # Set after mkdir

# Temporary working directory
TEMP_DIR=""

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
    sed -n '2,39p' "$0" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

################################################################################
# Parse Command Line Arguments
################################################################################

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backup-dir)
                BACKUP_TO_RESTORE="$2"
                shift 2
                ;;
            --list-backups)
                LIST_BACKUPS=true
                shift
                ;;
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
            --force)
                FORCE=true
                shift
                ;;
            --no-backup)
                NO_BACKUP=true
                shift
                ;;
            --verify-only)
                VERIFY_ONLY=true
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
    log_info "Loading restoration configuration..."

    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    chmod 700 "$LOG_DIR"
    LOG_FILE="$LOG_DIR/restore_${TIMESTAMP}.log"

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
        DB_HOST="postgres"
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

    log_success "Configuration loaded (mode=$DEPLOY_MODE, db=$DB_NAME)"
}

################################################################################
# List Available Backups
################################################################################

list_available_backups() {
    echo "=========================================="
    echo "Available Backups"
    echo "=========================================="
    echo ""

    local types=("daily" "monthly" "yearly")
    if [ -n "$BACKUP_TYPE" ]; then
        types=("$BACKUP_TYPE")
    fi

    for type in "${types[@]}"; do
        local backup_path="$BACKUP_DIR/$type"

        if [ ! -d "$backup_path" ]; then
            continue
        fi

        local backup_count
        backup_count=$(ls -1d "$backup_path"/backup_* 2>/dev/null | wc -l)

        if [ "$backup_count" -eq 0 ]; then
            continue
        fi

        echo "${type^^} BACKUPS:"
        echo "--------------------------------------"

        ls -1dt "$backup_path"/backup_* | while read -r backup_dir; do
            local backup_name
            backup_name=$(basename "$backup_dir")
            local backup_size
            backup_size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1)
            local backup_date
            backup_date=$(stat -c %y "$backup_dir" | cut -d' ' -f1,2 | cut -d'.' -f1)
            local file_count
            file_count=$(ls -1 "$backup_dir" 2>/dev/null | wc -l)

            echo "  $backup_name"
            echo "    Date:  $backup_date"
            echo "    Size:  $backup_size"
            echo "    Files: $file_count"

            # Check if MANIFEST exists
            if [ -f "$backup_dir/MANIFEST.txt" ]; then
                echo "    Status: Complete"
            else
                echo "    Status: Incomplete (missing manifest)"
            fi

            echo ""
        done
    done

    echo "To restore a backup, use:"
    echo "  ./scripts/restore.sh --backup-dir <backup-directory>"
    echo ""

    exit 0
}

################################################################################
# Verify Backup Integrity
################################################################################

verify_backup_integrity() {
    local backup_dir=$1

    log_info "Verifying backup integrity..."

    # Check if backup directory exists
    if [ ! -d "$backup_dir" ]; then
        log_error "Backup directory not found: $backup_dir"
        exit 3
    fi

    # Check for MANIFEST
    if [ ! -f "$backup_dir/MANIFEST.txt" ]; then
        log_warn "MANIFEST.txt not found - backup may be incomplete"
    fi

    # Verify checksums if they exist
    local checksum_count=0
    for checksum_file in "$backup_dir"/*.sha256; do
        if [ -f "$checksum_file" ]; then
            checksum_count=$((checksum_count + 1))
            local original_file
            original_file=$(basename "$checksum_file" .sha256)

            log_info "Verifying checksum for: $original_file"

            if (cd "$backup_dir" && sha256sum -c "$(basename "$checksum_file")" 2>&1 | tee -a "$LOG_FILE"); then
                log_success "Checksum verified: $original_file"
            else
                log_error "Checksum verification failed: $original_file"
                log_error "Backup may be corrupted!"
                exit 3
            fi
        fi
    done

    if [ "$checksum_count" -eq 0 ]; then
        log_warn "No checksum files found - cannot verify integrity"
    fi

    # Verify GPG files
    local gpg_count=0
    for gpg_file in "$backup_dir"/*.gpg; do
        if [ -f "$gpg_file" ]; then
            gpg_count=$((gpg_count + 1))
            log_info "Verifying GPG file: $(basename "$gpg_file")"

            if gpg --list-packets "$gpg_file" >/dev/null 2>&1; then
                log_success "GPG file is valid: $(basename "$gpg_file")"
            else
                log_error "GPG file is corrupt: $(basename "$gpg_file")"
                exit 3
            fi
        fi
    done

    if [ "$gpg_count" -eq 0 ]; then
        log_info "No encrypted files found (backup may be unencrypted)"
    fi

    log_success "Backup integrity verification passed"
}

################################################################################
# Decrypt Backup Files
################################################################################

decrypt_backup() {
    local backup_dir=$1

    log_info "Decrypting backup files..."

    # Create temporary directory for decrypted files
    TEMP_DIR=$(mktemp -d -p "$BACKUP_DIR" restore.XXXXXX)
    chmod 700 "$TEMP_DIR"

    local gpg_count=0
    for gpg_file in "$backup_dir"/*.gpg; do
        if [ ! -f "$gpg_file" ]; then
            continue
        fi

        gpg_count=$((gpg_count + 1))
        local filename
        filename=$(basename "$gpg_file" .gpg)

        log_info "Decrypting: $filename"

        if gpg --decrypt --output "$TEMP_DIR/$filename" "$gpg_file" 2>&1 | tee -a "$LOG_FILE"; then
            log_success "Decrypted: $filename"
        else
            log_error "Decryption failed for: $filename"
            log_error "Check if you have the correct GPG private key"
            cleanup
            exit 4
        fi
    done

    # Copy non-encrypted files
    for file in "$backup_dir"/*; do
        if [[ ! "$file" =~ \.gpg$ ]] && [[ ! "$file" =~ \.sha256$ ]] && [ -f "$file" ]; then
            cp "$file" "$TEMP_DIR/"
        fi
    done

    if [ "$gpg_count" -eq 0 ]; then
        log_warn "No encrypted files found - using backup directory directly"
        TEMP_DIR="$backup_dir"
    else
        log_success "All files decrypted successfully"
    fi
}

################################################################################
# Create Restore Point
################################################################################

create_restore_point() {
    if $NO_BACKUP; then
        log_warn "Skipping restore point creation (--no-backup flag)"
        return 0
    fi

    log_info "Creating restore point before restoration..."

    mkdir -p "$RESTORE_POINT_DIR"
    chmod 700 "$RESTORE_POINT_DIR"

    local restore_point="$RESTORE_POINT_DIR/restore_point_${TIMESTAMP}"
    mkdir -p "$restore_point"

    # Backup current database
    if ! $FILES_ONLY; then
        log_info "Backing up current database..."

        if [ "$DEPLOY_MODE" = "docker" ]; then
            # Docker mode
            if docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres \
                pg_dump -U "$DB_USER" -d "$DB_NAME" \
                --format=custom \
                --compress=9 2>&1 > "$restore_point/database_pre_restore.sql" | tee -a "$LOG_FILE"; then
                log_success "Database restore point created"
            else
                log_error "Failed to create database restore point"
                exit 5
            fi
        else
            # Local mode
            export PGPASSWORD="$DB_PASS"
            if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --format=custom \
                --compress=9 \
                --file="$restore_point/database_pre_restore.sql" 2>&1 | tee -a "$LOG_FILE"; then
                log_success "Database restore point created"
            else
                log_error "Failed to create database restore point"
                unset PGPASSWORD
                exit 5
            fi
            unset PGPASSWORD
        fi
    fi

    log_success "Restore point created: $restore_point"
}

################################################################################
# Restore Database
################################################################################

restore_database() {
    if $FILES_ONLY; then
        log_info "Skipping database restoration (--files-only flag)"
        return 0
    fi

    log_info "Restoring database..."

    # Find database backup file
    local db_backup
    db_backup=$(find "$TEMP_DIR" -name "database_*.sql" -type f | head -n 1)

    if [ -z "$db_backup" ]; then
        log_error "Database backup file not found in: $TEMP_DIR"
        exit 5
    fi

    log_info "Database backup file: $(basename "$db_backup")"

    # Confirm restoration
    if ! $FORCE; then
        echo ""
        log_warn "WARNING: This will OVERWRITE the current database: $DB_NAME"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "Database restoration cancelled by user"
            cleanup
            exit 0
        fi
    fi

    if [ "$DEPLOY_MODE" = "docker" ]; then
        # Docker mode: terminate connections and restore via docker compose exec
        log_info "Terminating existing connections..."
        docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres \
            psql -U "$DB_USER" -d postgres -c \
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
            2>&1 | tee -a "$LOG_FILE" || true

        log_info "Dropping and recreating database: $DB_NAME"
        docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres \
            psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" \
            2>&1 | tee -a "$LOG_FILE"
        docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres \
            psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" \
            2>&1 | tee -a "$LOG_FILE"

        # Copy backup to container and restore
        log_info "Restoring database from backup..."
        docker cp "$db_backup" docpat-postgres:/tmp/restore_db.sql
        if docker compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres \
            pg_restore -U "$DB_USER" -d "$DB_NAME" --verbose /tmp/restore_db.sql \
            2>&1 | tee -a "$LOG_FILE"; then
            log_success "Database restored successfully"
        else
            log_error "Database restoration failed"
            log_error "You can recover from the restore point in: $RESTORE_POINT_DIR"
            exit 5
        fi
    else
        # Local mode: use psql/pg_restore directly
        export PGPASSWORD="$DB_PASS"

        # Terminate existing connections
        log_info "Terminating existing connections..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
            2>&1 | tee -a "$LOG_FILE" || true

        # Drop and recreate
        log_info "Dropping and recreating database: $DB_NAME"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" \
            2>&1 | tee -a "$LOG_FILE"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" \
            2>&1 | tee -a "$LOG_FILE"

        # Restore from backup
        log_info "Restoring database from backup..."
        if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --verbose \
            "$db_backup" 2>&1 | tee -a "$LOG_FILE"; then
            log_success "Database restored successfully"
        else
            log_error "Database restoration failed"
            log_error "You can recover from the restore point in: $RESTORE_POINT_DIR"
            exit 5
        fi
        unset PGPASSWORD
    fi
}

################################################################################
# Restore Files
################################################################################

restore_files() {
    if $DB_ONLY; then
        log_info "Skipping file restoration (--db-only flag)"
        return 0
    fi

    log_info "Restoring files..."

    # Find file backup
    local files_backup
    files_backup=$(find "$TEMP_DIR" -name "files_*.tar.gz" -type f | head -n 1)

    if [ -z "$files_backup" ]; then
        log_error "File backup not found in: $TEMP_DIR"
        exit 5
    fi

    log_info "File backup: $(basename "$files_backup")"

    # Confirm restoration
    if ! $FORCE; then
        echo ""
        log_warn "WARNING: This will OVERWRITE existing files"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "File restoration cancelled by user"
            cleanup
            exit 0
        fi
    fi

    # Extract files
    log_info "Extracting files to: $PROJECT_ROOT"
    if tar -xzf "$files_backup" -C / 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Files restored successfully"
    else
        log_error "File restoration failed"
        exit 5
    fi
}

################################################################################
# Cleanup
################################################################################

cleanup() {
    if [ -n "${TEMP_DIR:-}" ] && [ -d "$TEMP_DIR" ] && [[ "$TEMP_DIR" == *"restore."* ]]; then
        log_info "Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
    fi
}

trap cleanup EXIT ERR INT TERM

################################################################################
# Main Execution
################################################################################

main() {
    echo "=========================================="
    echo "DocPat Restoration System"
    echo "=========================================="
    echo ""

    parse_args "$@"
    load_configuration

    # List backups if requested
    if $LIST_BACKUPS; then
        list_available_backups
    fi

    # Validate backup directory
    if [ -z "$BACKUP_TO_RESTORE" ]; then
        log_error "No backup specified. Use --backup-dir <path> or --list-backups"
        exit 2
    fi

    if [ ! -d "$BACKUP_TO_RESTORE" ]; then
        log_error "Backup directory not found: $BACKUP_TO_RESTORE"
        exit 2
    fi

    log_info "Starting restoration process..."
    log_info "Backup: $BACKUP_TO_RESTORE"
    log_info "Timestamp: $TIMESTAMP"

    # Verify backup integrity
    verify_backup_integrity "$BACKUP_TO_RESTORE"

    # Exit if verify-only mode
    if $VERIFY_ONLY; then
        log_success "Backup verification complete (--verify-only mode)"
        exit 0
    fi

    # Decrypt backup
    decrypt_backup "$BACKUP_TO_RESTORE"

    # Create restore point
    create_restore_point

    # Restore database and files
    restore_database
    restore_files

    log_success "Restoration completed successfully!"
    echo ""
    echo "Log file: $LOG_FILE"
    echo ""

    # Show restore point location
    if ! $NO_BACKUP; then
        echo "A restore point was created before restoration:"
        echo "  Location: $RESTORE_POINT_DIR/restore_point_${TIMESTAMP}"
        echo ""
    fi

    exit 0
}

main "$@"
