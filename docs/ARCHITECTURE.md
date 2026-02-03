# DocPat Architecture Documentation

**Last Updated:** February 2026
**Document Version:** 1.0
**Status:** Production

This document describes the technical architecture of DocPat (Medical Practice Management System), including key design decisions, rationale, and implementation details.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Technology Stack Decisions](#technology-stack-decisions)
3. [Database Architecture](#database-architecture)
4. [Security Architecture](#security-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [API Design](#api-design)
8. [Integration Patterns](#integration-patterns)
9. [Deployment Architecture](#deployment-architecture)
10. [Performance Considerations](#performance-considerations)
11. [Testing Architecture](#testing-architecture)
12. [Monitoring & Observability](#monitoring--observability)

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              React 18 SPA (TypeScript + Vite)                    │   │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │   │
│  │   │Dashboard│ │Patients │ │ Visits  │ │Calendar │ │ Reports │  │   │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │   │
│  │                                                                   │   │
│  │   ┌─────────────────────────────────────────────────────────┐   │   │
│  │   │  React Query │ React Router │ React Hook Form │ i18next │   │   │
│  │   └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS (TLS 1.3)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         REVERSE PROXY LAYER                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Nginx + Let's Encrypt                         │   │
│  │     SSL Termination │ Rate Limiting │ Static Asset Serving      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Rust/Axum REST API Server (Port 8000)               │   │
│  │                                                                   │   │
│  │   ┌───────────────────────────────────────────────────────────┐ │   │
│  │   │                     MIDDLEWARE STACK                       │ │   │
│  │   │  CORS │ Tracing │ Rate Limit │ JWT Auth │ RBAC │ RLS Ctx  │ │   │
│  │   └───────────────────────────────────────────────────────────┘ │   │
│  │                                                                   │   │
│  │   ┌───────────────────────────────────────────────────────────┐ │   │
│  │   │                      HANDLERS                              │ │   │
│  │   │  Auth │ Patients │ Appointments │ Visits │ Prescriptions  │ │   │
│  │   │  Documents │ Reports │ Users │ Settings │ Notifications   │ │   │
│  │   └───────────────────────────────────────────────────────────┘ │   │
│  │                                                                   │   │
│  │   ┌───────────────────────────────────────────────────────────┐ │   │
│  │   │                    SERVICES LAYER                          │ │   │
│  │   │  AuthService │ PatientService │ VisitService │ EmailSvc   │ │   │
│  │   │  ReportService │ DrugInteractionService │ NotificationSvc │ │   │
│  │   └───────────────────────────────────────────────────────────┘ │   │
│  │                                                                   │   │
│  │   ┌───────────────────────────────────────────────────────────┐ │   │
│  │   │                    UTILITIES                               │ │   │
│  │   │  AES-256-GCM Encryption │ Validators │ Error Handling     │ │   │
│  │   └───────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                      ┌─────────────┴─────────────┐
                      │                           │
                      ▼                           ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────────┐
│         DATA LAYER               │ │          CACHE LAYER                 │
│  ┌───────────────────────────┐  │ │  ┌─────────────────────────────┐   │
│  │    PostgreSQL 17          │  │ │  │      Redis 7 (Optional)     │   │
│  │                           │  │ │  │                             │   │
│  │  ┌─────────────────────┐  │  │ │  │  • Session storage          │   │
│  │  │   Row-Level Security │  │  │ │  │  • Query caching           │   │
│  │  │    (RLS Policies)    │  │  │ │  │  • Rate limit counters     │   │
│  │  └─────────────────────┘  │  │ │  └─────────────────────────────┘   │
│  │                           │  │ │                                     │
│  │  ┌─────────────────────┐  │  │ └─────────────────────────────────────┘
│  │  │  Table Partitioning  │  │  │
│  │  │  (visits by year,    │  │  │
│  │  │   audit_logs by mo)  │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Design Principles

1. **Security-First**: All medical data encrypted at rest (AES-256-GCM), Row-Level Security in PostgreSQL, RBAC with Casbin
2. **Simplicity Over Complexity**: Designed for a single practitioner, avoiding enterprise-level complexity
3. **Self-Hosted**: Complete local deployment with no external cloud dependencies
4. **HIPAA Compliance**: Immutable audit logging, data encryption, access controls
5. **Performance**: Table partitioning, strategic indexing, connection pooling
6. **Internationalization**: Full Italian/English support with runtime switching

---

## Technology Stack Decisions

### Backend: Rust + Axum

**Decision:** Use Rust 1.90+ with Axum 0.8.6 web framework

**Rationale:**
- **Memory Safety**: Zero-cost abstractions prevent buffer overflows and memory leaks critical in healthcare
- **Performance**: Native compilation delivers <200ms API response times (p95 target)
- **Type Safety**: Compile-time guarantees reduce runtime errors in medical data handling
- **SQLx**: Compile-time SQL verification catches database errors before deployment
- **Concurrency**: Tokio async runtime handles concurrent requests efficiently

**Alternatives Considered:**
- Node.js/Express: Rejected due to dynamic typing concerns for medical data
- Go/Gin: Good option but Rust's type system is stronger
- Python/FastAPI: Performance concerns for high-throughput scenarios

**Key Dependencies:**
```toml
axum = "0.8.6"         # Web framework
sqlx = "0.8"           # Compile-time verified SQL
tokio = "1.47"         # Async runtime
jsonwebtoken = "9.3"   # JWT authentication
argon2 = "0.5"         # Password hashing (Argon2id)
aes-gcm = "0.10"       # AES-256-GCM encryption
casbin = "2.14"        # RBAC authorization
```

### Frontend: React + TypeScript

**Decision:** Use React 18.3.1 with TypeScript 5.7.3 and Vite 6.0

**Rationale:**
- **Type Safety**: TypeScript catches type errors at build time
- **Component Ecosystem**: Shadcn/ui (Radix primitives) provides accessible, customizable components
- **Fast Development**: Vite's HMR enables rapid iteration
- **Data Fetching**: React Query v5 handles server state with caching and optimistic updates
- **Form Handling**: React Hook Form + Zod provides validated, type-safe forms

**Alternatives Considered:**
- Vue.js: Good option but team expertise favored React
- Angular: Too heavyweight for a single-practitioner application
- Svelte: Smaller ecosystem, fewer medical UI components available

**Key Dependencies:**
```json
{
  "react": "^18.3.1",
  "@tanstack/react-query": "^5.90.4",
  "react-router-dom": "^6.26.2",
  "react-hook-form": "^7.54.2",
  "zod": "^3.24.1",
  "i18next": "^25.6.0",
  "tailwindcss": "^3.4.17"
}
```

### Database: PostgreSQL 17

**Decision:** Use PostgreSQL 17 as the sole relational database

**Rationale:**
- **Row-Level Security**: Native RLS policies enforce data access at database level
- **JSONB Support**: Flexible schema for medical data (vitals, medications, addresses)
- **Table Partitioning**: Native partitioning for visits (by year) and audit_logs (by month)
- **Full-Text Search**: Built-in text search for patient lookup
- **HIPAA Compliance**: Encryption, audit capabilities, proven in healthcare

**Alternatives Considered:**
- MySQL: No native RLS, weaker JSONB support
- MongoDB: Document model doesn't fit relational medical records well
- SQLite: Insufficient for concurrent access and RLS needs

---

## Database Architecture

### Schema Design Philosophy

The database schema follows these principles:
1. **Encryption at Application Layer**: All PHI/PII fields encrypted with AES-256-GCM before storage
2. **Audit Trail**: Every table has `created_at`, `updated_at`, `created_by`, `updated_by`
3. **Soft Deletes**: Patient status (ACTIVE/INACTIVE/DECEASED) rather than hard deletes
4. **Referential Integrity**: Foreign keys with appropriate ON DELETE behaviors
5. **Immutability**: Signed/locked visits and audit logs cannot be modified

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────────┐       ┌──────────────────┐
│     users       │       │      patients       │       │  appointments    │
├─────────────────┤       ├─────────────────────┤       ├──────────────────┤
│ id (PK)         │◄──────│ created_by (FK)     │       │ id (PK)          │
│ username        │       │ id (PK)             │◄──────│ patient_id (FK)  │
│ email 🔒        │       │ medical_record_num  │       │ provider_id (FK) │──┐
│ password_hash   │       │ first_name 🔒       │       │ start_time       │  │
│ role            │       │ last_name 🔒        │       │ end_time         │  │
│ mfa_enabled     │       │ date_of_birth 🔒    │       │ status           │  │
│ mfa_secret 🔒   │       │ phone_primary 🔒    │       │ type             │  │
└─────────────────┘       │ allergies 🔒        │       │ notes 🔒         │  │
        │                 │ chronic_conditions🔒│       └──────────────────┘  │
        │                 │ status              │                │             │
        │                 └─────────────────────┘                │             │
        │                          │                             │             │
        │                          │                             ▼             │
        │                          │                 ┌──────────────────────┐  │
        │                          │                 │       visits         │  │
        │                          │                 │   (Partitioned by    │  │
        │                          │                 │    visit_date)       │  │
        │                          │                 ├──────────────────────┤  │
        │                          └────────────────►│ id (PK)              │  │
        │                                            │ patient_id (FK)      │  │
        └───────────────────────────────────────────►│ provider_id (FK)     │◄─┘
                                                     │ appointment_id (FK)  │
                                                     │ visit_date (PK, Part)│
                                                     │ vitals 🔒            │
                                                     │ subjective 🔒        │
                                                     │ objective 🔒         │
                                                     │ assessment 🔒        │
                                                     │ plan 🔒              │
                                                     │ status               │
                                                     │ signed_at            │
                                                     │ signature_hash       │
                                                     └──────────────────────┘
                                                              │
                         ┌────────────────────────────────────┼────────────────┐
                         │                                    │                │
                         ▼                                    ▼                ▼
              ┌─────────────────────┐           ┌────────────────────┐ ┌─────────────────┐
              │  visit_diagnoses    │           │   prescriptions    │ │  visit_versions │
              ├─────────────────────┤           ├────────────────────┤ ├─────────────────┤
              │ id (PK)             │           │ id (PK)            │ │ id (PK)         │
              │ visit_id (FK)       │           │ visit_id (FK)      │ │ visit_id (FK)   │
              │ icd10_code          │           │ patient_id (FK)    │ │ version_number  │
              │ description 🔒      │           │ medication_name 🔒 │ │ snapshot 🔒     │
              │ type                │           │ dosage 🔒          │ │ created_at      │
              │ is_primary          │           │ status             │ └─────────────────┘
              └─────────────────────┘           └────────────────────┘

                    Legend: 🔒 = Encrypted at application layer (AES-256-GCM)
```

### Table Partitioning Strategy

**Visits Table - Partitioned by Year:**
```sql
CREATE TABLE visits (
    id UUID DEFAULT gen_random_uuid(),
    visit_date DATE NOT NULL,
    -- ... other columns
    PRIMARY KEY (id, visit_date)
) PARTITION BY RANGE (visit_date);

-- Yearly partitions
CREATE TABLE visits_2025 PARTITION OF visits
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE visits_2026 PARTITION OF visits
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

**Rationale:**
- Medical records retention: 7+ years
- Queries typically filter by date range
- Enables efficient archival of old partitions
- Improves query performance through partition pruning

**Audit Logs Table - Partitioned by Month:**
```sql
CREATE TABLE audit_logs (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL,
    -- ... other columns
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE audit_logs_202501 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

**Rationale:**
- High write volume (every API action logged)
- 3-year retention policy
- Monthly granularity allows efficient purging

### Row-Level Security (RLS)

RLS is implemented at the PostgreSQL level to enforce data isolation even if application code has bugs.

**Session Context Setup:**
```sql
-- Functions to get current session context
CREATE FUNCTION get_current_user_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE FUNCTION is_doctor() RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.current_user_role', TRUE) IN ('ADMIN', 'DOCTOR');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Example Policies:**
```sql
-- Doctors can see all patients
CREATE POLICY patients_select_policy ON patients
    FOR SELECT USING (is_doctor());

-- Doctors can only update their own appointments
CREATE POLICY appointments_update_policy ON appointments
    FOR UPDATE
    USING (is_doctor() AND provider_id = get_current_user_id());

-- Only admins can view audit logs
CREATE POLICY audit_logs_select_policy ON audit_logs
    FOR SELECT USING (is_admin());
```

**Application Integration:**
```rust
// In Rust, set RLS context before queries
pub async fn set_rls_context(
    pool: &PgPool,
    user_id: &Uuid,
    user_role: &str,
) -> Result<(), SqlxError> {
    sqlx::query("SET LOCAL app.current_user_id = $1")
        .bind(user_id.to_string())
        .execute(pool).await?;

    sqlx::query("SET LOCAL app.current_user_role = $1")
        .bind(user_role)
        .execute(pool).await?;
    Ok(())
}
```

### Encryption Strategy

**Fields Requiring Encryption (PHI/PII):**
- Patient: first_name, last_name, date_of_birth, phone, email, address, allergies, medications
- Visit: vitals, subjective, objective, assessment, plan, clinical_notes
- Prescription: medication_name, dosage, instructions
- User: email, mfa_secret

**Encryption Implementation:**
```rust
// AES-256-GCM encryption with random nonce
pub fn encrypt(&self, plaintext: &str) -> Result<String> {
    let mut nonce_bytes = [0u8; 12]; // 96-bit nonce
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = self.cipher.encrypt(nonce, plaintext.as_bytes())?;

    // Combine: nonce || ciphertext, then base64 encode
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(BASE64.encode(combined))
}
```

---

## Security Architecture

> **Note:** For comprehensive security details, see [SECURITY.md](./SECURITY.md)

### Authentication Flow

```
┌──────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Client  │     │   Backend API   │     │    PostgreSQL    │
└────┬─────┘     └────────┬────────┘     └────────┬─────────┘
     │                    │                       │
     │ POST /auth/login   │                       │
     │ {username, pass}   │                       │
     │───────────────────►│                       │
     │                    │  SELECT user          │
     │                    │──────────────────────►│
     │                    │◄──────────────────────│
     │                    │                       │
     │                    │  Verify Argon2id hash │
     │                    │  Check lockout status │
     │                    │                       │
     │ [If MFA enabled]   │                       │
     │◄───────────────────│                       │
     │ {requires_mfa}     │                       │
     │                    │                       │
     │ POST /auth/login   │                       │
     │ {username, totp}   │                       │
     │───────────────────►│                       │
     │                    │  Verify TOTP code     │
     │                    │                       │
     │ {access_token,     │                       │
     │  refresh_token,    │  INSERT audit_log     │
     │  user}             │──────────────────────►│
     │◄───────────────────│                       │
```

### Authorization: Casbin RBAC

**Model Configuration (casbin/model.conf):**
```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

**Policy Examples (casbin/policy.csv):**
```csv
# DOCTOR permissions
p, DOCTOR, patients, create
p, DOCTOR, patients, read
p, DOCTOR, patients, update
p, DOCTOR, visits, create
p, DOCTOR, visits, sign

# ADMIN permissions (full access)
p, ADMIN, patients, delete
p, ADMIN, users, create
p, ADMIN, audit_logs, read
p, ADMIN, settings, update
```

### Security Layers Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Transport | TLS 1.3 + HSTS | Encrypted communication |
| Authentication | JWT + Argon2id + TOTP | Identity verification |
| Authorization | Casbin RBAC | Permission enforcement |
| Data Access | PostgreSQL RLS | Row-level isolation |
| Data at Rest | AES-256-GCM | PHI/PII encryption |
| Audit | Immutable audit_logs | Compliance trail |
| Rate Limiting | Governor/Tower | DoS prevention |

---

## Backend Architecture

### Module Structure

```
backend/src/
├── main.rs              # Application entry point
├── lib.rs               # Library crate for testing
├── config/
│   └── mod.rs           # Configuration from environment
├── db/
│   └── pool.rs          # PostgreSQL connection pool, RLS context
├── handlers/            # HTTP request handlers
│   ├── auth.rs          # Login, logout, MFA, refresh
│   ├── patients.rs      # Patient CRUD
│   ├── appointments.rs  # Appointment scheduling
│   ├── visits.rs        # Clinical documentation
│   ├── prescriptions.rs # Prescription management
│   ├── documents.rs     # PDF generation
│   ├── reports.rs       # Analytics endpoints
│   ├── drug_interactions.rs # DDInter 2.0 integration
│   └── ...
├── middleware/
│   ├── auth.rs          # JWT validation
│   ├── authorization.rs # Casbin RBAC
│   ├── rate_limit.rs    # Request throttling
│   ├── audit.rs         # Automatic audit logging
│   ├── cors.rs          # CORS configuration
│   └── request_context.rs # IP, user-agent extraction
├── models/              # Database entities and DTOs
│   ├── patient.rs       # Patient model with encryption
│   ├── visit.rs         # Visit with SOAP notes
│   ├── prescription.rs  # Prescription model
│   └── ...
├── services/            # Business logic layer
│   ├── auth_service.rs  # Authentication logic
│   ├── patient_service.rs # Patient operations
│   ├── visit_service.rs # Visit management
│   ├── drug_interaction_service.rs # DDI checking
│   ├── email_service.rs # SMTP integration
│   ├── notification_scheduler.rs # Background tasks
│   └── ...
├── routes/
│   └── api_v1.rs        # Route definitions
└── utils/
    ├── encryption.rs    # AES-256-GCM utilities
    ├── validators.rs    # Input validation
    └── errors.rs        # Error handling
```

### Application State

```rust
pub struct AppState {
    pub pool: PgPool,                        // Database connection pool
    pub auth_service: AuthService,           // JWT generation/validation
    pub session_manager: SessionManager,     // Session timeout tracking
    pub encryption_key: Option<EncryptionKey>, // AES-256-GCM key
    pub email_service: Option<EmailService>, // SMTP client
    pub settings_service: Arc<SettingsService>, // Cached settings
    pub start_time: SystemTime,              // For uptime tracking
    pub environment: String,                 // dev/production
    #[cfg(feature = "rbac")]
    pub enforcer: CasbinEnforcer,           // RBAC enforcer
}
```

### Middleware Stack

Request processing order (top to bottom):

```
┌─────────────────────────────────────────────┐
│              Incoming Request               │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│        1. TraceLayer (tower-http)           │
│     Structured logging, request IDs         │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│           2. CORS Middleware                │
│     Validates Origin, handles preflight     │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│       3. Request Context Middleware         │
│   Extracts IP, User-Agent, Request ID       │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│      4. JWT Authentication Middleware       │
│  Validates token, extracts user_id & role   │
│        (Applied to protected routes)        │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│            5. Route Handler                 │
│    Sets RLS context, executes business      │
│    logic, returns response                  │
└─────────────────────────────────────────────┘
```

### Error Handling

Standardized error responses across all endpoints:

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Database error")]
    Database(#[from] sqlx::Error),

    #[error("Internal error")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, m.clone()),
            AppError::Unauthorized(m) => (StatusCode::UNAUTHORIZED, m.clone()),
            AppError::Forbidden(m) => (StatusCode::FORBIDDEN, m.clone()),
            AppError::Validation(m) => (StatusCode::BAD_REQUEST, m.clone()),
            AppError::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database error".into()),
            AppError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal error".into()),
        };

        (status, Json(json!({"error": message}))).into_response()
    }
}
```

---

## Frontend Architecture

### Component Structure

```
frontend/src/
├── App.tsx              # Root component with providers
├── main.tsx             # Application entry point
├── routes/
│   └── index.tsx        # Route definitions
├── components/
│   ├── ui/              # Shadcn/ui components (Button, Input, etc.)
│   ├── layouts/         # MainLayout, RootLayout
│   ├── patients/        # Patient-specific components
│   ├── appointments/    # Calendar, scheduling
│   ├── visits/          # Clinical documentation
│   ├── prescriptions/   # Prescription management
│   ├── documents/       # PDF templates, generation
│   ├── reports/         # Analytics charts
│   ├── auth/            # Login, MFA enrollment
│   └── providers/       # ThemeProvider
├── pages/               # Route page components
│   ├── DashboardPage.tsx
│   ├── patients/
│   ├── appointments/
│   └── ...
├── services/api/        # API client functions
│   ├── axios-instance.ts # Configured Axios client
│   ├── auth.ts
│   ├── patients.ts
│   ├── visits.ts
│   └── ...
├── store/
│   └── authStore.tsx    # Authentication context
├── i18n/
│   ├── index.ts         # i18next configuration
│   └── locales/
│       ├── en.json      # English translations
│       └── it.json      # Italian translations
├── lib/
│   ├── react-query.ts   # QueryClient configuration
│   ├── utils.ts         # cn() and utility functions
│   └── validations/     # Zod schemas
├── types/               # TypeScript interfaces
└── styles/
    └── globals.css      # Tailwind + custom styles
```

### Provider Hierarchy

```tsx
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="docpat-theme">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

### State Management Strategy

| State Type | Solution | Use Case |
|------------|----------|----------|
| Server State | React Query | API data, caching, mutations |
| Auth State | React Context | User session, tokens |
| UI State | React useState | Component-local state |
| Form State | React Hook Form | Form inputs, validation |
| Theme | ThemeProvider Context | Light/dark mode |
| Language | i18next | Translations |

### React Query Configuration

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 30 * 60 * 1000,        // 30 minutes (formerly cacheTime)
      retry: 1,                       // Retry failed requests once
      refetchOnWindowFocus: false,   // Don't refetch on tab focus
    },
    mutations: {
      retry: 0,                      // Don't retry mutations
    },
  },
});
```

### Routing Structure

```typescript
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public routes
      { path: '/login', element: <LoginPage /> },

      // Protected routes
      {
        element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/patients', element: <PatientsPage /> },
          { path: '/patients/:id', element: <PatientDetailPage /> },
          { path: '/appointments', element: <AppointmentsPage /> },
          { path: '/visits', element: <VisitsPage /> },
          // Admin-only routes
          {
            path: '/users',
            element: <ProtectedRoute requiredRole="ADMIN"><UsersPage /></ProtectedRoute>
          },
          { path: '/audit-logs', element: <ProtectedRoute requiredRole="ADMIN">...</ProtectedRoute> },
        ]
      }
    ]
  }
]);
```

---

## API Design

### RESTful Conventions

**URL Structure:**
```
/api/v1/{resource}           # Collection
/api/v1/{resource}/{id}      # Individual resource
/api/v1/{resource}/{id}/{sub} # Sub-resource
```

**HTTP Methods:**
| Method | Action | Example |
|--------|--------|---------|
| GET | Read | `GET /api/v1/patients` |
| POST | Create | `POST /api/v1/patients` |
| PUT | Full Update | `PUT /api/v1/patients/{id}` |
| DELETE | Delete | `DELETE /api/v1/patients/{id}` |
| POST | Actions | `POST /api/v1/visits/{id}/sign` |

### Response Format

**Success Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "John Doe"
  }
}
```

**Paginated Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 150,
    "total_pages": 8
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "constraint": "email format"
    }
  }
}
```

### Rate Limiting

| Client Type | Limit | Window |
|-------------|-------|--------|
| Unauthenticated | 100 requests | 1 minute |
| Authenticated | 300 requests | 1 minute |
| Bulk Operations | 10 requests | 1 minute |

**Headers Returned:**
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1738425600
Retry-After: 45  (only on 429)
```

### API Endpoint Summary

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Auth | 5 | Login, logout, refresh, MFA setup/enroll |
| Patients | 9 | CRUD, search, statistics, notification preferences |
| Appointments | 9 | CRUD, availability check, daily/weekly/monthly schedules |
| Visits | 11 | CRUD, sign, lock, versions, restore |
| Prescriptions | 10 | CRUD, status transitions, medication search |
| Diagnoses | 4 | CRUD, ICD-10 search |
| Documents | 8 | Templates, generation, signing, delivery |
| Reports | 7 | Dashboard, appointments, patients, productivity |
| Users | 10 | CRUD, activate/deactivate, role assignment |
| Settings | 7 | CRUD, bulk update, groups |
| System | 5 | Health, info, storage, backup status |
| **Total** | **~144** | Full API surface |

---

## Integration Patterns

### Drug Interaction Checking (DDInter 2.0)

**Data Source:** DDInter 2.0 database with 170,449 drug-drug interactions

**Integration Flow:**
```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend API      │    │   PostgreSQL    │
│                 │    │                      │    │                 │
│ New Prescription│───►│ POST /prescriptions  │    │ drug_interactions│
│   (medication)  │    │                      │    │ (170,449 rows)  │
└─────────────────┘    │                      │    │                 │
                       │ ┌──────────────────┐ │    │ medications     │
                       │ │ DrugInteraction  │ │    │ (2,600+ meds)   │
                       │ │    Service       │ │    │                 │
                       │ └────────┬─────────┘ │    └────────┬────────┘
                       │          │           │             │
                       │   1. Get patient's   │             │
                       │      current meds    │─────────────►│
                       │                      │◄────────────│
                       │   2. Query drug      │             │
                       │      interactions    │─────────────►│
                       │                      │◄────────────│
                       │   3. Return warnings │             │
                       │      (if any)        │             │
                       └──────────┬───────────┘             │
                                  │                         │
                       ┌──────────▼───────────┐             │
                       │ {                    │             │
                       │   "interactions": [  │             │
                       │     {                │             │
                       │       "drug_a": "X", │             │
                       │       "drug_b": "Y", │             │
                       │       "severity":    │             │
                       │         "MAJOR",     │             │
                       │       "description": │             │
                       │         "..."        │             │
                       │     }                │             │
                       │   ]                  │             │
                       │ }                    │             │
                       └──────────────────────┘             │
```

### Email Notifications (SMTP)

**Configuration:**
```rust
pub struct EmailConfig {
    pub smtp_host: String,      // e.g., "smtp.gmail.com"
    pub smtp_port: u16,         // e.g., 587
    pub smtp_username: String,
    smtp_password: String,      // Redacted in logs
    pub from_email: String,
    pub from_name: String,
    pub enabled: bool,
}
```

**Notification Types:**
- Appointment reminders (configurable: 1 day, 2 days, 1 week before)
- Appointment confirmations
- Appointment cancellations
- Document delivery (PDFs attached)

### Medication Database (AIFA)

**Data Source:** Italian AIFA database with 2,600+ approved medications

**Integration:**
- Imported via `import-medications` binary
- Fuzzy search using `strsim` crate for name matching
- Custom medications can be added per-practice

---

## Deployment Architecture

### Docker Compose Production Stack

```yaml
services:
  postgres:
    image: postgres:17-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: mpms_prod
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    networks:
      - backend_network
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    networks:
      - backend_network
    deploy:
      resources:
        limits:
          memory: 512M

  backend:
    build:
      dockerfile: infrastructure/docker/Dockerfile.backend
    environment:
      DATABASE_URL: postgresql://...@postgres:5432/mpms_prod
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - backend_network

  frontend:
    build:
      dockerfile: infrastructure/docker/Dockerfile.frontend
    networks:
      - frontend_network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - certbot_certs:/etc/letsencrypt:ro
    depends_on:
      - backend
      - frontend
    networks:
      - frontend_network
      - backend_network

networks:
  frontend_network:
    driver: bridge
  backend_network:
    driver: bridge
    internal: true  # No direct external access
```

### Network Isolation

```
                    ┌─────────────────────────────────────┐
                    │            INTERNET                 │
                    └─────────────────────────────────────┘
                                      │
                                      │ :80, :443
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         frontend_network                                 │
│                                                                          │
│   ┌─────────────┐                              ┌─────────────────────┐  │
│   │   Nginx     │◄───────────────────────────►│     Frontend        │  │
│   │ (Reverse    │                              │    Container        │  │
│   │  Proxy)     │                              └─────────────────────┘  │
│   └─────────────┘                                                        │
│          │                                                               │
└──────────┼───────────────────────────────────────────────────────────────┘
           │
           │ /api/v1/*
           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     backend_network (internal: true)                     │
│                                                                          │
│   ┌─────────────┐       ┌─────────────┐       ┌─────────────────────┐  │
│   │   Backend   │◄─────►│  PostgreSQL │       │       Redis         │  │
│   │    :8000    │       │    :5432    │       │       :6379         │  │
│   └─────────────┘       └─────────────┘       └─────────────────────┘  │
│                                                                          │
│         ⚠️ No direct external access to database/cache                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

### Database Optimization

| Technique | Implementation | Benefit |
|-----------|---------------|---------|
| Connection Pooling | SQLx with 20-50 connections | Reduced connection overhead |
| Table Partitioning | Visits by year, audit_logs by month | Faster queries, efficient archival |
| Strategic Indexes | Patient name, DOB, phone; visit dates | <100ms query targets |
| JSONB with GIN | Medical data (vitals, medications) | Flexible schema + fast queries |
| Full-Text Search | Patient name search | Sub-second patient lookup |

### Backend Optimization

| Technique | Implementation | Benefit |
|-----------|---------------|---------|
| Compile-Time SQL | SQLx prepared statements | No runtime SQL parsing |
| Async I/O | Tokio runtime | Efficient concurrent handling |
| Zero-Copy | Rust ownership | No unnecessary data copies |
| Connection Reuse | HTTP keep-alive | Reduced TCP overhead |

### Frontend Optimization

| Technique | Implementation | Benefit |
|-----------|---------------|---------|
| Code Splitting | React.lazy + Suspense | Smaller initial bundle |
| Query Caching | React Query staleTime | Reduced API calls |
| Optimistic Updates | React Query mutations | Instant UI feedback |
| Tree Shaking | Vite + ESM | Dead code elimination |

---

## Testing Architecture

### Test Coverage Summary

| Category | Framework | Test Count |
|----------|-----------|------------|
| Backend Unit | Rust #[test] | ~531 |
| Backend Integration | Rust #[tokio::test] | ~381 |
| Frontend Unit | Vitest + RTL | ~3,410 |
| E2E | Playwright | ~240 |
| **Total** | | **~4,562** |

### Backend Testing Strategy

```rust
// Unit test example
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_string() {
        let key = setup_test_key();
        let plaintext = "Sensitive medical data";
        let encrypted = key.encrypt(plaintext).unwrap();
        let decrypted = key.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }
}

// Integration test example
#[tokio::test]
async fn test_create_patient() {
    let app = spawn_test_app().await;
    let token = login_as_doctor(&app).await;

    let response = app.client
        .post("/api/v1/patients")
        .bearer_auth(&token)
        .json(&json!({"first_name": "John", ...}))
        .send()
        .await;

    assert_eq!(response.status(), 201);
}
```

### Frontend Testing Strategy

```typescript
// Component test example
describe('PatientForm', () => {
  it('validates required fields', async () => {
    render(<PatientForm />);

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
  });
});

// E2E test example (Playwright)
test('complete patient visit workflow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="username"]', 'doctor1');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.goto('/patients/new');
  await page.fill('[name="firstName"]', 'Test');
  // ... complete form
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/patients\/[a-f0-9-]+/);
});
```

---

## Monitoring & Observability

### Logging

**Backend (tracing crate):**
```rust
tracing_subscriber::registry()
    .with(EnvFilter::from_default_env())  // RUST_LOG env var
    .with(fmt::layer())                   // JSON or text format
    .init();

// Structured logging
tracing::info!(
    user_id = %user.id,
    action = "login",
    ip = %request_ctx.ip_address,
    "User logged in successfully"
);
```

**Log Levels:**
- `ERROR`: Application errors, failed operations
- `WARN`: Degraded functionality, approaching limits
- `INFO`: Significant events (login, data changes)
- `DEBUG`: Detailed operational information
- `TRACE`: Fine-grained debugging (SQL queries)

### Health Checks

**Endpoint:** `GET /health` and `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "timestamp": "2026-02-01T12:00:00Z",
  "database": "connected"
}
```

**Docker Health Check:**
```yaml
healthcheck:
  test: ["CMD", "/app/docpat-backend", "--health-check"]
  interval: 30s
  timeout: 3s
  retries: 3
```

### Audit Trail

All data access and modifications are logged to `audit_logs`:

```sql
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address)
VALUES ($1, 'UPDATE', 'PATIENT', $2, $3, $4);
```

**Logged Actions:**
- CREATE, READ, UPDATE, DELETE on all entities
- LOGIN, LOGOUT, LOGIN_FAILED
- MFA_SETUP, MFA_VERIFIED
- EXPORT operations
- Settings changes

---

## Appendix: Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2025-10 | Rust for backend | Type safety for medical data, performance | Node.js, Go |
| 2025-10 | PostgreSQL RLS | Database-level security enforcement | Application-only auth |
| 2025-10 | AES-256-GCM | HIPAA-compliant encryption standard | ChaCha20 |
| 2025-10 | Table partitioning | Query performance, data retention | No partitioning |
| 2025-11 | Casbin for RBAC | Flexible policy-as-code | Custom RBAC |
| 2025-11 | React Query | Server state management | Redux, Zustand |
| 2025-12 | DDInter 2.0 | Comprehensive drug interaction data | DrugBank (paid) |
| 2026-01 | Playwright for E2E | Cross-browser, reliable | Cypress |

---

**Document Maintainer:** DocPat Development Team
**Review Schedule:** Quarterly or after major architectural changes
