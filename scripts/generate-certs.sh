#!/bin/bash
#
# DocPat Certificate Generation Script
#
# Generates TLS certificates for local development HTTPS.
# Prefers mkcert (auto-trusted by browsers) when available,
# falls back to manual OpenSSL CA + signing.
#
# Usage:
#   ./scripts/generate-certs.sh           # Generate all certificates
#   ./scripts/generate-certs.sh --clean   # Remove existing certs and regenerate
#   ./scripts/generate-certs.sh --help    # Show help
#
# Output structure:
#   certs/
#   ├── ca/
#   │   ├── ca.crt           # CA certificate (only with OpenSSL fallback)
#   │   └── ca.key           # CA private key (only with OpenSSL fallback)
#   ├── backend/
#   │   ├── server.crt       # Backend server certificate
#   │   └── server.key       # Backend server private key
#   └── frontend/
#       ├── server.crt       # Frontend dev server certificate
#       └── server.key       # Frontend dev server private key
#
# Note: For production, use Let's Encrypt or Caddy for automatic HTTPS.
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="$PROJECT_ROOT/certs"
CA_DIR="$CERTS_DIR/ca"
BACKEND_DIR="$CERTS_DIR/backend"
FRONTEND_DIR="$CERTS_DIR/frontend"

# Certificate settings (OpenSSL fallback only)
CA_DAYS=3650          # CA valid for 10 years
CERT_DAYS=365         # Server certs valid for 1 year
KEY_SIZE=4096         # RSA key size (4096 for security)
COUNTRY="IT"
STATE="Rome"
LOCALITY="Rome"
ORGANIZATION="DocPat Development"
ORG_UNIT="Development"
CA_CN="DocPat Local Development CA"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Show help
show_help() {
    cat << EOF
DocPat Certificate Generation Script

Generates TLS certificates for local development.
Uses mkcert (recommended) when available, falls back to OpenSSL.

Usage:
  $0 [OPTIONS]

Options:
  --clean       Remove existing certificates and regenerate
  --ca-only     Only generate CA certificate (OpenSSL fallback only)
  --backend     Only generate backend certificate
  --frontend    Only generate frontend certificate
  --no-mkcert   Force OpenSSL mode even if mkcert is available
  --help, -h    Show this help message

Examples:
  $0                    # Generate all certificates
  $0 --clean            # Clean and regenerate all
  $0 --backend          # Regenerate only backend cert

With mkcert (recommended):
  Certificates are automatically trusted by browsers.
  Install mkcert: https://github.com/FiloSottile/mkcert
    Arch Linux: pacman -S mkcert
    macOS:      brew install mkcert
    Ubuntu:     apt install mkcert

Without mkcert (OpenSSL fallback):
  After generation, you must manually trust the CA:
  1. Import ca/ca.crt into your browser, or
  2. System-wide (Linux):
     sudo cp certs/ca/ca.crt /usr/local/share/ca-certificates/docpat-dev-ca.crt
     sudo update-ca-certificates

EOF
    exit 0
}

# Create directory structure
create_directories() {
    log_info "Creating certificate directories..."
    mkdir -p "$CA_DIR"
    mkdir -p "$BACKEND_DIR"
    mkdir -p "$FRONTEND_DIR"

    # Create .gitignore to prevent committing private keys
    cat > "$CERTS_DIR/.gitignore" << 'EOF'
# Never commit private keys
*.key
# But allow certificate files (public)
!*.crt
# Keep .gitignore
!.gitignore
# Ignore OpenSSL temp files
*.srl
*.csr
# Ignore mkcert pem files
*.pem
EOF

    log_success "Directory structure created at $CERTS_DIR"
}

# ============================================
# mkcert-based generation (preferred)
# ============================================

generate_with_mkcert() {
    local target="$1"  # "all", "backend", or "frontend"

    log_info "Using mkcert for certificate generation"
    log_info "mkcert CA root: $(mkcert -CAROOT)"

    # Ensure mkcert CA is installed in trust stores
    mkcert -install 2>/dev/null || true

    if [[ "$target" == "all" || "$target" == "backend" ]]; then
        log_info "Generating backend certificate..."
        mkcert -key-file "$BACKEND_DIR/server.key" \
               -cert-file "$BACKEND_DIR/server.crt" \
               localhost 127.0.0.1 ::1
        chmod 600 "$BACKEND_DIR/server.key"
        chmod 644 "$BACKEND_DIR/server.crt"
        log_success "Backend certificate generated (trusted by browsers)"
    fi

    if [[ "$target" == "all" || "$target" == "frontend" ]]; then
        log_info "Generating frontend certificate..."
        mkcert -key-file "$FRONTEND_DIR/server.key" \
               -cert-file "$FRONTEND_DIR/server.crt" \
               localhost 127.0.0.1 ::1
        chmod 600 "$FRONTEND_DIR/server.key"
        chmod 644 "$FRONTEND_DIR/server.crt"
        log_success "Frontend certificate generated (trusted by browsers)"
    fi
}

# ============================================
# OpenSSL-based generation (fallback)
# ============================================

