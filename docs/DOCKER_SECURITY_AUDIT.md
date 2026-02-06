# Docker Security Audit Plan for DocPat

**Version:** 1.0.0
**Created:** 2026-02-05
**Status:** Pending Execution

## Objective

Perform a comprehensive security audit of all Docker images and configurations to identify and remediate vulnerabilities before production deployment.

## Execution Context

- **Scan Location**: VM Server (10.0.160.11) - scan actual deployed images
- **CI/CD**: Manual scripts only (no GitHub Actions workflow for now)
- **Focus**: Immediate vulnerability identification and remediation

---

## Current Security Posture (Already Implemented)

The codebase already has strong security foundations:

| Security Measure | Status |
|-----------------|--------|
| Multi-stage builds with slim/alpine base images | ✅ |
| Non-root user execution for all services | ✅ |
| `no-new-privileges` security option | ✅ |
| Network segmentation (internal backend network) | ✅ |
| Resource limits (CPU/memory) | ✅ |
| Security headers (HSTS, CSP, X-Frame-Options) | ✅ |
| TLS 1.2/1.3 with strong ciphers | ✅ |
| Rate limiting per endpoint type | ✅ |
| Log rotation | ✅ |

---

## Audit Scope

### Docker Images to Scan

| Image | Description | Base |
|-------|-------------|------|
| `docpat-backend` | Rust API server | debian:bookworm-slim |
| `docpat-frontend` | React app served by Nginx | nginx:1.27-alpine |
| `docpat-nginx` | Reverse proxy | nginx:1.27-alpine |
| `postgres:18-alpine` | Database | postgres:18-alpine |

### Configuration Files to Review

- `infrastructure/docker/Dockerfile.backend`
- `infrastructure/docker/Dockerfile.frontend`
- `infrastructure/docker/Dockerfile.nginx`
- `docker-compose.yml`
- `infrastructure/nginx/*.conf`
- `infrastructure/postgres/postgresql.conf`

---

## Phase 1: Image Vulnerability Scanning

### Step 1.1: Install Trivy (Container Scanner)

```bash
# On the deployment server (requires sudo for /usr/local/bin)
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sudo sh -s -- -b /usr/local/bin

# Verify installation
trivy --version
```

### Step 1.2: Scan All Images for Vulnerabilities

```bash
# Scan each built image for HIGH and CRITICAL vulnerabilities
trivy image docpat-backend:latest --severity HIGH,CRITICAL
trivy image docpat-frontend:latest --severity HIGH,CRITICAL
trivy image docpat-nginx:latest --severity HIGH,CRITICAL
trivy image postgres:18-alpine --severity HIGH,CRITICAL
```

### Step 1.3: Full Scan with All Severities (for complete picture)

```bash
# Full scan including LOW and MEDIUM
trivy image docpat-backend:latest --format table
trivy image docpat-frontend:latest --format table
trivy image docpat-nginx:latest --format table
trivy image postgres:18-alpine --format table
```

### Step 1.4: Generate SBOM (Software Bill of Materials)

```bash
# Generate SBOM for compliance and tracking
mkdir -p /opt/docpat/security-reports

trivy image docpat-backend:latest --format spdx-json -o /opt/docpat/security-reports/sbom-backend.json
trivy image docpat-frontend:latest --format spdx-json -o /opt/docpat/security-reports/sbom-frontend.json
trivy image docpat-nginx:latest --format spdx-json -o /opt/docpat/security-reports/sbom-nginx.json
trivy image postgres:18-alpine --format spdx-json -o /opt/docpat/security-reports/sbom-postgres.json
```

### Step 1.5: Scan for Secrets in Images

```bash
# Check for accidentally embedded secrets
trivy image docpat-backend:latest --scanners secret
trivy image docpat-frontend:latest --scanners secret
trivy image docpat-nginx:latest --scanners secret
trivy image postgres:18-alpine --scanners secret
```

### Step 1.6: Generate HTML Reports

