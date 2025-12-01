# DocPat - Medical Practice Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.90+-orange.svg)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19.1-blue.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-306%2B%20passing-brightgreen.svg)]()

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
- **Prescription Management**: Medication search, templates, discontinuation workflow, refill tracking
- **Visit Templates**: Reusable clinical note templates for common visit types
- **Visit Version History**: Full audit trail with restore capability for visit modifications
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

- **[API Documentation](docs/API.md)** - Complete REST API reference (64 endpoints documented)
- **[Product Requirements Document (PRD)](docs/PRD.md)** - Comprehensive requirements and specifications
- **[Planning Document](docs/PLANNING.md)** - Architecture and development setup
- **[Task Tracking](docs/TASKS.md)** - Milestone-based task breakdown
- **[Claude Development Guide](docs/CLAUDE.md)** - AI-assisted development guidelines
- **[Security Guidelines](docs/SECURITY.md)** - Security best practices and compliance
- **[Session History](docs/SESSIONS.md)** - Development session logs and decisions

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
                    │     (64 REST API Endpoints)         │
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
│   │   ├── handlers/     # HTTP request handlers (11 modules)
│   │   ├── models/       # Data models and DTOs
│   │   ├── services/     # Business logic layer
│   │   ├── routes/       # API route definitions
│   │   └── utils/        # Utilities, encryption, errors
│   ├── migrations/       # SQLx database migrations
│   └── tests/            # Integration tests
├── frontend/             # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── features/     # Feature-specific modules
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API service layer
│   │   └── lib/          # Utilities and helpers
│   └── e2e/              # Playwright E2E tests
├── infrastructure/       # Docker, Nginx, monitoring configs
├── scripts/              # Utility scripts (setup, backup, deploy)
├── docs/                 # Documentation
└── docker-compose.yml
```

## API Overview

DocPat exposes 64 REST API endpoints organized by resource:

| Resource | Endpoints | Description |
|----------|-----------|-------------|
| Health | 1 | System health check |
| Authentication | 5 | Login, logout, refresh, MFA setup/verify |
| Users | 8 | User CRUD, password management, unlock |
| Patients | 10 | Patient CRUD, search, statistics |
| Appointments | 11 | Scheduling, availability, conflicts, statistics |
| Visits | 12 | Clinical documentation, sign/lock workflow |
| Diagnoses | 5 | ICD-10 codes, patient/visit diagnoses |
| Prescriptions | 6 | Medication management, discontinuation |
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

DocPat maintains comprehensive test coverage:

### Current Test Status

| Category | Tests | Status |
|----------|-------|--------|
| Backend Integration | 85+ | Passing |
| Frontend Component | 222+ | Passing |
| E2E (Playwright) | 19 | Passing |
| **Total** | **306+** | **All Passing** |

### Running Tests

```bash
# Backend tests
cd backend
cargo test                              # Unit tests
./run-integration-tests.sh              # Integration tests

# Frontend tests
cd frontend
npm test                                # Component tests
npm run test:e2e                        # E2E tests with Playwright

# Code coverage
cd backend && cargo tarpaulin --out Html
cd frontend && npm run test:coverage
```

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
- Comprehensive integration testing

### Phase 4: Document Generation (Milestone 11) - IN PROGRESS
- PDF generation for medical certificates
- Referral letters
- Visit summaries
- Lab request forms
- Custom document templates

### Phase 5: Reporting & Analytics (Milestones 12-13) - PLANNED
- Appointment utilization reports
- Patient demographics analysis
- Provider productivity metrics
- Dashboard visualizations

### Phase 6: Administration (Milestones 14-16) - PLANNED
- System settings management
- Backup and restore functionality
- User activity monitoring
- Email/SMS notification configuration

### Future Enhancements (Milestones 17-21)
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
**Last Updated**: November 2025

**Built with Rust, React, and a commitment to data sovereignty**
