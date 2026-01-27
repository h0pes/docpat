# DocPat - Medical Practice Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.90+-orange.svg)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19.1-blue.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-3791%2B%20passing-brightgreen.svg)]()

> A secure, self-hosted Medical Practice Management System designed for individual practitioners prioritizing simplicity, data sovereignty, and military-grade security.

## Overview

DocPat (Documentation for Patients) is a comprehensive medical practice management system built specifically for solo practitioners, initially designed for a geriatrician/acupuncturist. The system handles patient management, appointment scheduling, clinical documentation, and administrative tasks while maintaining complete data ownership through self-hosted deployment.

### Core Philosophy

- **Simplicity First**: Designed for one doctor, not enterprise complexity
- **Security by Default**: All medical data encrypted at rest and in transit
- **User-Centric**: Intuitive workflows that reduce administrative burden
- **Self-Hosted**: Complete data sovereignty, no vendor lock-in
- **Compliance-Ready**: Built-in HIPAA and regulatory compliance

### Current Features (MVP Complete)

- **Military-Grade Security**: AES-256-GCM encryption, JWT with MFA (TOTP), comprehensive audit trails
- **Smart Scheduling**: Conflict detection at database level, recurring appointments, availability management
- **Clinical Documentation**: SOAP notes, vital signs, ICD-10 diagnoses with autocomplete, digital signatures
- **Patient Management**: Fast search (<2s), duplicate detection, complete medical history, allergies tracking
- **Prescription Management**: Full-featured prescription list with filters, create/edit/renew/discontinue workflows, print functionality, active prescriptions widget
- **Drug Interaction Checking**: Real-time drug-drug interaction warnings powered by DDInter 2.0 database with 170,000+ interactions, severity-based alerts (major/moderate/minor), automatic checking when prescribing, fuzzy name matching for Italian/English drug names (e.g., Ibuprofene↔Ibuprofen)
- **Medications Database**: AIFA (Italian Medicines Agency) database with 2,600+ medications, ATC classification codes, fuzzy search with trigram matching, custom medication support for manual entries
- **Visit Templates**: Reusable clinical note templates for common visit types
- **Visit Version History**: Full audit trail with restore capability for visit modifications
- **Document Generation**: Medical certificates, referral letters, visit summaries, custom templates
- **Reporting & Analytics**: Appointment utilization, patient demographics, provider productivity dashboards
- **Administration**: User management, system settings, audit logs, system health monitoring
- **Email Notifications**: Appointment confirmations, reminders, and cancellation notices with SMTP integration
- **Notification Scheduler**: Automatic reminder emails based on patient preferences
- **Internationalization**: Full Italian/English support with runtime switching
- **Theme Support**: Light/Dark themes with user preferences persistence
- **Role-Based Access Control**: RBAC with Casbin (ADMIN/DOCTOR roles)

## Technology Stack

### Frontend
- **React 19.1** with TypeScript 5.9
- **Vite** - Lightning-fast build tool
- **Tailwind CSS 4.1** - Utility-first styling
- **Shadcn UI 3.3.1** - Beautiful component library
- **React Query (TanStack Query)** - Server state management with caching
- **React Hook Form + Zod** - Type-safe forms and validation
- **React Router v6** - Client-side routing
- **i18next** - Internationalization
- **Chart.js** - Analytics visualizations

### Backend
- **Rust 1.90** - Memory-safe systems programming
- **Axum 0.8.6** - Modern async web framework
- **SQLx** - Compile-time verified SQL queries
- **Tokio** - Async runtime
- **Argon2** - Secure password hashing (OWASP recommended)
- **JWT** - Token-based authentication with refresh tokens
- **Casbin** - Flexible RBAC authorization (optional feature)
- **Tower** - Middleware ecosystem

### Database & Infrastructure
- **PostgreSQL 17** - Primary database with Row-Level Security (RLS)
- **Redis 8.2** - Optional session caching
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy with SSL/TLS termination
- **Let's Encrypt** - Free SSL certificates

## Quick Start

### Prerequisites