# Check if OpenSSL is installed
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        log_error "OpenSSL is not installed. Please install it first."
        log_info "Ubuntu/Debian: sudo apt install openssl"
        log_info "Arch Linux: sudo pacman -S openssl"
        exit 1
    fi
    log_info "OpenSSL version: $(openssl version)"
}

# Generate CA certificate
generate_ca() {
    if [[ -f "$CA_DIR/ca.crt" && -f "$CA_DIR/ca.key" ]]; then
        log_warn "CA certificate already exists. Use --clean to regenerate."
        return 0
    fi

    log_info "Generating CA private key..."
    openssl genrsa -out "$CA_DIR/ca.key" $KEY_SIZE 2>/dev/null

    log_info "Generating CA certificate..."
    openssl req -x509 -new -nodes \
        -key "$CA_DIR/ca.key" \
        -sha256 \
        -days $CA_DAYS \
        -out "$CA_DIR/ca.crt" \
        -subj "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/OU=$ORG_UNIT/CN=$CA_CN"

    # Set permissions
    chmod 600 "$CA_DIR/ca.key"
    chmod 644 "$CA_DIR/ca.crt"

    log_success "CA certificate generated: $CA_DIR/ca.crt"
}

# Generate server certificate
# Arguments: $1 = name (backend/frontend), $2 = CN, $3 = output_dir
generate_server_cert() {
    local name="$1"
    local cn="$2"
    local output_dir="$3"
    local key_file="$output_dir/server.key"
    local csr_file="$output_dir/server.csr"
    local crt_file="$output_dir/server.crt"
    local ext_file="$output_dir/server.ext"

    if [[ -f "$crt_file" && -f "$key_file" ]]; then
        log_warn "$name certificate already exists. Use --clean to regenerate."
        return 0
    fi

    # Check CA exists
    if [[ ! -f "$CA_DIR/ca.crt" || ! -f "$CA_DIR/ca.key" ]]; then
        log_error "CA certificate not found. Generate CA first."
        exit 1
    fi

    log_info "Generating $name private key..."
    openssl genrsa -out "$key_file" $KEY_SIZE 2>/dev/null

    log_info "Generating $name CSR..."
    openssl req -new \
        -key "$key_file" \
        -out "$csr_file" \
        -subj "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/OU=$ORG_UNIT/CN=$cn"

    # Create extensions file for SAN (Subject Alternative Names)
    cat > "$ext_file" << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = $cn
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    log_info "Signing $name certificate with CA..."
    openssl x509 -req \
        -in "$csr_file" \
        -CA "$CA_DIR/ca.crt" \
        -CAkey "$CA_DIR/ca.key" \
        -CAcreateserial \
        -out "$crt_file" \
        -days $CERT_DAYS \
        -sha256 \
        -extfile "$ext_file"

    # Clean up temp files
    rm -f "$csr_file" "$ext_file"

    # Set permissions
    chmod 600 "$key_file"
    chmod 644 "$crt_file"

    log_success "$name certificate generated: $crt_file"
}

generate_with_openssl() {
    local target="$1"  # "all", "backend", "frontend", or "ca"

    check_openssl

    if [[ "$target" == "ca" ]]; then
        generate_ca
        return
    fi

    if [[ "$target" == "all" ]]; then
        generate_ca
    fi

    if [[ "$target" == "all" || "$target" == "backend" ]]; then
        generate_server_cert "backend" "localhost" "$BACKEND_DIR"
    fi

    if [[ "$target" == "all" || "$target" == "frontend" ]]; then
        generate_server_cert "frontend" "localhost" "$FRONTEND_DIR"
    fi
}

# Clean all certificates
clean_certs() {
    log_warn "Removing all existing certificates..."
    rm -rf "$CERTS_DIR"
    log_success "Certificates removed."
}

