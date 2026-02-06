#!/bin/bash
# ==============================================================================
# DocPat Dockerfile Linting Script
# Run Hadolint on all Dockerfiles
# ==============================================================================
#
# Usage:
#   ./scripts/dockerfile-lint.sh            # Run from project root
#
# Requirements:
#   - Docker installed (uses hadolint/hadolint image)
#
# ==============================================================================

set -e

# Configuration
DOCKERFILE_DIR="infrastructure/docker"
DOCKERFILES=(
    "Dockerfile.backend"
    "Dockerfile.frontend"
    "Dockerfile.nginx"
)

echo "=============================================="
echo "DocPat Dockerfile Linting"
echo "Date: $(date)"
echo "=============================================="
echo ""

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH"
    exit 1
fi

# Track if any errors found
ERRORS_FOUND=0

for dockerfile in "${DOCKERFILES[@]}"; do
    filepath="$DOCKERFILE_DIR/$dockerfile"

    if [[ ! -f "$filepath" ]]; then
        echo "WARNING: $filepath not found, skipping"
        continue
    fi

    echo "--- Linting $filepath ---"

    # Run hadolint and capture exit code
    if docker run --rm -i hadolint/hadolint < "$filepath"; then
        echo "OK: No issues found"
    else
        ERRORS_FOUND=1
    fi
    echo ""
done

echo "=============================================="
if [[ $ERRORS_FOUND -eq 0 ]]; then
    echo "All Dockerfiles passed linting!"
    exit 0
else
    echo "Some Dockerfiles have linting issues (see above)"
    exit 1
fi