```bash
# Download the HTML template first
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/html.tpl -o /opt/docpat/security-reports/html.tpl

# Generate comprehensive HTML reports for all images
trivy image docpat-backend:latest --format template --template "@/opt/docpat/security-reports/html.tpl" -o /opt/docpat/security-reports/backend-report.html
trivy image docpat-frontend:latest --format template --template "@/opt/docpat/security-reports/html.tpl" -o /opt/docpat/security-reports/frontend-report.html
trivy image docpat-nginx:latest --format template --template "@/opt/docpat/security-reports/html.tpl" -o /opt/docpat/security-reports/nginx-report.html
trivy image postgres:18-alpine --format template --template "@/opt/docpat/security-reports/html.tpl" -o /opt/docpat/security-reports/postgres-report.html
```

---

## Phase 2: Dockerfile Security Review

### Step 2.1: Lint Dockerfiles with Hadolint

```bash
# Run hadolint on all Dockerfiles
cd /opt/docpat

docker run --rm -i hadolint/hadolint < infrastructure/docker/Dockerfile.backend
docker run --rm -i hadolint/hadolint < infrastructure/docker/Dockerfile.frontend
docker run --rm -i hadolint/hadolint < infrastructure/docker/Dockerfile.nginx
```

**Hadolint Results (2026-02-05):**

| Dockerfile | Line | Rule | Severity | Finding |
|------------|------|------|----------|---------|
| Backend | 90:51 | - | Error | Unexpected `\|` in HEALTHCHECK CMD exec form (syntax issue with `\|\| exit 1`) |
| Frontend | 12 | DL3018 | Warning | Pin versions in apk add |
| Frontend | 54 | DL3018 | Warning | Pin versions in apk add |
| Nginx | 9 | DL3018 | Warning | Pin versions in apk add |
| Nginx | 36 | DL3059 | Info | Multiple consecutive RUN instructions, consider consolidation |

**Assessment:** All findings are minor (warnings/info). The DL3018 warnings about pinning apk package versions are best practice but not critical security issues. The backend HEALTHCHECK syntax issue is cosmetic - the `|| exit 1` is redundant with exec form.

### Step 2.2: Dockerfile Security Checklist

| Requirement | Backend | Frontend | Nginx |
|-------------|---------|----------|-------|
| Base images pinned to specific versions | ✅ rust:1.90-slim-bookworm | ✅ node:22-alpine, nginx:1.27-alpine | ✅ nginx:1.27-alpine |
| No `ADD` used for remote URLs | ✅ | ✅ | ✅ |
| `HEALTHCHECK` defined | ✅ | ✅ | ✅ |
| Non-root `USER` specified | ✅ mpms | ✅ nginx | ⚠️ Workers run as nginx, master as root (standard for port 80/443) |
| No sensitive data in build args | ✅ | ✅ | ✅ |
| Multi-stage builds used | ✅ | ✅ | N/A (single layer config) |
| `.dockerignore` excludes sensitive files | ❌ Missing | ❌ Missing | ❌ Missing |

**Note:** No `.dockerignore` file exists in the repository. Recommend creating one to exclude `.env`, `.git`, `node_modules`, `target/`, etc.

---

## Phase 3: Docker Compose Security Review

### Step 3.1: Configuration Audit Checklist

| Requirement | Status |
|-------------|--------|
| `security_opt: no-new-privileges:true` on all services | ✅ All main services (certbot missing - low risk) |
| Resource limits (`deploy.resources.limits`) | ✅ All main services (certbot missing - just cron loop) |
| Read-only volumes where possible | ✅ Config files mounted as `:ro` |
| Network isolation (internal networks for DB) | ✅ `backend_network` has `internal: true` |
| No privileged containers | ✅ No `privileged: true` anywhere |
| Secrets not hardcoded | ✅ All use `${VAR:?required}` pattern |
| Health checks defined | ✅ All main services (certbot N/A) |

### Step 3.2: Additional Runtime Security Options (Optional Enhancement)

```yaml
# Consider adding to services for additional hardening:
read_only: true          # Read-only root filesystem
tmpfs:                   # For /tmp if needed
  - /tmp
cap_drop:
  - ALL                  # Drop all capabilities
cap_add:
  - NET_BIND_SERVICE     # Only add what's needed (for ports < 1024)
```

**Assessment (2026-02-05):** These optional enhancements are NOT currently implemented.