# Verify certificates
verify_certs() {
    local use_mkcert="$1"

    log_info "Verifying certificates..."

    local errors=0

    if [[ "$use_mkcert" == "true" ]]; then
        # mkcert certs are signed by the mkcert CA
        local mkcert_ca="$(mkcert -CAROOT)/rootCA.pem"

        for dir_name in backend frontend; do
            local crt_file="$CERTS_DIR/$dir_name/server.crt"
            if [[ -f "$crt_file" ]]; then
                if openssl verify -CAfile "$mkcert_ca" "$crt_file" &>/dev/null; then
                    log_success "$dir_name certificate is valid (mkcert-signed, trusted by browsers)"
                    local expiry=$(openssl x509 -in "$crt_file" -noout -enddate | cut -d= -f2)
                    log_info "  Expires: $expiry"
                else
                    log_error "$dir_name certificate verification failed"
                    ((errors++))
                fi
            fi
        done
    else
        # OpenSSL fallback: verify against our custom CA
        if [[ -f "$CA_DIR/ca.crt" ]]; then
            if openssl x509 -in "$CA_DIR/ca.crt" -noout -checkend 0 2>/dev/null; then
                log_success "CA certificate is valid"
                local ca_expiry=$(openssl x509 -in "$CA_DIR/ca.crt" -noout -enddate | cut -d= -f2)
                log_info "  Expires: $ca_expiry"
            else
                log_error "CA certificate is invalid or expired"
                ((errors++))
            fi
        fi

        if [[ -f "$BACKEND_DIR/server.crt" ]]; then
            if openssl verify -CAfile "$CA_DIR/ca.crt" "$BACKEND_DIR/server.crt" &>/dev/null; then
                log_success "Backend certificate is valid and signed by CA"
                local be_expiry=$(openssl x509 -in "$BACKEND_DIR/server.crt" -noout -enddate | cut -d= -f2)
                log_info "  Expires: $be_expiry"
            else
                log_error "Backend certificate verification failed"
                ((errors++))
            fi
        fi

        if [[ -f "$FRONTEND_DIR/server.crt" ]]; then
            if openssl verify -CAfile "$CA_DIR/ca.crt" "$FRONTEND_DIR/server.crt" &>/dev/null; then
                log_success "Frontend certificate is valid and signed by CA"
                local fe_expiry=$(openssl x509 -in "$FRONTEND_DIR/server.crt" -noout -enddate | cut -d= -f2)
                log_info "  Expires: $fe_expiry"
            else
                log_error "Frontend certificate verification failed"
                ((errors++))
            fi
        fi
    fi

    return $errors
}

# Show summary
show_summary() {
    local use_mkcert="$1"

    echo ""
    echo "============================================"
    echo "  Certificate Generation Complete"
    echo "============================================"
    echo ""
    echo "Certificates location: $CERTS_DIR"
    echo ""
    echo "Files generated:"
    if [[ "$use_mkcert" != "true" ]]; then
        echo "  - CA Certificate:       $CA_DIR/ca.crt"
        echo "  - CA Private Key:       $CA_DIR/ca.key (KEEP SECURE!)"
    fi
    echo "  - Backend Certificate:  $BACKEND_DIR/server.crt"
    echo "  - Backend Key:          $BACKEND_DIR/server.key"
    echo "  - Frontend Certificate: $FRONTEND_DIR/server.crt"
    echo "  - Frontend Key:         $FRONTEND_DIR/server.key"
    echo ""

    if [[ "$use_mkcert" == "true" ]]; then
        echo "Generated with mkcert - certificates are automatically trusted"
        echo "by your system and browsers (Firefox, Chrome/Chromium)."
    else
        echo "Generated with OpenSSL - you must manually trust the CA:"
        echo ""
        echo "  Option 1: Import $CA_DIR/ca.crt into your browser"
        echo "  Option 2: System-wide (Linux):"
        echo "    sudo cp $CA_DIR/ca.crt /usr/local/share/ca-certificates/docpat-dev-ca.crt"
        echo "    sudo update-ca-certificates"
    fi

    echo ""
    echo "Start the servers:"
    echo "  Backend:  cd backend && RUST_LOG=info cargo run --bin docpat-backend --features \"rbac,report-export,pdf-export\""
    echo "  Frontend: cd frontend && npm run dev"
    echo ""
    echo "============================================"
}

# Main execution
main() {
    local clean=false
    local ca_only=false
    local backend_only=false
    local frontend_only=false
    local force_no_mkcert=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean)
                clean=true
                shift
                ;;
            --ca-only)
                ca_only=true
                shift
                ;;
            --backend)
                backend_only=true
                shift
                ;;
            --frontend)
                frontend_only=true
                shift
                ;;
            --no-mkcert)
                force_no_mkcert=true
                shift
                ;;
            --help|-h)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done

    echo ""
    echo "============================================"
    echo "  DocPat Certificate Generator"
    echo "============================================"
    echo ""

    # Determine generation method
    local use_mkcert=false
    if [[ "$force_no_mkcert" != "true" ]] && command -v mkcert &> /dev/null; then
        use_mkcert=true
        log_info "mkcert detected - using mkcert for browser-trusted certificates"
    else
        log_info "Using OpenSSL for certificate generation"
        if [[ "$force_no_mkcert" != "true" ]]; then
            log_warn "Install mkcert for automatic browser trust: https://github.com/FiloSottile/mkcert"
        fi
    fi

    # Clean if requested
    if $clean; then
        clean_certs
    fi

    # Create directories
    create_directories

    # Determine target
    local target="all"
    if $ca_only; then
        target="ca"
    elif $backend_only; then
        target="backend"
    elif $frontend_only; then
        target="frontend"
    fi

    # Generate certificates
    if [[ "$use_mkcert" == "true" ]]; then
        if [[ "$target" == "ca" ]]; then
            log_info "mkcert manages its own CA - nothing to do for --ca-only"
            log_info "Run 'mkcert -install' to ensure the CA is trusted"
        else
            generate_with_mkcert "$target"
        fi
    else
        generate_with_openssl "$target"
    fi

    # Verify
    echo ""
    verify_certs "$use_mkcert"

    # Show summary
    show_summary "$use_mkcert"
}

# Run main
main "$@"
