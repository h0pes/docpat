#!/bin/bash
#
# DocPat Certificate Generation Script
#
# Generates self-signed certificates for local development TLS/HTTPS.
# Creates a local CA (Certificate Authority) and signs server certificates.
#
# Usage:
#   ./scripts/generate-certs.sh           # Generate all certificates
#   ./scripts/generate-certs.sh --clean   # Remove existing certs and regenerate
#   ./scripts/generate-certs.sh --help    # Show help
#
# Output structure:
#   certs/
#   ├── ca/
#   │   ├── ca.crt           # CA certificate (add to browser/system trust)
#   │   └── ca.key           # CA private key (keep secure)
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

# Certificate settings
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

Generates self-signed TLS certificates for local development.

Usage:
  $0 [OPTIONS]

Options:
  --clean       Remove existing certificates and regenerate
  --ca-only     Only generate CA certificate
  --backend     Only generate backend certificate (requires CA)
  --frontend    Only generate frontend certificate (requires CA)
  --help, -h    Show this help message

Examples:
  $0                    # Generate all certificates
  $0 --clean            # Clean and regenerate all
  $0 --backend          # Regenerate only backend cert

After generation:
  1. For browsers to trust the certificates, import ca/ca.crt:
     - Chrome: Settings > Privacy and Security > Security > Manage certificates
     - Firefox: Settings > Privacy & Security > Certificates > View Certificates
     - System-wide (Linux): sudo cp certs/ca/ca.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates

  2. Set environment variables:
     TLS_ENABLED=true
     TLS_CERT_PATH=./certs/backend/server.crt
     TLS_KEY_PATH=./certs/backend/server.key

  3. For frontend (Vite), certificates are auto-configured via vite.config.ts

EOF
    exit 0
}

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
EOF

    log_success "Directory structure created at $CERTS_DIR"
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

# Generate backend certificate
generate_backend_cert() {
    generate_server_cert "backend" "localhost" "$BACKEND_DIR"
}

# Generate frontend certificate
generate_frontend_cert() {
    generate_server_cert "frontend" "localhost" "$FRONTEND_DIR"
}

# Clean all certificates
clean_certs() {
    log_warn "Removing all existing certificates..."
    rm -rf "$CERTS_DIR"
    log_success "Certificates removed."
}

# Verify certificates
verify_certs() {
    log_info "Verifying certificates..."

    local errors=0

    if [[ -f "$CA_DIR/ca.crt" ]]; then
        if openssl x509 -in "$CA_DIR/ca.crt" -noout -checkend 0 2>/dev/null; then
            log_success "CA certificate is valid"
            # Show expiry
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

    return $errors
}

# Show summary
show_summary() {
    echo ""
    echo "============================================"
    echo "  Certificate Generation Complete"
    echo "============================================"
    echo ""
    echo "Certificates location: $CERTS_DIR"
    echo ""
    echo "Files generated:"
    echo "  - CA Certificate:       $CA_DIR/ca.crt"
    echo "  - CA Private Key:       $CA_DIR/ca.key (KEEP SECURE!)"
    echo "  - Backend Certificate:  $BACKEND_DIR/server.crt"
    echo "  - Backend Key:          $BACKEND_DIR/server.key"
    echo "  - Frontend Certificate: $FRONTEND_DIR/server.crt"
    echo "  - Frontend Key:         $FRONTEND_DIR/server.key"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. (Optional) Trust the CA certificate system-wide:"
    echo "   Linux:"
    echo "     sudo cp $CA_DIR/ca.crt /usr/local/share/ca-certificates/docpat-dev-ca.crt"
    echo "     sudo update-ca-certificates"
    echo ""
    echo "2. Update backend .env file:"
    echo "     TLS_ENABLED=true"
    echo "     TLS_CERT_PATH=./certs/backend/server.crt"
    echo "     TLS_KEY_PATH=./certs/backend/server.key"
    echo ""
    echo "3. Update CORS_ALLOWED_ORIGINS in .env to include https://localhost:5173"
    echo ""
    echo "4. Frontend Vite is auto-configured to use certificates"
    echo ""
    echo "5. Start the servers:"
    echo "   Backend:  cd backend && RUST_LOG=info cargo run --bin docpat-backend --features \"rbac,report-export,pdf-export\""
    echo "   Frontend: cd frontend && npm run dev"
    echo ""
    echo "============================================"
}

# Main execution
main() {
    local clean=false
    local ca_only=false
    local backend_only=false
    local frontend_only=false

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

    # Check prerequisites
    check_openssl

    # Clean if requested
    if $clean; then
        clean_certs
    fi

    # Create directories
    create_directories

    # Generate certificates based on options
    if $ca_only; then
        generate_ca
    elif $backend_only; then
        generate_backend_cert
    elif $frontend_only; then
        generate_frontend_cert
    else
        # Generate all
        generate_ca
        generate_backend_cert
        generate_frontend_cert
    fi

    # Verify
    echo ""
    verify_certs

    # Show summary
    show_summary
}

# Run main
main "$@"