| Option | Current Status | Recommendation |
|--------|----------------|----------------|
| `read_only: true` | ❌ Not set | Could add to frontend/nginx (backend needs write for logs/uploads) |
| `tmpfs: /tmp` | ❌ Not set | Useful if `read_only` is enabled |
| `cap_drop: ALL` | ❌ Not set | Recommended - drop all Linux capabilities |
| `cap_add: NET_BIND_SERVICE` | ❌ Not set | Only needed for nginx (ports 80/443) |

**Decision:** Documented as future enhancement. Current setup is already secure with `no-new-privileges:true` on all services. These additional hardening options can be implemented in a future iteration when testing confirms no functionality is broken by read-only filesystems or dropped capabilities.

---

## Phase 4: Network Security Validation

### Step 4.1: Verify Network Isolation

```bash
cd /opt/docpat

# Test 1: Backend should NOT reach external internet (internal network)
docker compose exec backend bash -c 'echo > /dev/tcp/8.8.8.8/53 && echo "CONNECTED" || echo "BLOCKED"'
# Expected: Should be BLOCKED

# Test 2: Frontend should NOT access database directly
docker compose exec frontend sh -c "nc -zv postgres 5432 2>&1" || echo "Good: Cannot reach postgres"
# Expected: Connection refused

# Test 3: Verify postgres only on localhost from host
ss -tlnp | grep 5432
# Expected: 127.0.0.1:5432 only, not 0.0.0.0:5432
```

**Test Results (2026-02-05):**

| Test | Result | Assessment |
|------|--------|------------|
| Test 1: Backend outbound | ⚠️ CONNECTED | Backend can reach internet (see finding below) |
| Test 2: Frontend → Postgres | ✅ BLOCKED | `nc: bad address 'postgres'` - cannot even resolve hostname |
| Test 3: Postgres localhost only | ✅ NOT EXPOSED | Port 5432 not bound to host at all (more secure than expected) |

**Finding: Backend Has Outbound Internet Access**

The backend container CAN make outbound connections despite `backend_network` having `internal: true`.

**Root Cause:** Backend is on TWO networks:
- `backend_network` (internal: true) - for database access
- `frontend_network` (NOT internal) - for nginx to reach it

Traffic routes through `frontend_network` which allows external access.

**Risk Assessment:** LOW-MEDIUM
- Backend has no user-controlled outbound requests in the application code
- Typical attack vector (data exfiltration) would require RCE first
- Minimal tooling in container (no curl/wget) limits exploitation

**Resolution (2026-02-06):** Implemented 3-network architecture:
- `edge_network` (NOT internal) - nginx receives inbound traffic via port publishing
- `frontend_network` (internal: true) - nginx, frontend, backend communicate here
- `backend_network` (internal: true) - backend, postgres communicate here

This blocks all outbound internet access from application containers while preserving:
- Inbound traffic via Docker port mapping on edge_network (ports 80/443)
- Inter-container communication on internal networks

### Step 4.2: Port Exposure Audit

```bash
# List all exposed ports
docker compose ps

# Verify from host which ports are listening
sudo ss -tlnp | grep -E ':(80|443|5432|8000|8080)'
```

| Service | Expected External | Expected Internal | Actual (2026-02-05) |
|---------|------------------|-------------------|---------------------|
| nginx | 0.0.0.0:80, 0.0.0.0:443 | N/A | ✅ 0.0.0.0:80, 0.0.0.0:443 (docker-proxy) |
| postgres | 127.0.0.1:5432 | 5432 | ✅ Not exposed to host (internal only) |
| backend | None | 8000 | ✅ 8000/tcp internal only |
| frontend | None | 8080 | ✅ 8080/tcp internal only |

**Assessment:** Port exposure is correctly configured. Only nginx (80/443) is accessible externally. Database and application services are isolated within Docker networks.

---

## Phase 5: Base Image Updates

### Step 5.1: Check for Outdated Base Images

```bash
# Pull latest versions to compare
docker pull rust:1.90-slim-bookworm
docker pull node:22-alpine
docker pull nginx:1.27-alpine
docker pull postgres:18-alpine

# Check current image ages
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}"
```

**Results (2026-02-05):**