- Rust 1.90+ ([Install Rust](https://www.rust-lang.org/tools/install))
- Node.js 20+ LTS ([Install Node](https://nodejs.org/))
- PostgreSQL 17
- Redis 8.2 (optional)
- Docker and Docker Compose (for containerized deployment)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/h0pes/docpat.git
cd docpat

# Backend setup
cd backend
cp .env.example .env
# Edit .env with your configuration
cargo build

# Run migrations
cargo install sqlx-cli --no-default-features --features postgres
sqlx database create
sqlx migrate run

# Frontend setup
cd ../frontend
cp .env.example .env
# Edit .env with your configuration
npm install  # or pnpm install

# Run the application
# Terminal 1 - Backend
cd backend && cargo run

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Docker Development Environment

The easiest way to get started is using Docker Compose:

```bash
# Create environment file
cp .env.example .env
# Edit .env with your configuration (see comments in file)

# Build and run all services (with build)
docker-compose -f docker-compose.dev.yml up --build

# Run in detached mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f backend

# Stop services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.dev.yml down -v
```

### Docker Production Deployment

For production deployment with SSL/TLS:

```bash
# Create production environment file
cp .env.example .env
# Configure production secrets (JWT_SECRET, POSTGRES_PASSWORD, etc.)

# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
openssl rand -base64 24  # For ENCRYPTION_KEY (32 bytes)

# Build production images
docker-compose build

# Run in production mode
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart backend

# Stop all services
docker-compose down
```

### Database Operations

```bash
# Access PostgreSQL (Docker)
docker exec -it mpms-postgres-dev psql -U mpms_user -d mpms_dev

# Run migrations (Docker)
docker exec mpms-backend-dev sqlx migrate run

# Backup database
docker exec mpms-postgres pg_dump -U mpms_user mpms_prod > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i mpms-postgres psql -U mpms_user mpms_prod < backup_20251016.sql
```

### Medications Database Import

DocPat includes the AIFA (Italian Medicines Agency) medications database. To import medications:

```bash
# Import AIFA medications (run from backend directory)
cd backend
cargo run --bin import_medications

# This imports:
# - ~2,600+ Class A medications with brand/generic names
# - ~7,000 ATC (Anatomical Therapeutic Chemical) classification codes
# - Fuzzy search indexes using PostgreSQL trigram extension
```

The import tool downloads CSV data from AIFA Open Data and populates the `medications` and `atc_codes` tables. Custom medications can be added via the API for drugs not in the AIFA database.

### Drug Interactions Database Import

DocPat includes a comprehensive drug-drug interaction database powered by DDInter 2.0:

```bash
# Import DDInter 2.0 drug interactions (run from backend directory)
cd backend

# Download DDInter 2.0 data (manual step - visit https://ddinter2.scbdd.com/download/)
# Place CSV files in backend/data/ddinter/

# Import to development database
cargo run --bin import-drug-interactions

# Import to test database
DATABASE_URL=$TEST_DATABASE_URL cargo run --bin import-drug-interactions

# This imports:
# - 170,449 drug-drug interactions with ATC code mapping
# - Severity classifications: major, moderate, minor, unknown
# - Effect descriptions and clinical management recommendations
```

**DDInter 2.0 Database Statistics:**
| Metric | Count |
|--------|-------|
| Total Interactions | 170,449 |
| Major Severity | 29,133 |
| Moderate Severity | 97,683 |
| Minor Severity | 6,331 |
| Unknown Severity | 37,302 |

The system automatically checks for drug interactions when:
- Creating a new prescription (checks against patient's active medications)
- Editing an existing prescription
- Viewing prescription details

Interactions are displayed with severity-based color coding and include clinical management recommendations where available.

**Data Source**: [DDInter 2.0](https://ddinter2.scbdd.com/) - Xiangya School of Pharmaceutical Sciences

### Health Checks

All services include health checks:

```bash
# Backend health
curl http://localhost:8000/health

# Full health check response
curl http://localhost:8000/api/health

# Check Docker health status
docker ps --format "table {{.Names}}\t{{.Status}}"
```

## Documentation

- **[API Documentation](docs/API.md)** - Complete REST API reference (83 endpoints documented)
- **[Product Requirements Document (PRD)](docs/PRD.md)** - Comprehensive requirements and specifications
- **[Planning Document](docs/PLANNING.md)** - Architecture and development setup
- **[Task Tracking](docs/TASKS.md)** - Milestone-based task breakdown
- **[Claude Development Guide](docs/CLAUDE.md)** - AI-assisted development guidelines
- **[Security Guidelines](docs/SECURITY.md)** - Security best practices and compliance
- **[Session History](docs/SESSIONS.md)** - Development session logs and decisions
- **[Backend Testing Strategy](backend/TESTING.md)** - Testing approach, coverage analysis, priorities
- **[Backend Integration Tests Guide](backend/tests/README.md)** - Detailed integration test documentation
- **[Frontend Testing Strategy](frontend/TESTING.md)** - Frontend testing approach, priorities, patterns
- **[Frontend E2E Tests Guide](frontend/tests/README.md)** - Playwright E2E test documentation

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │         Nginx (Reverse Proxy)       │
                    │    SSL/TLS, Rate Limiting, WAF      │
                    └─────────────────────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────┐
                    │      Rust/Axum Application          │
                    │     (83 REST API Endpoints)         │
                    └─────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌───────────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    PostgreSQL 17      │ │ Redis (Cache)   │ │ File Storage    │
│  (RLS, Encryption)    │ │   (Optional)    │ │  (Documents)    │
└───────────────────────┘ └─────────────────┘ └─────────────────┘
```

### Project Structure

```
docpat/
├── backend/              # Rust backend application
│   ├── src/
│   │   ├── handlers/     # HTTP request handlers (21 modules)
│   │   ├── models/       # Data models and DTOs
│   │   ├── services/     # Business logic layer
│   │   ├── routes/       # API route definitions
│   │   └── utils/        # Utilities, encryption, errors
│   ├── migrations/       # SQLx database migrations
│   ├── tests/            # Integration tests (381 tests, 21 suites)
│   ├── TESTING.md        # Testing strategy documentation
│   └── casbin/           # RBAC policy definitions
├── frontend/             # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components (~2,761 tests)
│   │   ├── pages/        # Page-level containers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API service layer
│   │   ├── store/        # State management (React Context)
│   │   ├── test/         # Test setup and mocks
│   │   └── lib/          # Utilities and helpers
│   ├── tests/e2e/        # Playwright E2E tests (~65 tests)
│   ├── TESTING.md        # Frontend testing strategy
│   └── vitest.config.ts  # Vitest configuration
├── infrastructure/       # Docker, Nginx, monitoring configs
├── scripts/              # Utility scripts (setup, backup, deploy)
├── docs/                 # Documentation
└── docker-compose.yml
```

## API Overview

DocPat exposes 83 REST API endpoints organized by resource:

| Resource | Endpoints | Description |
|----------|-----------|-------------|
| Health | 1 | System health check |
| Authentication | 5 | Login, logout, refresh, MFA setup/verify |
| Users | 8 | User CRUD, password management, unlock |
| Patients | 10 | Patient CRUD, search, statistics |
| Appointments | 11 | Scheduling, availability, conflicts, statistics |
| Visits | 12 | Clinical documentation, sign/lock workflow |
| Diagnoses | 5 | ICD-10 codes, patient/visit diagnoses |
| Prescriptions | 12 | Medication management, status transitions, templates |
| Drug Interactions | 5 | Interaction checking, patient interactions, statistics |
| Notifications | 8 | Email notifications, reminders, preferences, statistics |
| Visit Templates | 5 | Reusable clinical note templates |
| Prescription Templates | 5 | Reusable prescription templates |
| Visit Versions | 3 | Version history and restoration |

See [API Documentation](docs/API.md) for complete endpoint details with request/response examples.

## Security

Security is non-negotiable in healthcare applications. DocPat implements:

### Encryption
- **At Rest**: AES-256-GCM encryption for all sensitive patient data
- **In Transit**: TLS 1.3 with HSTS headers
- **Key Management**: Environment-based encryption key storage

### Authentication & Authorization
- **JWT Tokens**: Access tokens (15min) + Refresh tokens (7 days)
- **MFA Support**: TOTP-based two-factor authentication
- **RBAC**: Role-Based Access Control with Casbin (ADMIN/DOCTOR roles)
- **Account Security**: Lockout after 5 failed attempts, password complexity requirements

### Data Protection
- **Audit Logging**: Immutable audit trails for all medical data access
- **Row-Level Security**: PostgreSQL RLS for data isolation
- **Input Validation**: Comprehensive validation at API and database levels
- **SQL Injection Prevention**: SQLx compile-time verified queries
- **XSS Protection**: React escaping + Content Security Policy headers

### Rate Limiting
- Anonymous requests: 100/minute
- Authenticated requests: 300/minute

**IMPORTANT**: All medical data is encrypted at rest and in transit. Zero data breach tolerance.

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| System Uptime | 99.9% | Achievable |
| Page Load Time | <2 seconds | Met |
| API Response Time | <200ms (p95) | Met |
| Database Query Time | <100ms (p95) | Met |
| Appointment Scheduling | <1 minute | Met |
| Visit Documentation | <5 minutes during visit | Met |

## Testing

DocPat maintains comprehensive test coverage with a two-tier testing strategy for both backend and frontend.

### Current Test Status

| Category | Tests | Coverage | Status |
|----------|-------|----------|--------|
| Backend Integration | 381 | ~98% endpoints | ✅ Passing |
| Backend Unit | ~531 | ~25% code | ✅ Exceeds Target |
| Frontend Component | 2,761 | 100% components | ✅ Passing |
| Frontend Page | 318 | 100% pages (34 files) | ✅ Passing |
| Frontend Hooks | 310 | 100% hooks | ✅ Passing |
| Frontend API Services | 293 | 100% services | ✅ Passing |
| Frontend Store | 17 | 100% stores | ✅ Passing |
| Frontend E2E | ~65 | 3 workflows | ✅ Passing |
| **Total** | **~3,791** | - | **All Passing** |

### Backend Testing

The backend uses a two-tier testing strategy:
- **Integration tests (primary)**: 381 tests across 21 suites validating full API request/response cycles including RBAC, database operations, and business logic
- **Unit tests (supplementary)**: ~531 tests targeting complex business logic, utilities, and edge cases

### Frontend Testing

The frontend uses a two-tier testing strategy:
- **Component/Unit tests (Vitest)**: 2,761 component tests + 318 page tests + 310 hook tests + 293 API service tests + 17 store tests across 198 test files
- **E2E tests (Playwright)**: ~65 tests covering patient, appointment, and visit workflows

**Component Test Coverage by Module:**
| Module | Components | Tested | Coverage |
|--------|------------|--------|----------|
| system-health | 5 | 5 | 100% |
| patients | 8 | 8 | 100% |
| documents | 11 | 11 | 100% |
| reports | 5 | 5 | 100% |
| prescriptions | 12 | 12 | 100% |
| users | 4 | 4 | 100% |
| visits | 20 | 20 | 100% |
| settings | 10 | 10 | 100% |
| audit | 5 | 5 | 100% |
| appointments | 10 | 10 | 100% |
| auth | 3 | 3 | 100% |
| notifications | 3 | 3 | 100% |
| layouts | 4 | 4 | 100% |
| ui (Radix wrappers) | 33 | 33 | 100% |

**Integration Test Suites:**
| Suite | Tests | Status |
|-------|-------|--------|
| Patients | 31 | ✅ |
| Users | 25 | ✅ |
| Appointments | 25 | ✅ |
| Holidays | 23 | ✅ |
| Visits | 22 | ✅ |
| Notifications | 21 | ✅ |
| Prescriptions | 20 | ✅ |
| Reports | 19 | ✅ |
| Working Hours | 19 | ✅ |
| Files | 18 | ✅ |
| Documents | 17 | ✅ |
| Diagnoses | 17 | ✅ |
| Audit Logs | 16 | ✅ |
| Drug Interactions | 16 | ✅ |
| Auth | 17 | ✅ **SECURITY** |
| Settings | 13 | ✅ |
| Prescription Templates | 12 | ✅ |
| System Health | 12 | ✅ |
| Visit Templates | 11 | ✅ |
| Visit Versions | 10 | ✅ |
| MFA | 17 | ✅ **IMPROVED** |

### Running Tests

```bash
# Backend integration tests (recommended)
cd backend
./run-integration-tests.sh              # All 21 suites, serial execution

# Backend unit tests
cargo test --lib --features "rbac,report-export,pdf-export"

# Specific test suite
cargo test --test patient_integration_tests --features "rbac,report-export,pdf-export" -- --test-threads=1

# Frontend tests
cd frontend
npm test                                # Component tests
npm run test:e2e                        # E2E tests with Playwright

# Code coverage
cd backend && cargo tarpaulin --lib --features "rbac,report-export,pdf-export" --out Html
cd frontend && npm run test:coverage
```

### Test Documentation

- **[Backend Testing Strategy](backend/TESTING.md)** - Overall testing approach, coverage gaps, priorities
- **[Backend Integration Tests README](backend/tests/README.md)** - Detailed integration test documentation
- **[Frontend Testing Strategy](frontend/TESTING.md)** - Frontend testing approach, coverage analysis, priorities
- **[Frontend E2E Tests README](frontend/tests/README.md)** - Playwright E2E test documentation

## Development Workflow

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

Example: `feat(visits): add version history with restore functionality`

### Code Quality

```bash
# Backend
cd backend
cargo clippy -- -D warnings
cargo fmt

# Frontend
cd frontend
npm run lint
npm run format

# Security audit
cargo audit  # Backend
npm audit    # Frontend
```

## Roadmap

### Phase 1: Foundation (Milestones 1-4) - COMPLETE
- Project structure and infrastructure setup
- Database schema with 20+ migrations (RLS, indexes, full-text search)
- Authentication system with JWT + MFA (TOTP)
- User management with RBAC

### Phase 2: MVP Core (Milestones 5-8) - COMPLETE
- Patient management with search and statistics
- Appointment scheduling with conflict detection
- Clinical documentation (SOAP notes, vitals, diagnoses)
- Prescription management

### Phase 3: MVP Enhancement (Milestones 9-10) - COMPLETE
- Visit templates for common clinical scenarios
- Prescription templates for frequently used medications
- Visit version history with restore capability
- Enhanced prescription workflow (discontinuation, refills)
- Comprehensive integration testing (314 tests across 17 suites)

### Phase 4: Document Generation (Milestone 11) - COMPLETE
- PDF generation for medical certificates
- Referral letters
- Visit summaries
- Lab request forms
- Custom document templates with variable system

### Phase 5: Reporting & Analytics (Milestone 12) - COMPLETE
- Appointment utilization reports
- Patient demographics analysis
- Provider productivity metrics
- Dashboard visualizations with Chart.js
- Report export (PDF, Excel)

### Phase 6: Administration (Milestone 13) - COMPLETE
- User management with RBAC enforcement
- System settings management (practice, appointments, localization, security)
- Working hours and holiday configuration
- Comprehensive audit logging with export
- System health dashboard with real-time monitoring

### Phase 7: Prescriptions Management Frontend (Milestone 14) - COMPLETE
- Full-featured prescription list with filters
- Create, edit, view prescription workflows
- Discontinue and renew prescription dialogs
- Print prescription functionality
- **Drug interaction checking with DDInter 2.0** (170,449 interactions)
- Real-time interaction warnings when prescribing
- Active prescriptions dashboard widget
- AIFA medications database (2,600+ Italian medications with ATC codes)
- Fuzzy medication search with trigram matching
- Custom medication entry for unlisted medications
- 156 unit tests for prescription components

### Phase 8: Notification System (Milestone 15) - COMPLETE
- **Email notification service** with SMTP integration (Gmail, custom SMTP)
- **Appointment confirmation emails** sent automatically when booking
- **Appointment reminder scheduler** with configurable run time
- **Patient notification preferences** (per-patient email/reminder settings)
- **Notification queue management** with status tracking (PENDING, SENT, FAILED)
- **Failed notification retry** mechanism with configurable max retries
- **Test email functionality** for SMTP verification (Admin only)
- **Notification history** and statistics dashboard
- **Scheduler settings** via Admin UI (time, batch size, auto-retry)
- Comprehensive i18n support (English/Italian)
- 29 unit tests for notification scheduler and service

### Future Enhancements (Milestones 16-21)
- Automated appointment reminders (email/SMS/WhatsApp)
- Patient portal (self-service)
- Mobile app (Android)
- HL7/FHIR integration
- Telemedicine integration

## Contributing

This is a private project currently under active development. Contributions are not being accepted at this time.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or support:
- Check the [documentation](docs/)
- Review [PLANNING.md](docs/PLANNING.md) for architecture details
- Consult [TASKS.md](docs/TASKS.md) for known issues and roadmap

## Compliance Notice

This system is designed to help healthcare practitioners maintain HIPAA compliance. However, achieving full compliance requires proper configuration, deployment, and operational procedures. Consult with compliance experts for your specific use case.

## Acknowledgments

- Built with modern, open-source technologies
- Designed for healthcare practitioners who value simplicity and security
- Inspired by the need for affordable, self-hosted practice management

---

**Version**: 1.0.0-beta
**Status**: MVP Complete - Active Development
**Last Updated**: January 2026

**Built with Rust, React, and a commitment to data sovereignty**
