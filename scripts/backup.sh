#!/usr/bin/env bash

################################################################################
# Medical Practice Management System - Automated Backup Script
################################################################################
#
# This script creates encrypted backups of the DocPat database and files.
# Complies with HIPAA requirements for data protection and retention.
#
# Usage:
#   ./scripts/backup.sh [options]
#
# Options:
#   --type <daily|monthly|yearly>  Backup type (default: daily)
#   --db-only                      Backup only the database
#   --files-only                   Backup only files
#   --no-encrypt                   Skip GPG encryption (NOT RECOMMENDED)
#   --verify                       Verify backup after creation
#   --config <path>                Use custom backup configuration file
#   --help                         Show this help message
#
# Environment Variables:
#   BACKUP_DIR                     Base directory for backups (default: /var/backups/docpat)
#   DATABASE_URL                   PostgreSQL connection string
#   GPG_RECIPIENT                  GPG key ID or email for encryption
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
readonly DATE_MONTHLY=$(date +"%Y-%m")
readonly DATE_YEARLY=$(date +"%Y")

# Log file
readonly LOG_DIR="$BACKUP_DIR/logs"
readonly LOG_FILE="$LOG_DIR/backup_${TIMESTAMP}.log"

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

    # Load environment from .env file
    if [ -f "$PROJECT_ROOT/.env" ]; then
        # shellcheck source=/dev/null
        source "$PROJECT_ROOT/.env"
    fi

    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        # shellcheck source=/dev/null
        source "$PROJECT_ROOT/backend/.env"
    fi

    # Validate DATABASE_URL
    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL not set. Please configure in backend/.env"
        exit 2
    fi

    # Extract database connection details
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

    # Validate GPG key if encryption is enabled
    if ! $NO_ENCRYPT; then
        if [ -z "$GPG_RECIPIENT" ]; then
            log_error "GPG_RECIPIENT not set. Please configure GPG key for encryption"
            log_error "Generate a key with: gpg --gen-key"
            log_error "Then set GPG_RECIPIENT=<your-email> in .env"
            exit 2
        fi

        # Check if GPG key exists
        if ! gpg --list-keys "$GPG_RECIPIENT" >/dev/null 2>&1; then
            log_error "GPG key not found for recipient: $GPG_RECIPIENT"
            exit 2
        fi
    fi

    log_success "Configuration loaded successfully"
}

################################################################################
# Setup Backup Directories
################################################################################

setup_directories() {
    log_info "Setting up backup directories..."

    # Create base backup directory
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"  # Restricted permissions for security

    # Create backup type directories
    mkdir -p "$BACKUP_DIR/daily"
    mkdir -p "$BACKUP_DIR/monthly"
    mkdir -p "$BACKUP_DIR/yearly"

    # Create log directory
    mkdir -p "$LOG_DIR"
    chmod 700 "$LOG_DIR"

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

    # Use pg_dump with compression
    export PGPASSWORD="$DB_PASS"
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --verbose \
        --file="$db_backup_file" 2>&1 | tee -a "$LOG_FILE"; then

        local db_size=$(du -h "$db_backup_file" | cut -f1)
        log_success "Database backup created: $db_size"

        # Calculate and store checksum
        sha256sum "$db_backup_file" > "$db_backup_file.sha256"
        log_info "Database backup checksum: $(cat "$db_backup_file.sha256" | cut -d' ' -f1)"
    else
        log_error "Database backup failed"
        cleanup
        exit 3
    fi
    unset PGPASSWORD
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
    local backup_items=(
        "$PROJECT_ROOT/backend/migrations"
        "$PROJECT_ROOT/infrastructure"
        "$PROJECT_ROOT/docs"
    )

    # Add uploads directory if it exists
    if [ -d "$PROJECT_ROOT/uploads" ]; then
        backup_items+=("$PROJECT_ROOT/uploads")
    fi

    # Create tar archive with compression
    if tar -czf "$files_backup" \
        --exclude='*.log' \
        --exclude='target' \
        --exclude='node_modules' \
        --exclude='.git' \
        "${backup_items[@]}" 2>&1 | tee -a "$LOG_FILE"; then

        local files_size=$(du -h "$files_backup" | cut -f1)
        log_success "File backup created: $files_size"

        # Calculate and store checksum
        sha256sum "$files_backup" > "$files_backup.sha256"
        log_info "File backup checksum: $(cat "$files_backup.sha256" | cut -d' ' -f1)"
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
        log_warn "Skipping encryption (--no-encrypt flag) - NOT RECOMMENDED FOR PRODUCTION"
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
            local original_file=$(basename "$checksum_file" .sha256)
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
    local daily_count=$(ls -1d "$BACKUP_DIR/daily"/backup_* 2>/dev/null | wc -l)
    if [ "$daily_count" -gt "$RETENTION_DAILY" ]; then
        local to_delete=$((daily_count - RETENTION_DAILY))
        log_info "Removing $to_delete old daily backup(s)..."
        ls -1dt "$BACKUP_DIR/daily"/backup_* | tail -n "$to_delete" | while read -r old_backup; do
            log_info "Deleting: $(basename "$old_backup")"
            rm -rf "$old_backup"
        done
    fi

    # Monthly backups: keep RETENTION_MONTHLY
    local monthly_count=$(ls -1d "$BACKUP_DIR/monthly"/backup_* 2>/dev/null | wc -l)
    if [ "$monthly_count" -gt "$RETENTION_MONTHLY" ]; then
        local to_delete=$((monthly_count - RETENTION_MONTHLY))
        log_info "Removing $to_delete old monthly backup(s)..."
        ls -1dt "$BACKUP_DIR/monthly"/backup_* | tail -n "$to_delete" | while read -r old_backup; do
            log_info "Deleting: $(basename "$old_backup")"
            rm -rf "$old_backup"
        done
    fi

    # Yearly backups: keep RETENTION_YEARLY
    local yearly_count=$(ls -1d "$BACKUP_DIR/yearly"/backup_* 2>/dev/null | wc -l)
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
    load_configuration
    setup_directories

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