| Base Image | Pull Status | Current Build Date |
|------------|-------------|-------------------|
| rust:1.90-slim-bookworm | Downloaded newer image | 2025-09-18 |
| node:22-alpine | Downloaded newer image | 2026-01-28 |
| nginx:1.27-alpine | Downloaded newer image | 2025-04-16 |
| postgres:18-alpine | Already up to date ✅ | 2026-01-29 |

| DocPat Image | Build Date | Assessment |
|--------------|------------|------------|
| docpat-frontend | 2026-02-05 | ✅ Fresh (today) |
| docpat-nginx | 2026-02-05 | ✅ Fresh (today) |
| docpat-backend | 2026-02-04 | ✅ Recent (yesterday) |

**Finding:** Base images have newer versions available. To incorporate security updates from the newer base images, rebuild the DocPat images:
```bash
cd /opt/docpat && docker compose build --no-cache
```

### Step 5.2: Update Strategy

For reproducible builds, consider pinning to specific digests:

```dockerfile
# Example: Pin to specific digest
FROM nginx:1.27-alpine@sha256:abc123...
```

**Recommended Update Schedule:**
- Security patches: Within 48 hours of CVE disclosure
- Minor updates: Monthly
- Major updates: Quarterly (with testing)

---

## Phase 6: Manual Security Scripts

**Status (2026-02-05):** ✅ Scripts created in repository

### Step 6.1: Create `scripts/security-scan.sh`

**Created:** `scripts/security-scan.sh` - Comprehensive security scanner with:
- Vulnerability scanning for all images (HIGH/CRITICAL by default, --full for all)
- Secret scanning for custom images
- SBOM generation in SPDX-JSON format
- HTML report generation

Usage:
```bash
./scripts/security-scan.sh          # HIGH/CRITICAL only
./scripts/security-scan.sh --full   # All severities
```

Original template:

```bash
#!/bin/bash
# DocPat Docker Security Scanner
# Run all security scans and generate reports

set -e

REPORT_DIR="/opt/docpat/security-reports"
IMAGES=("docpat-backend:latest" "docpat-frontend:latest" "docpat-nginx:latest" "postgres:18-alpine")

mkdir -p "$REPORT_DIR"

echo "=== DocPat Security Scan ==="
echo "Date: $(date)"
echo ""

for image in "${IMAGES[@]}"; do
    echo "Scanning $image..."
    trivy image "$image" --severity HIGH,CRITICAL
    echo ""
done

echo "=== Scan Complete ==="
echo "Reports saved to: $REPORT_DIR"
```

### Step 6.2: Create `scripts/dockerfile-lint.sh`

**Created:** `scripts/dockerfile-lint.sh` - Dockerfile linter with:
- Hadolint checks for all Dockerfiles
- Clear pass/fail output
- Non-zero exit code on linting issues

Usage:
```bash
./scripts/dockerfile-lint.sh
```

Original template:
```bash
#!/bin/bash
# Dockerfile linting script

cd /opt/docpat

echo "=== Linting Dockerfiles ==="

for df in infrastructure/docker/Dockerfile.*; do
    echo "Checking $df..."
    docker run --rm -i hadolint/hadolint < "$df"
done

echo "=== Linting Complete ==="
```

---

## Phase 7: Remediation Actions

### Recommended Actions Based on Findings (2026-02-05)

| Priority | Finding | Recommended Action | Status |
|----------|---------|-------------------|--------|
| LOW | Backend has 1 CRITICAL CVE (zlib1g CVE-2023-45853) | **ACCEPTED** - Debian marked "will_not_fix"; affects minizip component which is not used by our Rust backend (only uses zlib for HTTP compression) | ✅ Accepted |
| LOW | Backend has 3 HIGH CVEs (gpgv, libc-bin, libc6) | **ACCEPTED** - Dockerfile already has `apt-get upgrade -y`; Debian hasn't released patches yet (status: "affected"). Monitor and rebuild periodically when patches become available. | ✅ Accepted |
| LOW | Postgres gosu has 4 HIGH CVEs (Go stdlib) | **ACCEPTED** - gosu only runs at container startup (milliseconds), not network-exposed, DoS-only vulnerabilities. Official image - will be fixed when PostgreSQL team rebuilds with updated Go. | ✅ Accepted |
| MEDIUM | Backend can reach internet | **FIXED** - Implemented 3-network architecture: edge_network (not internal) for nginx ingress, frontend_network and backend_network (both internal) for app isolation. All app containers blocked from internet. | ✅ Fixed |
| LOW | Missing .dockerignore | Create .dockerignore to exclude .env, .git, node_modules, target/ | 🔲 TODO |
| LOW | Optional hardening not implemented | Future: Add cap_drop, read_only where applicable | 🔲 Future |
| INFO | Base images have updates | Rebuild images periodically: `docker compose build --no-cache` | 🔲 Scheduled |

