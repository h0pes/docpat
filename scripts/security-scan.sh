#!/bin/bash
# ==============================================================================
# DocPat Docker Security Scanner
# Run all security scans and generate reports
# ==============================================================================
#
# Usage:
#   ./scripts/security-scan.sh              # Run from project root
#   ./scripts/security-scan.sh --full       # Include LOW/MEDIUM vulnerabilities
#
# Requirements:
#   - Trivy installed (https://aquasecurity.github.io/trivy/)
#   - Docker images built and available locally
#
# ==============================================================================

set -e

# Configuration
REPORT_DIR="${REPORT_DIR:-/opt/docpat/security-reports}"
IMAGES=("docpat-backend:latest" "docpat-frontend:latest" "docpat-nginx:latest" "postgres:18-alpine")
SEVERITY="HIGH,CRITICAL"
DATE=$(date +%Y-%m-%d)

# Parse arguments
if [[ "$1" == "--full" ]]; then
    SEVERITY="LOW,MEDIUM,HIGH,CRITICAL"
    echo "Running full scan (including LOW and MEDIUM)"
fi

# Create report directory
mkdir -p "$REPORT_DIR"

echo "=============================================="
echo "DocPat Security Scan"
echo "Date: $(date)"
echo "Report Directory: $REPORT_DIR"
echo "Severity Filter: $SEVERITY"
echo "=============================================="
echo ""

# Check if trivy is installed
if ! command -v trivy &> /dev/null; then
    echo "ERROR: Trivy is not installed."
    echo "Install with: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin"
    exit 1
fi

# Scan each image
echo "=== Vulnerability Scanning ==="
for image in "${IMAGES[@]}"; do
    echo ""
    echo "--- Scanning $image ---"
    trivy image "$image" --severity "$SEVERITY"
done

echo ""
echo "=== Secret Scanning ==="
for image in "${IMAGES[@]}"; do
    # Skip postgres for secret scanning (official image)
    if [[ "$image" == postgres* ]]; then
        continue
    fi
    echo ""
    echo "--- Scanning $image for secrets ---"
    trivy image "$image" --scanners secret
done

echo ""
echo "=== Generating SBOM Files ==="
for image in "${IMAGES[@]}"; do
    # Create safe filename from image name
    filename=$(echo "$image" | tr ':/' '-')
    echo "Generating SBOM for $image -> $REPORT_DIR/sbom-$filename-$DATE.json"
    trivy image "$image" --format spdx-json -o "$REPORT_DIR/sbom-$filename-$DATE.json" 2>/dev/null
done

echo ""
echo "=== Generating HTML Reports ==="
# Download HTML template if not exists
if [[ ! -f "$REPORT_DIR/html.tpl" ]]; then
    echo "Downloading HTML template..."
    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/html.tpl -o "$REPORT_DIR/html.tpl"
fi

for image in "${IMAGES[@]}"; do
    filename=$(echo "$image" | tr ':/' '-')
    echo "Generating HTML report for $image -> $REPORT_DIR/$filename-$DATE.html"
    trivy image "$image" --format template --template "@$REPORT_DIR/html.tpl" -o "$REPORT_DIR/$filename-$DATE.html" 2>/dev/null
done

echo ""
echo "=============================================="
echo "Scan Complete!"
echo "Reports saved to: $REPORT_DIR"
echo "=============================================="
echo ""
echo "Files generated:"
ls -la "$REPORT_DIR"/*"$DATE"* 2>/dev/null || echo "No dated files found"
