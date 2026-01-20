# Security Guidelines - Medical Practice Management System

**Version**: 2.0.0
**Last Updated**: January 2026
**Status**: Production Ready

---

## Table of Contents

- [Overview](#overview)
- [Security Philosophy](#security-philosophy)
- [Threat Model](#threat-model)
- [Security Architecture](#security-architecture)
- [TLS/HTTPS Configuration](#tlshttps-configuration)
- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [Network Security](#network-security)
- [Application Security](#application-security)
- [Database Security](#database-security)
- [Operational Security](#operational-security)
- [Compliance](#compliance)
- [Incident Response](#incident-response)
- [Security Checklist](#security-checklist)
- [Vulnerability Disclosure](#vulnerability-disclosure)

---

## Overview

The Medical Practice Management System handles Protected Health Information (PHI) and must maintain the highest security standards. This document outlines security requirements, best practices, and implementation guidelines.

### Zero Tolerance Policy

**CRITICAL**: This system has a zero-tolerance policy for data breaches. All security measures are mandatory, not optional.

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimum necessary access rights
3. **Fail Secure**: Systems fail to a secure state
4. **Privacy by Design**: Privacy built into the system architecture
5. **Continuous Monitoring**: Real-time security monitoring and alerting
6. **Assume Breach**: Design for containment and rapid response

---

## Security Philosophy

### Core Requirements

- **ALL medical data MUST be encrypted at rest and in transit** (AES-256)
- **ALL user actions MUST be logged in immutable audit trails**
- **ALL authentication MUST use multi-factor authentication (MFA)**
- **ALL API access MUST use rate limiting**
- **ALL inputs MUST be validated and sanitized**
- **ALL database queries MUST use parameterized statements**

### Compliance Standards

- **HIPAA Security Rule**: Technical, physical, and administrative safeguards
- **HIPAA Privacy Rule**: PHI protection and patient rights
- **HITECH Act**: Enhanced HIPAA requirements and breach notification
- **GDPR** (if applicable): Data protection and privacy
- **WCAG 2.1 AA**: Accessibility standards

---

## Threat Model

### Assets to Protect

1. **Protected Health Information (PHI)**
   - Patient demographics
   - Medical history
   - Visit notes and diagnoses
   - Prescriptions
   - Insurance information

2. **System Credentials**
   - User passwords
   - API keys
   - Database credentials
   - Encryption keys
   - JWT secrets

3. **System Availability**
   - Application uptime
   - Database integrity
   - Backup systems

### Threat Actors

| Threat Actor | Motivation | Capability | Likelihood |
|--------------|------------|------------|------------|
| **External Attackers** | Financial gain, data theft | High | High |
| **Insider Threats** | Data theft, revenge | Medium | Low |
| **Automated Attacks** | Credential stuffing, DDoS | High | High |
| **Social Engineering** | Access credentials | Medium | Medium |
| **Physical Access** | Device theft, shoulder surfing | Low | Low |

### Attack Vectors

- **Network-based attacks**: SQL injection, XSS, CSRF, DDoS
- **Authentication attacks**: Brute force, credential stuffing, session hijacking
- **Authorization bypass**: Privilege escalation, IDOR
- **Data leakage**: Unencrypted data, insecure APIs
- **Supply chain attacks**: Compromised dependencies
- **Social engineering**: Phishing, pretexting

---

## Security Architecture

### Defense in Depth Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                               │
│ - Firewall (iptables/ufw)                              │
│ - Rate limiting                                         │
│ - DDoS protection                                       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Transport Security                             │
│ - TLS 1.3 only                                         │
│ - HSTS headers                                         │
│ - Certificate pinning                                   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Application Security                           │
│ - WAF (ModSecurity + OWASP)                            │
│ - Input validation                                      │
│ - Output encoding                                       │
│ - CSRF protection                                       │
│ - XSS prevention                                        │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Authentication & Authorization                 │
│ - JWT + Refresh tokens                                  │
│ - MFA (TOTP)                                           │
│ - RBAC (Casbin)                                        │
│ - Session management                                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 5: Data Protection                                │
│ - AES-256 encryption at rest                           │
│ - Field-level encryption                               │
│ - Encrypted backups (GPG)                              │
│ - Secure key management                                 │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 6: Database Security                              │
│ - Row-level security                                    │
│ - Parameterized queries                                 │
│ - Connection pooling with TLS                          │
│ - Regular backups                                       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 7: Monitoring & Audit                             │
│ - Immutable audit logs                                  │
│ - Real-time alerting                                    │
│ - Security event monitoring                             │
│ - Log analysis                                          │
└─────────────────────────────────────────────────────────┘
```

---

## TLS/HTTPS Configuration

### Overview

All communication between clients and the DocPat system MUST use TLS 1.2 or 1.3. The system supports HTTPS for both development and production environments.

**Implementation Files:**
- Backend TLS: `backend/src/config/mod.rs` (TlsConfig struct)
- Backend Server: `backend/src/main.rs` (conditional HTTPS)
- Frontend HTTPS: `frontend/vite.config.ts`
- Certificate Script: `scripts/generate-certs.sh`

### Development Environment (Self-Signed Certificates)

#### Certificate Generation

Use the provided script to generate self-signed certificates for local development:

```bash
# From project root
./scripts/generate-certs.sh
```

This script creates:
- **CA Certificate** (`certs/ca/ca.crt`, `certs/ca/ca.key`)
  - 10-year validity
  - Used to sign server certificates

- **Backend Certificate** (`certs/backend/server.crt`, `certs/backend/server.key`)
  - 1-year validity
  - SAN: localhost, 127.0.0.1, ::1

- **Frontend Certificate** (`certs/frontend/server.crt`, `certs/frontend/server.key`)
  - 1-year validity
  - SAN: localhost, 127.0.0.1, ::1

#### Directory Structure

```
certs/
├── ca/
│   ├── ca.crt          # CA certificate (tracked in git)
│   └── ca.key          # CA private key (NOT tracked)
├── backend/
│   ├── server.crt      # Backend certificate (tracked)
│   └── server.key      # Backend private key (NOT tracked)
├── frontend/
│   ├── server.crt      # Frontend certificate (tracked)
│   └── server.key      # Frontend private key (NOT tracked)
└── .gitignore          # Ignores *.key files
```

#### Backend Configuration

Set these environment variables in `backend/.env`:

```env
# TLS Configuration
TLS_ENABLED=true
TLS_CERT_PATH=../certs/backend/server.crt
TLS_KEY_PATH=../certs/backend/server.key
```

The backend uses **rustls** with the **aws-lc-rs** crypto provider:
- TLS 1.2 and 1.3 support (no older protocols)
- Modern cipher suites (ECDHE, AES-GCM, ChaCha20-Poly1305)
- HTTP/2 via ALPN negotiation
- FIPS 140-3 compatible (aws-lc-rs)

#### Frontend Configuration

Set these environment variables in `frontend/.env`:

```env
VITE_API_BASE_URL=https://localhost:8000
VITE_USE_HTTPS=true
VITE_BACKEND_HTTPS=true
```

#### Browser Certificate Trust

For development, you'll see browser warnings about self-signed certificates. Options:

1. **Click through the warning** (per-session):
   - Open `https://localhost:5173/` and `https://localhost:8000/`
   - Click "Advanced" → "Proceed to localhost (unsafe)"

2. **Trust the CA certificate** (persistent):
   ```bash
   # Linux (Chrome/Chromium)
   certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "DocPat Dev CA" -i certs/ca/ca.crt

   # macOS
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/ca/ca.crt

   # Firefox: Settings → Privacy & Security → Certificates → Import
   ```

### Production Environment (Let's Encrypt)

For production deployment, use Let's Encrypt for free, trusted certificates.

#### Option 1: Certbot (Manual)

```bash
# Install certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificates are stored in:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Update backend .env
TLS_ENABLED=true
TLS_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
TLS_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

#### Option 2: Caddy (Automatic)

Caddy automatically obtains and renews Let's Encrypt certificates:

```caddyfile
# Caddyfile
yourdomain.com {
    reverse_proxy localhost:8000
}

app.yourdomain.com {
    reverse_proxy localhost:5173
}
```

#### Option 3: Nginx with Certbot

```bash
# Install nginx and certbot
sudo apt install nginx python3-certbot-nginx

# Obtain certificate and configure nginx
sudo certbot --nginx -d yourdomain.com
```

### TLS Security Settings

The backend uses these security configurations:

```rust
// From backend/src/config/mod.rs
pub struct TlsConfig {
    pub enabled: bool,
    pub cert_path: Option<String>,
    pub key_path: Option<String>,
}

// TLS is ready only when all settings are configured
impl TlsConfig {
    pub fn is_ready(&self) -> bool {
        self.enabled && self.cert_path.is_some() && self.key_path.is_some()
    }
}
```

**Cipher Suites** (rustls defaults - secure by design):
- TLS_AES_256_GCM_SHA384
- TLS_AES_128_GCM_SHA256
- TLS_CHACHA20_POLY1305_SHA256

**Protocol Versions**:
- TLS 1.3 (preferred)
- TLS 1.2 (fallback)
- TLS 1.1 and below: **DISABLED**

### Verification

Verify TLS configuration:

```bash
# Backend HTTPS
curl -v https://localhost:8000/health 2>&1 | grep -E "TLS|SSL|ALPN"
# Expected: TLSv1.3, ALPN: h2

# Frontend HTTPS
curl -v https://localhost:5173/ 2>&1 | grep -E "TLS|SSL"
# Expected: TLSv1.3

# API Proxy (frontend → backend)
curl -k https://localhost:5173/api/health
# Expected: {"status":"healthy",...}
```

---

## Authentication & Authorization

### Password Requirements

**MANDATORY**: All passwords MUST meet these requirements:

**Implementation**: `backend/src/utils/password.rs`

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*(),.?":{}|<>)

**Future Enhancements** (not yet implemented):
- Common password list checking
- Username/email similarity check
- Password history (no reuse)

### Password Storage

```rust
// Argon2id configuration
const ARGON2_CONFIG: Config = Config {
    variant: Variant::Argon2id,
    version: Version::Version13,
    mem_cost: 65536,      // 64 MB
    time_cost: 3,         // 3 iterations
    lanes: 4,             // 4 parallel threads
    secret: &[],
    ad: &[],
    hash_length: 32,
};

// NEVER store plaintext passwords
// NEVER use weak hashing (MD5, SHA1, etc.)
// ALWAYS use Argon2id with proper parameters
```

### Multi-Factor Authentication (MFA)

**MANDATORY**: All users MUST enable MFA.

- **TOTP** (Time-based One-Time Password): 6-digit codes, 30-second validity
- **Backup Codes**: 10 single-use codes for account recovery
- **FIDO2/WebAuthn** (future enhancement): Hardware security keys

### Session Management

**Implementation Files:**
- JWT Service: `backend/src/services/jwt_service.rs`
- Session Manager: `backend/src/middleware/session_timeout.rs`
- Auth Service: `backend/src/services/auth_service.rs`

```rust
// JWT Configuration (from backend/.env)
JWT_ACCESS_TOKEN_EXPIRY=900        // 15 minutes
JWT_REFRESH_TOKEN_EXPIRY=604800    // 7 days
SESSION_TIMEOUT=1800               // 30 minutes inactivity
```

**Session Security Features (Implemented):**
- ✅ JWT access tokens with short expiry (15 min)
- ✅ Refresh tokens for seamless renewal (7 days)
- ✅ Automatic session timeout after 30 min inactivity
- ✅ In-memory session tracking with cleanup
- ✅ Logout invalidates session
- ✅ Token includes user role and permissions

**Cookie Configuration:**
```rust
// For refresh tokens stored in cookies
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth
```

### Account Lockout

**Implementation**: `backend/src/services/auth_service.rs`

- **Failed Login Attempts**: 5 attempts (configurable via `MAX_LOGIN_ATTEMPTS`)
- **Lockout Duration**: 15 minutes (configurable via `ACCOUNT_LOCKOUT_DURATION`)
- **Tracking**: Failed attempts tracked in `users.failed_login_attempts` column
- **Reset**: Counter resets on successful login

**Future Enhancements:**
- Email notification on lockout
- Admin unlock capability

### Role-Based Access Control (RBAC)

**Implementation Files:**
- Casbin Model: `backend/casbin/model.conf`
- Casbin Policy: `backend/casbin/policy.csv`
- Authorization Middleware: `backend/src/middleware/authorization.rs`
- Permission Utils: `backend/src/utils/permissions.rs`

```
Roles:
- ADMIN: Full system access, user management, settings, audit logs
- DOCTOR: Patient care, appointments, clinical documentation

Policy Format (Casbin):
p, ROLE, RESOURCE, ACTION

Examples:
p, ADMIN, /api/v1/users, *
p, ADMIN, /api/v1/audit, GET
p, ADMIN, /api/v1/settings, *
p, DOCTOR, /api/v1/patients, *
p, DOCTOR, /api/v1/appointments, *
p, DOCTOR, /api/v1/visits, *
p, DOCTOR, /api/v1/prescriptions, *
```

**Route Protection:**
All API routes are protected by the authorization middleware which:
1. Extracts user role from JWT claims
2. Checks Casbin policy against requested resource/action
3. Returns 403 Forbidden if policy denies access

---

## Data Protection

### Encryption at Rest

**MANDATORY**: All PHI MUST be encrypted at rest.

#### Database Encryption

```sql
-- PostgreSQL Transparent Data Encryption (TDE)
-- Use pgcrypto extension for column-level encryption

-- Encrypted columns for patients table
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypting sensitive fields
CREATE TABLE patients (
    id UUID PRIMARY KEY,
    first_name VARCHAR(100),  -- Encrypted
    last_name VARCHAR(100),   -- Encrypted
    fiscal_code TEXT,         -- Encrypted
    phone_primary TEXT,       -- Encrypted
    email TEXT,               -- Encrypted
    -- ... other fields

    -- Store encrypted data with pgcrypto
    -- Encrypt: pgp_sym_encrypt(data, encryption_key)
    -- Decrypt: pgp_sym_decrypt(encrypted_data, encryption_key)
);
```

#### Encryption Standards

- **Algorithm**: AES-256-GCM or ChaCha20-Poly1305
- **Key Size**: 256 bits minimum
- **Key Derivation**: PBKDF2 or Argon2
- **Key Rotation**: Every 90 days
- **Key Storage**: Environment variables (never hardcoded)

#### File Encryption

```bash
# Backup encryption with GPG
gpg --symmetric --cipher-algo AES256 backup.sql

# Environment variable for encryption key
export ENCRYPTION_KEY="generated_key_from_secure_source"
```

### Encryption in Transit

**MANDATORY**: All data transmissions MUST use TLS 1.3.

```nginx
# Nginx TLS Configuration
ssl_protocols TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS header (force HTTPS)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Disable insecure protocols
ssl_protocols TLSv1.2 TLSv1.3;  # Only modern TLS versions
```

### Data Minimization

- Collect only necessary data
- Delete data after retention period
- Anonymize data for analytics
- Pseudonymize data when possible

### Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| Medical Records | 7 years minimum | Secure deletion |
| Audit Logs | 3 years | Secure deletion |
| System Logs | 90 days | Automatic rotation |
| Backups | 30 daily, 12 monthly, 7 yearly | Encrypted deletion |
| User Sessions | 30 minutes inactivity | Automatic invalidation |

---

## Network Security

### Firewall Configuration

```bash
# ufw (Uncomplicated Firewall) rules
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port from default 22)
sudo ufw allow 2222/tcp

# Allow HTTPS only
sudo ufw allow 443/tcp

# Allow PostgreSQL (only from application server)
sudo ufw allow from 10.0.1.0/24 to any port 5432

# Enable firewall
sudo ufw enable
```

### Rate Limiting

**Implementation**: `backend/src/middleware/rate_limit.rs`

The system uses the `governor` crate for rate limiting with three tiers:

```rust
// Rate limiting configuration (from implementation)
Tier 1 - Unauthenticated: 100 requests/minute (login, public endpoints)
Tier 2 - Authenticated:   300 requests/minute (standard API access)
Tier 3 - Bulk Operations: 10 requests/minute  (exports, reports)
```

**Features:**
- ✅ IP-based limiting for unauthenticated requests
- ✅ User ID-based limiting for authenticated requests
- ✅ Configurable via environment variables
- ✅ Returns 429 Too Many Requests with Retry-After header
- ✅ 9 unit tests covering all rate limiting scenarios

### DDoS Protection

- **Nginx rate limiting**: `limit_req_zone`
- **Connection limits**: Max connections per IP
- **Request size limits**: 10MB maximum
- **Timeout configuration**: 30 seconds
- **fail2ban**: Ban IPs after repeated violations

### Network Segmentation

```
┌─────────────────┐
│  Public Network │  (Internet)
└────────┬────────┘
         │
    [Nginx WAF]
         │
┌────────┴────────┐
│   DMZ Network   │  (10.0.1.0/24)
│  - Application  │
│    Servers      │
└────────┬────────┘
         │
    [Firewall]
         │
┌────────┴────────┐
│ Private Network │  (10.0.2.0/24)
│  - PostgreSQL   │
│  - Redis        │
│  - Backups      │
└─────────────────┘
```

---

## Application Security

### Input Validation

**MANDATORY**: Validate ALL user inputs at multiple layers.

#### Backend Validation (Rust)

```rust
use validator::Validate;

#[derive(Validate)]
struct CreatePatientRequest {
    #[validate(length(min = 1, max = 100))]
    first_name: String,

    #[validate(length(min = 1, max = 100))]
    last_name: String,

    #[validate(email)]
    email: Option<String>,

    #[validate(phone)]
    phone_primary: Option<String>,

    #[validate(custom = "validate_fiscal_code")]
    fiscal_code: Option<String>,
}

// NEVER trust client-side validation alone
// ALWAYS validate on the server
```

#### Frontend Validation (React + Zod)

```typescript
import { z } from 'zod';

const patientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phoneRimary: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  fiscalCode: z.string().length(16).optional(),
});

// Validate before sending to API
const validated = patientSchema.parse(formData);
```

### SQL Injection Prevention

**MANDATORY**: Use parameterized queries ONLY. This project uses SQLx with compile-time verification to prevent SQL injection attacks.

#### SQLx Compile-Time Verification

SQLx provides **compile-time checked queries** that verify:
- SQL syntax is correct
- Column names exist in the database
- Type conversions are valid
- No SQL injection is possible through parameterized queries

```rust
// CORRECT: Compile-time verified query with SQLx
let patient = sqlx::query_as!(
    Patient,
    "SELECT * FROM patients WHERE id = $1",
    patient_id  // Automatically parameterized - safe from injection
)
.fetch_one(&pool)
.await?;

// The query! macro connects to the database at compile time and:
// 1. Verifies the SQL syntax
// 2. Checks that the 'patients' table exists
// 3. Validates the 'id' column exists
// 4. Ensures Patient struct matches the query results
// 5. Prevents SQL injection through parameterization

// NEVER do this (string concatenation):
// let query = format!("SELECT * FROM patients WHERE id = '{}'", patient_id);
// This is vulnerable to SQL injection and won't compile with sqlx::query!()
```

#### Patient Management SQL Injection Prevention

All patient CRUD operations use parameterized queries:

```rust
// Patient Creation - All values parameterized
sqlx::query!(
    r#"
    INSERT INTO patients (
        id, medical_record_number, first_name, last_name, ...
    ) VALUES (
        $1, $2, $3, $4, ...
    )
    "#,
    patient.id,
    patient.medical_record_number,
    encrypted_first_name,  // Even encrypted data uses parameters
    encrypted_last_name,
    // ... all values parameterized
)
.execute(pool)
.await?;

// Patient Search - Full-text search with parameterized query
sqlx::query_as!(
    Patient,
    r#"
    SELECT * FROM patients
    WHERE search_vector @@ plainto_tsquery('english', $1)
    AND status = ANY($2)
    ORDER BY last_name, first_name
    LIMIT $3 OFFSET $4
    "#,
    search_query,  // User input - safely parameterized
    &statuses,
    limit,
    offset
)
.fetch_all(pool)
.await?;
```

#### Build-Time SQL Verification

To enable compile-time checking, the project uses:

```bash
# Set database URL for compile-time verification
export DATABASE_URL="postgresql://user:pass@localhost/docpat"

# SQLx verifies queries against this database during compilation
cargo build

# This will fail at compile time if:
# - SQL syntax is invalid
# - Tables/columns don't exist
# - Type mismatches occur
# - Queries would be unsafe
```

#### Defense-in-Depth

Even with SQLx protection, we maintain defense-in-depth:

1. **Input Validation**: Validate all inputs before reaching database (validator crate)
2. **Type Safety**: Rust's type system prevents many injection vectors
3. **Parameterized Queries**: SQLx automatically parameterizes all values
4. **Compile-Time Verification**: Queries checked at build time
5. **Row-Level Security**: PostgreSQL RLS provides additional isolation
6. **Audit Logging**: All database operations logged immutably

#### Verification Checklist

- ✅ All patient queries use `sqlx::query!()` or `sqlx::query_as!()`
- ✅ No string concatenation in SQL queries
- ✅ No `format!()` or `write!()` macros with SQL
- ✅ Search queries use PostgreSQL's `plainto_tsquery()` (injection-safe)
- ✅ All user inputs validated before database operations
- ✅ Compile-time verification enabled in CI/CD pipeline

### Cross-Site Scripting (XSS) Prevention

#### Backend (API Responses)

```rust
// Always escape output
use axum::response::Html;

// React automatically escapes by default
// For raw HTML, use dangerouslySetInnerHTML sparingly
```

#### Frontend (React)

```typescript
// React escapes by default - this is safe:
<p>{userInput}</p>

// If you must use raw HTML (avoid if possible):
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />

// Use DOMPurify for sanitization
import DOMPurify from 'dompurify';
const sanitizedHtml = DOMPurify.sanitize(userInput);
```

#### Content Security Policy (CSP)

```nginx
# Nginx CSP headers
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https://api.clinic.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
" always;
```

### Cross-Site Request Forgery (CSRF) Prevention

```rust
// Use tower-csrf middleware
use tower_csrf::CsrfLayer;

let app = Router::new()
    .route("/api/v1/*", post(handler))
    .layer(CsrfLayer::new());

// Double-submit cookie pattern
// SameSite=Strict cookies
```

### Security Headers

**Implementation**: `backend/src/middleware/security_headers.rs`

The backend applies security headers via middleware on all responses:

```rust
// Headers applied by SecurityHeadersMiddleware
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Features:**
- ✅ HSTS with 1-year max-age, subdomains, and preload
- ✅ Configurable CSP with report-only mode for testing
- ✅ Frame protection (DENY by default)
- ✅ Referrer policy for privacy
- ✅ Permissions policy restricting device access

### Dependency Security

```bash
# Regular security audits
cargo audit  # Rust backend
npm audit    # Frontend

# Automated updates (review before applying)
cargo update
npm update

# Lock file integrity
cargo verify-project
npm ci  # Use in CI/CD instead of npm install
```

---

## Database Security

### Connection Security

```rust
// PostgreSQL connection with TLS
DATABASE_URL=postgresql://user:password@localhost/mpms_dev?sslmode=require

// Connection pooling with security
use sqlx::postgres::PgPoolOptions;

let pool = PgPoolOptions::new()
    .max_connections(20)
    .min_connections(5)
    .acquire_timeout(Duration::from_secs(10))
    .idle_timeout(Duration::from_secs(600))
    .connect(&database_url)
    .await?;
```

### Row-Level Security (RLS)

```sql
-- Enable RLS on patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see patients they have permission for
CREATE POLICY patient_access_policy ON patients
    FOR ALL
    USING (
        -- Check user permissions via role
        current_setting('app.user_role') = 'DOCTOR'
        OR current_setting('app.user_role') = 'ADMIN'
    );
```

### Database User Permissions

```sql
-- Create application database user with limited permissions
CREATE USER mpms_app WITH PASSWORD 'strong_generated_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE mpms_prod TO mpms_app;
GRANT USAGE ON SCHEMA public TO mpms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mpms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mpms_app;

-- NEVER grant SUPERUSER or CREATE DATABASE permissions to application user
```

### Backup Security

```bash
#!/bin/bash
# Automated encrypted backup script

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

# Create backup
pg_dump -h localhost -U postgres mpms_prod > $BACKUP_FILE

# Encrypt backup
gpg --symmetric --cipher-algo AES256 --batch --passphrase "$GPG_PASSPHRASE" $BACKUP_FILE

# Upload to secure storage
aws s3 cp $ENCRYPTED_FILE s3://secure-backups/mpms/

# Delete unencrypted backup
shred -u $BACKUP_FILE

# Retain encrypted backup
mv $ENCRYPTED_FILE /backup/archive/
```

---

## Operational Security

### Logging and Monitoring

#### Audit Logging

**MANDATORY**: Log ALL access to PHI.

```rust
#[derive(Debug, Serialize)]
struct AuditLog {
    user_id: Uuid,
    action: String,        // CREATE, READ, UPDATE, DELETE
    entity_type: String,   // PATIENT, VISIT, PRESCRIPTION
    entity_id: String,
    changes: Option<serde_json::Value>,
    ip_address: IpAddr,
    user_agent: String,
    timestamp: DateTime<Utc>,
}

// Log format
{
    "user_id": "usr_123",
    "action": "READ",
    "entity_type": "PATIENT",
    "entity_id": "pat_456",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "timestamp": "2024-11-01T10:30:00Z"
}
```

#### Security Event Monitoring

Monitor and alert on:

- Failed login attempts (>3 in 5 minutes)
- Privilege escalation attempts
- Unusual data access patterns
- Large data exports
- After-hours access
- Geographic anomalies
- Concurrent sessions
- Password changes
- MFA disablement attempts

#### Log Protection

```sql
-- Immutable audit logs
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    -- ... fields ...
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent updates and deletes
    CHECK (created_at <= NOW())
) PARTITION BY RANGE (created_at);

-- Revoke UPDATE and DELETE permissions
REVOKE UPDATE, DELETE ON audit_logs FROM mpms_app;
```

### Incident Response

#### Detection

1. **Automated Monitoring**: Prometheus + Grafana alerts
2. **Log Analysis**: Loki for log aggregation and analysis
3. **Intrusion Detection**: fail2ban for automated blocking
4. **Anomaly Detection**: Machine learning for unusual patterns

#### Response Plan

**Phase 1: Detection & Analysis** (0-2 hours)

1. Identify the incident
2. Assess severity and scope
3. Determine if PHI was accessed
4. Document initial findings

**Phase 2: Containment** (2-4 hours)

1. Isolate affected systems
2. Block malicious IPs
3. Revoke compromised credentials
4. Preserve evidence

**Phase 3: Eradication** (4-24 hours)

1. Remove malware/backdoors
2. Patch vulnerabilities
3. Update security controls
4. Verify system integrity

**Phase 4: Recovery** (24-72 hours)

1. Restore from clean backups
2. Monitor for reinfection
3. Verify system functionality
4. Resume normal operations

**Phase 5: Post-Incident** (1-2 weeks)

1. Complete investigation
2. Document lessons learned
3. Update security procedures
4. Report to authorities (HIPAA breach notification)

#### Breach Notification

**HIPAA Requirements**:

- **<500 individuals**: Annual notification to HHS
- **≥500 individuals**: Notification within 60 days to HHS and media
- **All breaches**: Notification to affected individuals within 60 days

### Access Control

#### Physical Security

- Secure server room access
- Video surveillance
- Visitor logs
- Badge access systems
- Workstation locks (automatic after 5 minutes)
- Clean desk policy
- Screen privacy filters

#### Administrative Access

```bash
# SSH key-based authentication only (disable password auth)
PubkeyAuthentication yes
PasswordAuthentication no
PermitRootLogin no

# Use sudo for privileged commands
# Require password for sudo
# Log all sudo commands
```

### Secure Development

#### Code Review Checklist

- [ ] No hardcoded secrets
- [ ] Input validation implemented
- [ ] Output encoding applied
- [ ] Parameterized queries used
- [ ] Authentication required
- [ ] Authorization checked
- [ ] Error handling appropriate
- [ ] Logging implemented
- [ ] Tests written
- [ ] Security tests included

#### CI/CD Security

```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Rust Security Audit
        run: cargo audit

      - name: Dependency Check
        run: cargo deny check

      - name: Frontend Security Audit
        run: npm audit

      - name: SAST Scan
        run: cargo clippy -- -D warnings

      - name: Secret Scanning
        uses: trufflesecurity/trufflehog@main
```

---

## Compliance

### HIPAA Security Rule

#### Technical Safeguards

- [x] Access Control (§164.312(a)(1))
  - [x] Unique user identification
  - [x] Emergency access procedure
  - [x] Automatic logoff
  - [x] Encryption and decryption

- [x] Audit Controls (§164.312(b))
  - [x] Hardware and software logging
  - [x] Activity monitoring
  - [x] Examination procedures

- [x] Integrity (§164.312(c)(1))
  - [x] Mechanism to authenticate PHI
  - [x] Checksums for data integrity

- [x] Transmission Security (§164.312(e)(1))
  - [x] Integrity controls
  - [x] Encryption

#### Physical Safeguards

- [ ] Facility Access Controls (§164.310(a)(1))
  - [ ] Contingency operations
  - [ ] Facility security plan
  - [ ] Access control and validation procedures
  - [ ] Maintenance records

- [x] Workstation Use (§164.310(b))
  - [x] Policies and procedures

- [x] Workstation Security (§164.310(c))
  - [x] Physical safeguards

- [x] Device and Media Controls (§164.310(d)(1))
  - [x] Disposal
  - [x] Media re-use
  - [x] Accountability
  - [x] Data backup and storage

#### Administrative Safeguards

- [ ] Security Management Process (§164.308(a)(1))
  - [ ] Risk analysis
  - [ ] Risk management
  - [ ] Sanction policy
  - [ ] Information system activity review

- [ ] Assigned Security Responsibility (§164.308(a)(2))
  - [ ] Designated security official

- [ ] Workforce Security (§164.308(a)(3))
  - [ ] Authorization and supervision
  - [ ] Workforce clearance
  - [ ] Termination procedures

- [ ] Information Access Management (§164.308(a)(4))
  - [x] Isolating health care clearinghouse functions
  - [x] Access authorization
  - [x] Access establishment and modification

- [ ] Security Awareness and Training (§164.308(a)(5))
  - [ ] Security reminders
  - [ ] Protection from malicious software
  - [ ] Log-in monitoring
  - [ ] Password management

- [ ] Security Incident Procedures (§164.308(a)(6))
  - [ ] Response and reporting

- [ ] Contingency Plan (§164.308(a)(7))
  - [x] Data backup plan
  - [ ] Disaster recovery plan
  - [ ] Emergency mode operation plan
  - [x] Testing and revision procedures
  - [ ] Applications and data criticality analysis

- [ ] Evaluation (§164.308(a)(8))
  - [ ] Periodic security evaluations

- [ ] Business Associate Contracts (§164.308(b)(1))
  - [ ] Written contract or arrangement

### GDPR (if applicable)

- [x] Lawful basis for processing
- [x] Data minimization
- [x] Purpose limitation
- [x] Storage limitation
- [x] Integrity and confidentiality
- [x] Accountability
- [ ] Data subject rights (access, rectification, erasure)
- [ ] Data protection impact assessment
- [ ] Breach notification (72 hours)

---

## Security Audit Results

### Latest Audit: January 2026

**Audit Type**: Comprehensive Code Security Review
**Performed By**: Claude Opus 4.5 Security Auditor
**Scope**: Full backend and frontend codebase

#### Summary

| Component | Critical | High | Medium | Low | Status |
|-----------|----------|------|--------|-----|--------|
| Backend (Rust) | 1 | 2 | 5 | 4 | **Fixed** |
| Frontend (React) | 0 | 0 | 1 | 6 | Documented |

#### Critical/High Issues - RESOLVED

1. **SQL Injection in User List Handler** (CRITICAL - Fixed)
   - **File**: `src/handlers/users.rs`
   - **Issue**: String formatting in SQL WHERE clauses allowed injection
   - **Fix**: Rewrote using `sqlx::QueryBuilder` with parameterized queries

2. **SQL Injection in RLS Context Setting** (HIGH - Fixed)
   - **Files**: 9 files across handlers and services
   - **Issue**: `format!("SET LOCAL app.current_user_id = '{}'", ...)` pattern
   - **Fix**: Changed to `SELECT set_config('app.current_user_id', $1, true)` with bind parameters

3. **RBAC Conditional Compilation** (HIGH - Documented)
   - **Issue**: RBAC checks wrapped in `#[cfg(feature = "rbac")]`
   - **Status**: Feature is always enabled in production via `Cargo.toml`

#### Medium Issues - Documented for Future

1. **JWT Token Storage in localStorage** (Frontend)
   - Tokens stored in localStorage instead of httpOnly cookies
   - Mitigation: Strong XSS prevention, short token expiry
   - Future: Consider migration to httpOnly cookies

2. **Missing JWT Token Blacklist** (Backend)
   - Tokens valid until expiration even after logout
   - Mitigation: Short access token expiry (15 min)
   - Future: Implement Redis-based blacklist

3. **MFA Setup User ID in Request** (Backend)
   - MFA setup endpoint accepts user_id in body
   - Mitigation: Endpoint requires authentication
   - Future: Extract user_id from JWT only

4. **Global Rate Limiting** (Backend)
   - Rate limiting is global, not per-IP
   - Mitigation: Three-tier limits in place
   - Future: Implement keyed rate limiting

5. **Validation Error Detail Disclosure** (Backend)
   - SQL injection pattern details returned in errors
   - Future: Return generic validation errors

#### Low Issues - Tracked

- Console logging in production (frontend)
- Draft data stored unencrypted in localStorage
- Print functionality XSS risk (content from DB)
- Missing server-level CSP headers
- Credentials briefly in memory during MFA flow
- In-memory session storage (single instance OK)

#### Dependency Audit

**Backend (Rust)**:
- `cargo audit`: 1 advisory (RSA via sqlx-mysql - false positive, we use PostgreSQL)
- Licenses: 100% permissive (MIT, Apache-2.0, BSD)
- Migrated from deprecated `dotenv` to maintained `dotenvy`

**Frontend (npm)**:
- `npm audit`: 0 vulnerabilities (after updates)
- Licenses: 100% permissive (MIT, ISC, Apache-2.0)
- Updated: react-router-dom, vite, glob, js-yaml (security patches)

#### Files Modified in Security Fixes

```
backend/src/handlers/users.rs         - SQL injection fix (QueryBuilder)
backend/src/handlers/patients.rs      - RLS set_config fix
backend/src/handlers/appointments.rs  - RLS set_config fix
backend/src/services/report_service.rs
backend/src/services/appointment_service.rs
backend/src/services/notification_service.rs
backend/src/services/visit_service.rs
backend/src/services/drug_interaction_service.rs (2 locations)
backend/src/services/prescription_service.rs
backend/src/services/notification_scheduler.rs
backend/src/services/document_service.rs
```

---

## Security Checklist

### Implementation Status

The following security features have been implemented in the DocPat system:

#### Transport Security
- [x] ✅ TLS 1.2/1.3 with rustls (backend)
- [x] ✅ TLS 1.3 with Vite (frontend dev)
- [x] ✅ HSTS headers (1 year, includeSubDomains, preload)
- [x] ✅ Certificate generation script for development
- [ ] ❌ Production Let's Encrypt setup (documented, not deployed)

#### Authentication & Authorization
- [x] ✅ JWT authentication with access/refresh tokens
- [x] ✅ MFA with TOTP (authenticator apps)
- [x] ✅ Backup codes for account recovery
- [x] ✅ Password complexity validation
- [x] ✅ Argon2id password hashing
- [x] ✅ Account lockout after failed attempts
- [x] ✅ Session timeout (30 min inactivity)
- [x] ✅ RBAC with Casbin (ADMIN, DOCTOR roles)

#### Application Security
- [x] ✅ Rate limiting (3-tier: unauth/auth/bulk)
- [x] ✅ Security headers middleware (CSP, HSTS, etc.)
- [x] ✅ CORS configuration with allowed origins
- [x] ✅ Input validation (validator crate)
- [x] ✅ SQL injection prevention (SQLx parameterized queries, QueryBuilder, set_config - Audited Jan 2026)
- [x] ✅ XSS prevention (React escaping + CSP)
- [ ] ❌ CSRF tokens (partially - SameSite cookies used)

#### Data Protection
- [x] ✅ AES-256-GCM encryption for PHI fields
- [x] ✅ Encrypted backups (GPG)
- [x] ✅ Environment-based encryption key management
- [x] ✅ Field-level encryption for patient data

#### Database Security
- [x] ✅ PostgreSQL Row-Level Security (RLS)
- [x] ✅ Parameterized queries (SQLx compile-time verification)
- [x] ✅ Connection pooling with timeouts
- [ ] ❌ Database TLS connection (localhost only currently)

#### Monitoring & Audit
- [x] ✅ Comprehensive audit logging
- [x] ✅ Immutable audit log table (INSERT only)
- [x] ✅ Request tracing with tower-http
- [ ] ❌ Real-time security alerting
- [ ] ❌ SIEM integration

### Initial Deployment Checklist

Before deploying to production, verify:

- [ ] TLS certificates obtained (Let's Encrypt/commercial)
- [ ] Environment variables configured (no defaults)
- [ ] Database credentials are unique and strong
- [ ] Encryption key is generated and securely stored
- [ ] JWT secrets are generated and unique
- [ ] Firewall rules configured
- [ ] Backup schedule configured
- [ ] Admin user created with MFA enabled
- [ ] Audit logging verified
- [ ] Rate limits appropriate for expected traffic

### Weekly

- [ ] Review security alerts
- [ ] Check audit logs for anomalies
- [ ] Verify backup integrity
- [ ] Review access logs
- [ ] Check for failed login attempts

### Monthly

- [ ] Security patch updates
- [ ] Dependency vulnerability scan
- [ ] Review user permissions
- [ ] Audit trail review
- [ ] Backup restoration test

### Quarterly

- [ ] Full security audit
- [ ] Penetration testing
- [ ] Disaster recovery drill
- [ ] Security awareness training
- [ ] Review and update security policies

### Annually

- [ ] External security audit
- [ ] HIPAA compliance review
- [ ] Full disaster recovery test
- [ ] Security risk assessment
- [ ] Update business continuity plan

---

## Vulnerability Disclosure

### Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** create a public GitHub issue
2. Email security@docpat.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

3. Allow reasonable time for response (48-72 hours)

### Coordinated Disclosure

- We commit to acknowledging receipt within 48 hours
- We will provide a timeline for fix within 1 week
- We will credit researchers (if desired) upon disclosure
- We will not pursue legal action against researchers acting in good faith

---

## Security Contacts

- **Security Team**: security@docpat.com
- **Incident Response**: incident@docpat.com
- **Privacy Officer**: privacy@docpat.com

---

## References

- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls/)
- [SANS Top 25 Software Errors](https://www.sans.org/top25-software-errors/)

---

## Changelog

### Version 2.0.0 (January 2026)
- Added comprehensive TLS/HTTPS Configuration section
- Added certificate generation documentation
- Updated password requirements to match implementation (8 chars)
- Updated session management with actual JWT expiration times
- Updated Security Checklist with implementation status
- Added implementation file references throughout
- Updated RBAC section with Casbin policy details
- Updated rate limiting section with actual configuration
- Updated security headers section with middleware details

### Version 1.0.0 (October 2025)
- Initial security guidelines document

---

**Last Updated**: January 2026
**Version**: 2.0.0
**Status**: Production Ready
**Review Frequency**: Quarterly or as needed

**⚠️ SECURITY IS EVERYONE'S RESPONSIBILITY**