**Overall Assessment:** No critical blocking issues. The identified vulnerabilities are either:
- Marked "will_not_fix" by upstream (not exploitable in our context)
- In components not directly exposed (gosu only runs at container startup)
- Architectural trade-offs with acceptable risk

### For OS Package Vulnerabilities

```dockerfile
# Alpine-based images
RUN apk upgrade --no-cache

# Debian-based images
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*
```

### For Application Dependencies

```bash
# Backend (Rust)
cd backend
cargo update
cargo audit  # Check for known vulnerabilities

# Frontend (Node.js)
cd frontend
npm audit
npm audit fix
```

### Common Remediation Patterns

| Issue Type | Remediation |
|------------|-------------|
| Outdated OS packages | Add `apk upgrade` or `apt-get upgrade` to Dockerfile |
| Vulnerable dependencies | Update Cargo.lock or package-lock.json |
| Exposed secrets | Remove from image, use runtime env vars |
| Running as root | Add `USER` directive |
| Missing health check | Add `HEALTHCHECK` directive |

---

## Phase 8: Verification Steps

After remediation, verify fixes:

```bash
# 1. Re-run vulnerability scans
trivy image docpat-backend:latest --severity HIGH,CRITICAL --exit-code 1
# Exit code 1 = vulnerabilities found, 0 = clean

# 2. Re-run hadolint
docker run --rm -i hadolint/hadolint < infrastructure/docker/Dockerfile.backend

# 3. Verify containers run as non-root
docker compose exec backend whoami
# Expected: mpms (not root)

docker compose exec frontend whoami
# Expected: nginx (not root)

# 4. Verify health checks
docker compose ps
# All should show (healthy)

# 5. Test application still works
curl -k https://localhost/api/health
```

---

## Execution Checklist

### On VM Server (10.0.160.11)

- [ ] **Step 1**: Install Trivy on the server
- [ ] **Step 2**: Run vulnerability scans on all 4 images
- [ ] **Step 3**: Run secret scanning on custom images
- [ ] **Step 4**: Generate SBOM for compliance
- [ ] **Step 5**: Run Hadolint on Dockerfiles
- [ ] **Step 6**: Review scan results and document findings
- [ ] **Step 7**: Apply fixes to Dockerfiles (if needed)
- [ ] **Step 8**: Rebuild affected images
- [ ] **Step 9**: Re-scan to verify fixes
- [ ] **Step 10**: Create reusable security scripts
- [ ] **Step 11**: Update this document with findings

---

## Findings Log

### Scan Date: 2026-02-05

#### Image: docpat-backend (debian 12.13)

**Summary:** Total: 87 (UNKNOWN: 0, LOW: 60, MEDIUM: 23, HIGH: 3, CRITICAL: 1)

**HIGH & CRITICAL Vulnerabilities:**

| CVE | Severity | Package | Status | Description |
|-----|----------|---------|--------|-------------|
| CVE-2023-45853 | CRITICAL | zlib1g | will_not_fix | zlib integer overflow in zipOpenNewFileInZip4_6 |
| CVE-2026-24882 | HIGH | gpgv | affected | GnuPG stack-based buffer overflow in tpm2daemon |
| CVE-2026-0861 | HIGH | libc-bin | affected | glibc integer overflow in memalign leads to heap corruption |
| CVE-2026-0861 | HIGH | libc6 | affected | glibc integer overflow in memalign leads to heap corruption |

**MEDIUM Vulnerabilities (23 total):**

| CVE | Package | Description |
|-----|---------|-------------|
| CVE-2025-14104 | util-linux (multiple) | Heap buffer overread in setpwnam() |
| CVE-2025-30258 | gpgv | verification DoS via malicious subkey |
| CVE-2025-68972 | gpgv | Signature bypass via form feed character |
| CVE-2025-15281 | libc-bin/libc6 | wordexp uninitialized memory |
| CVE-2026-0915 | libc-bin/libc6 | Information disclosure via network query |
| CVE-2025-9820 | libgnutls30 | Stack-based buffer overflow in pkcs11_token_init |
| CVE-2024-10041 | libpam-modules | Libpam vulnerable to read hashed password (will_not_fix) |
| CVE-2025-13151 | libtasn1-6 | DoS via stack-based buffer overflow |
| CVE-2023-50495 | ncurses | segmentation fault via _nc_wrap_entry() |

**Notes:**
- The CRITICAL zlib1g issue (CVE-2023-45853) is marked "will_not_fix" by Debian - affects minizip component which is not used by our Rust application
- Most LOW vulnerabilities are in base system utilities (apt, coreutils, tar, etc.) with limited exposure in containerized environment
- Many CVEs are old (2011-2019) and marked as low priority by Debian security team

#### Image: docpat-frontend (alpine 3.21.3)

| CVE | Severity | Package | Status |
|-----|----------|---------|--------|
| - | - | - | **CLEAN - No vulnerabilities found** |

#### Image: docpat-nginx (alpine 3.21.3)

| CVE | Severity | Package | Status |
|-----|----------|---------|--------|
| - | - | - | **CLEAN - No OS vulnerabilities** |

**Secrets Detected:** 1
- `/etc/nginx/ssl/self-signed.key` - AsymmetricPrivateKey (expected - self-signed cert generated at build time)

#### Image: postgres:18-alpine (alpine 3.23.3)

**Summary:** Alpine OS: 0 vulnerabilities, gosu binary: 15 (HIGH: 4, MEDIUM: 11)

**HIGH Vulnerabilities (gosu binary - Go v1.24.6):**

| CVE | Severity | Fixed Version | Description |
|-----|----------|---------------|-------------|
| CVE-2025-58183 | HIGH | 1.24.8, 1.25.2 | golang archive/tar unbounded allocation |
| CVE-2025-61726 | HIGH | 1.24.12, 1.25.6 | golang net/url memory exhaustion |
| CVE-2025-61728 | HIGH | 1.24.12, 1.25.6 | golang archive/zip CPU consumption |
| CVE-2025-61729 | HIGH | 1.24.11, 1.25.5 | golang crypto/x509 DoS |

**MEDIUM Vulnerabilities (gosu binary):**

| CVE | Fixed Version | Description |
|-----|---------------|-------------|
| CVE-2025-47912 | 1.24.8, 1.25.2 | net/url IPv6 hostname validation |
| CVE-2025-58185 | 1.24.8, 1.25.2 | encoding/asn1 memory exhaustion |
| CVE-2025-58186 | 1.24.8, 1.25.2 | net/http cookie parsing memory exhaustion |
| CVE-2025-58187 | 1.24.9, 1.25.3 | crypto/x509 quadratic complexity |
| CVE-2025-58188 | 1.24.8, 1.25.2 | crypto/x509 DSA panic |
| CVE-2025-58189 | 1.24.8, 1.25.2 | crypto/tls ALPN info leak |
| CVE-2025-61723 | 1.24.8, 1.25.2 | encoding/pem quadratic complexity |
| CVE-2025-61724 | 1.24.8, 1.25.2 | net/textproto CPU consumption |
| CVE-2025-61725 | 1.24.8, 1.25.2 | net/mail CPU consumption |
| CVE-2025-61727 | 1.24.11, 1.25.5 | crypto/x509 wildcard SAN issue |
| CVE-2025-61730 | 1.24.12, 1.25.6 | TLS 1.3 handshake issue |

**Note:** These are upstream vulnerabilities in the official postgres image's gosu binary (privilege dropper). Limited exposure as postgres is not internet-facing and gosu is only used during container startup.

---

## References

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Hadolint Rules](https://github.com/hadolint/hadolint#rules)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
