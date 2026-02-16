# DocPat - Medical Practice Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.90+-orange.svg)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17%2B-blue.svg)](https://www.postgresql.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-4,700%2B%20passing-brightgreen.svg)]()

A secure, self-hosted Medical Practice Management System designed for individual practitioners. DocPat prioritizes simplicity, complete data sovereignty, and military-grade security for handling sensitive medical information.

### At a Glance

| | |
| --- | --- |
| **Backend** | Rust 1.90+ / Axum 0.8 with 157 REST API endpoints |
| **Frontend** | React 18.3 / TypeScript with 289 components |
| **Database** | PostgreSQL 17+ with Row-Level Security |
| **Security** | AES-256-GCM encryption, JWT + MFA, RBAC, audit logging |
| **Tests** | 4,700+ tests (384 integration, ~542 unit, 3,566 component, 236 E2E) |
| **Deployment** | Docker + Nginx with TLS 1.2/1.3 and HSTS |

### Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [API Endpoints Summary](#api-endpoints-summary)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

---

## Overview

DocPat (Documentation for Patients) is a comprehensive medical practice management system built specifically for solo practitioners. Initially designed for a geriatrician/acupuncturist, the system handles patient management, appointment scheduling, clinical documentation, prescriptions, and administrative tasks while maintaining complete data ownership through self-hosted deployment.

### Core Philosophy

| Principle               | Description                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| **Simplicity First**    | Designed for one doctor, not enterprise complexity                        |
| **Security by Default** | All medical data encrypted at rest (AES-256-GCM) and in transit (TLS 1.2/1.3) |
| **User-Centric**        | Intuitive workflows that reduce administrative burden                     |
| **Self-Hosted**         | Complete data sovereignty, no vendor lock-in, offline-capable             |
| **Compliance-Ready**    | Built with HIPAA compliance principles in mind                            |

---

## Key Features

DocPat provides a complete suite of tools for managing a medical practice:

### Dashboard

Real-time overview of your practice with statistics cards, recent activity, and quick actions.

![dashboard](docs/screenshots/dashboard.png)

### Patient Management

Comprehensive patient records with fast search, medical history tracking, allergies, chronic conditions, and emergency contacts.

![patients](docs/screenshots/patients.png)

- Fast patient search (<2 seconds) by name, fiscal code, phone, or email
- Complete demographics with Italian fiscal code support
- Medical history with allergies and chronic conditions tracking
- Duplicate detection and merge suggestions
- Patient statistics and visit history

### Appointment Scheduling

Full-featured calendar with conflict detection, recurring appointments, and availability management.

![appointments](docs/screenshots/appointments.png)

- Day, week, and month calendar views
- Database-level conflict detection (no double-booking)
- Recurring appointment patterns (daily, weekly, monthly)
- Working hours and holiday configuration
- Appointment status workflow (Scheduled → Confirmed → In Progress → Completed)
- No-show and cancellation tracking with statistics

### Clinical Documentation

SOAP notes with vital signs, ICD-10 diagnoses, digital signatures, and version history.

![visits](docs/screenshots/visits.png)

![visits_details](docs/screenshots/visits1.png)

![visits_new](docs/screenshots/visits2.png)

Industry-standard SOAP format (Subjective, Objective, Assessment, Plan)

- Vital signs recording with validation (BP, HR, temp, weight, height, SpO2, BMI calculation)
- ICD-10 diagnosis search with autocomplete
- Digital signatures with timestamp
- Visit templates for common clinical scenarios
- Complete version history with restore capability
- Sign and lock workflow for compliance

### Prescription Management

Full medication management with drug interaction checking powered by DDInter 2.0.

![prescriptions](docs/screenshots/prescriptions.png)

![prescriptions_details](docs/screenshots/prescriptions1.png)

![prescriptions_new](docs/screenshots/prescriptions2.png)

- AIFA medications database (2,600+ Italian medications with ATC codes)
- **Real-time drug interaction checking** (170,449 interactions from DDInter 2.0)
- Severity-based alerts (major, moderate, minor)
- Fuzzy medication search with Italian/English name matching
- Prescription templates for frequently used medications
- Status workflow (Active, On Hold, Discontinued, Completed)
- Refill tracking and prescription renewal

### Document Generation

Professional medical documents with template system and PDF generation.

![documents](docs/screenshots/documents.png)

![documents_new](docs/screenshots/documents1.png)

![documents_templates](docs/screenshots/documents2.png)

![documents_templates_new](docs/screenshots/documents3.png)

- Medical certificates
- Referral letters
- Visit summaries
- Lab request forms
- Custom templates with variable substitution
- PDF generation and email delivery

### Reports & Analytics

Practice performance dashboards with interactive charts and multi-format export.

![reports](docs/screenshots/reports.png)

![reports_diagnoses](docs/screenshots/reports1.png)

- Appointment utilization and trends
- Patient demographics analysis
- Provider productivity metrics
- Diagnosis frequency reports
- Export to PDF, Excel, CSV, JSON

### Email Notifications

Automated appointment reminders and document delivery with SMTP integration.

![notifications](docs/screenshots/notifications.png)

- Appointment confirmation emails
- Configurable reminder scheduler
- Patient notification preferences
- Delivery tracking and retry mechanism
- Gmail and custom SMTP support

### Administration

Complete system configuration with user management, audit logs, and health monitoring.

![users](docs/screenshots/users.png)

![users_new](docs/screenshots/users1.png)

![audit_logs](docs/screenshots/auditlogs.png)

![system_health](docs/screenshots/systemhealth.png)

- User management with RBAC (Admin/Doctor roles)
- System settings (practice, appointments, security, localization)
- Working hours and holiday configuration
- Comprehensive audit logging with export
- Real-time system health dashboard

### Settings

Practice, appointments, localization, security, working hours, holidays, email, scheduler, backup are all available configuration settings.

![settings_practice](docs/screenshots/settinspractice.png)

![settings_security](docs/screenshots/settingssecurity.png)

![settings_working_hours](docs/screenshots/settingsworkinghours.png)

![settings_holidays](docs/screenshots/settingsholidays.png)

![settings_scheduler](docs/screenshots/settingsscheduler.png)

- Complete UI translation (2 locales)
- Runtime language switching
- Light, dark, and system theme modes
- User preference persistence

---

## Tech Stack

### Frontend

| Technology            | Version | Purpose                  |
| --------------------- | ------- | ------------------------ |
| React                 | 18.3.1  | UI Framework             |
| TypeScript            | 5.7.3   | Type Safety              |
| Vite                  | 6.0+    | Build Tool               |
| Tailwind CSS          | 3.4.17  | Styling                  |
| Shadcn/ui + Radix     | Latest  | Component Library        |
| TanStack Query        | 5.90+   | Server State Management  |
| React Hook Form + Zod | 7.54+   | Forms & Validation       |
| React Router          | 6.x     | Client-side Routing      |
| i18next               | 25.6.0  | Internationalization     |
| Chart.js              | 4.4.8   | Analytics Visualizations |

### Backend

| Technology   | Version | Purpose                       |
| ------------ | ------- | ----------------------------- |
| Rust         | 1.90+   | Systems Programming           |
| Axum         | 0.8.6   | Web Framework                 |
| SQLx         | 0.8     | Compile-time Verified SQL     |
| Tokio        | 1.47    | Async Runtime                 |
| Argon2       | 0.5     | Password Hashing (OWASP)      |
| jsonwebtoken | 9.3     | JWT Authentication            |
| totp-rs      | 5.7     | MFA (TOTP)                    |
| aes-gcm      | 0.10    | AES-256 Encryption            |
| Casbin       | 2.14    | RBAC Authorization (optional) |
| Tower        | 0.5.2   | Middleware Ecosystem          |
| lettre       | 0.11    | Email (SMTP)                  |

### Database & Infrastructure

| Technology    | Version | Purpose                       |
| ------------- | ------- | ----------------------------- |
| PostgreSQL    | 17+     | Primary Database with RLS     |
| Docker        | Latest  | Containerization              |
| Nginx         | Latest  | Reverse Proxy, SSL/TLS        |
| Let's Encrypt | -       | SSL Certificates (production) |

---

## Prerequisites

Before setting up DocPat, ensure you have the following installed:

| Requirement | Version | Installation                                                 |
| ----------- | ------- | ------------------------------------------------------------ |
| Rust        | 1.90+   | [rustup.rs](https://rustup.rs/)                              |
| Node.js     | 20+ LTS | [nodejs.org](https://nodejs.org/)                            |
| PostgreSQL  | 17+     | [postgresql.org](https://www.postgresql.org/download/)       |
| Docker      | Latest  | Optional - [docker.com](https://www.docker.com/get-started/) |
| Git         | Latest  | [git-scm.com](https://git-scm.com/)                         |

---

## Getting Started

### Option 1: Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/h0pes/docpat.git
cd docpat
```

#### 2. Database Setup

```bash
# Create PostgreSQL databases
psql -U postgres
CREATE DATABASE mpms_dev;
CREATE DATABASE mpms_test;
CREATE USER mpms_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE mpms_dev TO mpms_user;
GRANT ALL PRIVILEGES ON DATABASE mpms_test TO mpms_user;
\q

# Enable required extensions (as superuser)
psql -U postgres -d mpms_dev -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
psql -U postgres -d mpms_dev -c "CREATE EXTENSION IF NOT EXISTS btree_gist;"
```

#### 3. Backend Setup

```bash
cd backend

# Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials and secrets

# Install SQLx CLI
cargo install sqlx-cli --no-default-features --features postgres

# Run migrations
sqlx database create
sqlx migrate run

# Import medications database (optional but recommended)
cargo run --bin import-medications

# Build the backend
cargo build --features "rbac,report-export,pdf-export"
```

#### 4. Frontend Setup

```bash
cd ../frontend

# Copy and configure environment
cp .env.example .env
# Edit .env with your API URL

# Install dependencies
npm install
```

#### 5. Start Development Servers

```bash
# Terminal 1 - Backend (from backend/ directory)
RUST_LOG=info,tower_http=debug,docpat_backend=debug cargo run --bin docpat-backend --features "rbac,report-export,pdf-export"

# Terminal 2 - Frontend (from frontend/ directory)
npm run dev
```

Access the application at `https://localhost:5173`

### Option 2: Docker Development Environment

```bash
# Create environment file
cp .env.example .env
# Edit .env with your configuration

# Build and run all services
docker compose -f docker-compose.dev.yml up --build

# Run in detached mode
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop services
docker compose -f docker-compose.dev.yml down

# Stop and remove volumes (clean slate)
docker compose -f docker-compose.dev.yml down -v
```

### Option 3: Docker Production Deployment

For production deployment with Nginx, network isolation, and TLS, see the [Deployment](#deployment) section below or the full [Deployment Guide](docs/DEPLOYMENT.md).

### Database Imports

#### Medications Database (AIFA)

```bash
cd backend
cargo run --bin import-medications
# Imports ~2,600 Class A medications with ATC codes
```

#### Drug Interactions Database (DDInter 2.0)

```bash
cd backend

# Download DDInter 2.0 data (manual step)
# Visit: https://ddinter2.scbdd.com/download/
# Place CSV files in backend/data/ddinter/

# Import to database
cargo run --bin import-drug-interactions
# Imports 170,449 drug-drug interactions
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client (Browser)                              │
│                  React 18 + TypeScript                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Nginx (Reverse Proxy)                            │
│          SSL/TLS 1.2/1.3, Rate Limiting, WAF                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Rust/Axum Application                           │
│           157 REST API Endpoints, RBAC, Middleware               │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  PostgreSQL 17+  │ │  In-Memory Cache │ │  File Storage    │
│  RLS, Encryption │ │  (Sessions/Data) │ │   (Documents)    │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### Project Structure

```
docpat/
├── backend/                    # Rust backend application
│   ├── src/
│   │   ├── bin/               # Binary entry points (server, importers)
│   │   ├── handlers/          # HTTP request handlers (22 modules)
│   │   ├── models/            # Data models and DTOs
│   │   ├── services/          # Business logic layer
│   │   ├── routes/            # API route definitions
│   │   ├── middleware/        # Auth, logging, rate limiting
│   │   ├── db/                # Database connection and helpers
│   │   ├── config/            # Configuration management
│   │   └── utils/             # Encryption, errors, validation
│   ├── migrations/            # SQLx database migrations (40+)
│   ├── tests/                 # Integration tests (384 tests)
│   ├── casbin/                # RBAC policy definitions
│   ├── data/                  # Data files (DDInter, AIFA)
│   └── Cargo.toml
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable UI components (289)
│   │   ├── pages/             # Page-level containers (14 modules)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API service layer
│   │   ├── store/             # State management (React Context)
│   │   ├── i18n/              # Translations (en, it)
│   │   ├── lib/               # Utilities and helpers
│   │   └── types/             # TypeScript type definitions
│   ├── tests/e2e/             # Playwright E2E tests (236 tests)
│   └── package.json
├── infrastructure/             # Docker, Nginx configs
├── scripts/                    # Utility scripts
├── docs/                       # Documentation
│   ├── API.md                 # REST API reference
│   ├── PLANNING.md            # Architecture decisions
│   ├── TASKS.md               # Development roadmap
│   ├── SECURITY.md            # Security guidelines
│   └── sessions/              # Development session logs
├── docker-compose.yml          # Production compose
├── docker-compose.dev.yml      # Development compose
└── README.md
```

### API Endpoints Summary

DocPat exposes 157 REST API endpoints organized by resource:

| Resource               | Endpoints | Description                                          |
| ---------------------- | --------- | ---------------------------------------------------- |
| Authentication         | 8         | Login, logout, refresh, MFA setup/verify/disable     |
| Users                  | 10        | User CRUD, password reset, account unlock, MFA reset |
| Patients               | 12        | Patient CRUD, search, statistics, reactivate         |
| Appointments           | 14        | Scheduling, availability, conflicts, statistics      |
| Visits                 | 14        | Clinical documentation, sign/lock workflow           |
| Visit Templates        | 5         | Reusable clinical note templates                     |
| Visit Versions         | 4         | Version history and restoration                      |
| Diagnoses              | 8         | ICD-10 codes, patient/visit diagnoses                |
| Prescriptions          | 14        | Medication management, status transitions            |
| Prescription Templates | 5         | Reusable prescription templates                      |
| Drug Interactions      | 6         | Interaction checking, patient interactions           |
| Documents              | 10        | Template management, PDF generation                  |
| Notifications          | 10        | Email notifications, scheduler, preferences          |
| Reports                | 8         | Analytics and statistics                             |
| Settings               | 6         | System configuration                                 |
| Working Hours          | 6         | Schedule management                                  |
| Holidays               | 5         | Holiday configuration                                |
| Audit Logs             | 4         | Activity monitoring                                  |
| System Health          | 3         | Health checks and monitoring                         |
| Files                  | 2         | File uploads                                         |

See [API Documentation](docs/API.md) for complete endpoint reference with request/response examples.

---

## Environment Variables

### Required Variables

| Variable             | Description                       | Example                                          |
| -------------------- | --------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`       | PostgreSQL connection string      | `postgresql://user:pass@localhost:5432/mpms_dev` |
| `JWT_SECRET`         | JWT signing secret (64 chars)     | Generate with `openssl rand -base64 64`          |
| `JWT_REFRESH_SECRET` | Refresh token secret (64 chars)   | Generate with `openssl rand -base64 64`          |
| `ENCRYPTION_KEY`     | AES-256 encryption key (32 bytes) | Generate with `openssl rand -base64 32`          |

### Optional Variables

| Variable               | Default              | Description                  |
| ---------------------- | -------------------- | ---------------------------- |
| `SERVER_PORT`          | `8000`               | Backend server port          |
| `ENVIRONMENT`          | `development`        | Environment mode             |
| `SMTP_ENABLED`         | `false`              | Enable email notifications   |
| `SMTP_HOST`            | -                    | SMTP server hostname         |
| `SMTP_PORT`            | `587`                | SMTP server port             |
| `SMTP_USERNAME`        | -                    | SMTP authentication username |
| `SMTP_PASSWORD`        | -                    | SMTP authentication password |
| `TLS_ENABLED`          | `false`              | Enable TLS for backend       |
| `CORS_ALLOWED_ORIGINS` | `https://localhost`  | Comma-separated allowed origins |
| `RUST_LOG`             | `info`               | Logging level                |

See [backend/.env.example](backend/.env.example) for the complete list with descriptions.

---

## Available Scripts

### Backend Scripts

| Command                                    | Description                 |
| ------------------------------------------ | --------------------------- |
| `cargo build`                              | Build the application       |
| `cargo build --release`                    | Build optimized release     |
| `cargo run --bin docpat-backend`           | Run the server              |
| `cargo run --bin import-medications`       | Import AIFA medications     |
| `cargo run --bin import-drug-interactions` | Import DDInter interactions |
| `cargo test --lib`                         | Run unit tests              |
| `./run-integration-tests.sh`               | Run all integration tests   |
| `cargo clippy`                             | Run linter                  |
| `cargo fmt`                                | Format code                 |
| `cargo audit`                              | Security audit              |

### Frontend Scripts

| Command                 | Description                |
| ----------------------- | -------------------------- |
| `npm run dev`           | Start development server   |
| `npm run build`         | Build for production       |
| `npm run preview`       | Preview production build   |
| `npm test`              | Run unit tests (Vitest)    |
| `npm run test:ui`       | Run tests with UI          |
| `npm run test:coverage` | Run tests with coverage    |
| `npm run test:e2e`      | Run E2E tests (Playwright) |
| `npm run lint`          | Run ESLint                 |
| `npm run format`        | Format with Prettier       |

### Database Scripts

| Command                | Description             |
| ---------------------- | ----------------------- |
| `sqlx database create` | Create database         |
| `sqlx migrate run`     | Run migrations          |
| `sqlx migrate revert`  | Revert last migration   |
| `sqlx prepare`         | Generate query metadata |

---

## Testing

DocPat maintains comprehensive test coverage with a two-tier testing strategy.

### Test Summary

| Category            | Tests      | Status          |
| ------------------- | ---------- | --------------- |
| Backend Integration | 384        | ✅ Passing      |
| Backend Unit        | ~542       | ✅ Passing      |
| Frontend Component  | 3,566      | ✅ Passing      |
| Frontend E2E        | 236        | ✅ Passing      |
| **Total**           | **~4,728** | **All Passing** |

### Running Tests

```bash
# Backend integration tests (recommended)
cd backend
./run-integration-tests.sh

# Backend unit tests
cargo test --lib --features "rbac,report-export,pdf-export"

# Specific backend test suite
cargo test --test patient_integration_tests --features "rbac,report-export,pdf-export" -- --test-threads=1

# Frontend unit/component tests
cd frontend
npm test

# Frontend E2E tests
npm run test:e2e

# Frontend test coverage
npm run test:coverage
```

### Test Documentation

- [Backend Testing Strategy](backend/TESTING.md)
- [Backend Integration Tests](backend/tests/README.md)
- [Frontend Testing Strategy](frontend/TESTING.md)
- [Frontend E2E Tests](frontend/tests/README.md)

---

## Deployment

DocPat provides **three deployment options**. Choose the one that fits your setup:

| Scenario | Best For | Requirements | Time |
| --- | --- | --- | --- |
| **[A: Docker](#scenario-a-docker)** | Synology NAS, Portainer, any Docker host | Docker + Compose | 30-60 min |
| **[B: Artifacts](#scenario-b-artifacts)** | Bare metal server, VPS, no containers | Rust, Node.js, PostgreSQL | 1-2 hours |
| **[C: Bundle](#scenario-c-bundle-recommended)** | Easy distribution, minimal setup | Docker + Compose only | 10-15 min |

> **Full step-by-step instructions**: See [Deployment Guide](docs/DEPLOYMENT.md) for complete walkthroughs of each scenario.

### Production Architecture

```
                          Internet
                             │
                             ▼
                ┌────────────────────────┐
                │   Nginx Reverse Proxy  │ ← edge_network (external)
                │   Ports 80, 443        │
                └───────────┬────────────┘
                            │
              ┌─────────────┼─────────────┐
              │      frontend_network     │
              ▼         (internal)        ▼
    ┌─────────────────┐         ┌─────────────────┐
    │ Frontend (React)│         │ Backend (Rust)  │
    │  Port 8080      │         │  Port 8000      │
    └─────────────────┘         └────────┬────────┘
                                         │
                                         │ backend_network
                                         │ (internal)
                              ┌──────────┴──────────┐
                              ▼                     ▼
                  ┌─────────────────┐    ┌──────────────┐
                  │  PostgreSQL 18  │    │  File Storage │
                  │  Port 5432      │    │  (uploads)    │
                  └─────────────────┘    └──────────────┘
```

**Network isolation** ensures containers cannot reach the internet (exfiltration protection). Only Nginx exposes ports to the host.

### Scenario A: Docker

```bash
# Clone and configure
git clone https://github.com/h0pes/docpat.git && cd docpat
cp .env.example .env
# Edit .env with generated secrets (see DEPLOYMENT.md A.4)

# Create data directories
mkdir -p ./data/postgres ./backups/postgres
sudo chown -R 999:999 ./data/postgres ./backups/postgres

# Build and start with Nginx (REQUIRED for production)
docker compose --profile with-nginx build
docker compose --profile with-nginx up -d

# Run database migrations
docker cp ./backend/migrations docpat-postgres:/tmp/migrations
docker compose exec postgres sh -c 'for f in /tmp/migrations/*.sql; do psql -U mpms_user -d mpms_prod -f "$f"; done'

# Verify all services are healthy
docker compose --profile with-nginx ps
curl -k https://localhost/health
```

> **Important**: Always use `--profile with-nginx` for production. Without it, ports 80/443 are not exposed and the application is unreachable from outside Docker.

### Scenario B: Artifacts

Install Rust 1.90+, Node.js 22+, and PostgreSQL on the target server. Build from source and run as systemd services. See [Deployment Guide - Scenario B](docs/DEPLOYMENT.md#scenario-b-artifacts-deployment-no-docker) for step-by-step instructions including systemd service files, Nginx configuration, and admin user creation.

### Scenario C: Bundle (Recommended)

The easiest option. Build once, distribute anywhere:

```bash
# On your build machine: create the bundle
docker compose --profile with-nginx build
docker pull postgres:18-alpine
./scripts/create-bundle.sh
# Output: docpat-bundle-YYYYMMDD.tar.gz (~500MB-1GB)

# On the target machine: extract and install
scp docpat-bundle-*.tar.gz user@server:/opt/
ssh user@server
cd /opt && tar -xzf docpat-bundle-*.tar.gz && cd docpat-bundle-*
./install.sh    # Automated: loads images, generates secrets, starts services
```

The installer handles everything: Docker image loading, data directories, secret generation, service startup, migrations, and admin user creation.

### Production Checklist

Before deploying to production:

- [ ] Set `ENVIRONMENT=production` and `DEV_MODE=false`
- [ ] Generate strong secrets: `openssl rand -base64 64` (JWT), `openssl rand -base64 32` (encryption)
- [ ] Configure `CORS_ALLOWED_ORIGINS` for your domain
- [ ] Set `RUST_LOG=info` (or `warn` for quieter logs)
- [ ] Enable TLS with valid certificates (Let's Encrypt via certbot profile, or self-signed)
- [ ] Configure automated backups (`scripts/backup.sh`)
- [ ] Run security scan: `./scripts/security-scan.sh`
- [ ] Review RBAC policies in `backend/casbin/`
- [ ] Verify rate limiting (100 req/min anonymous, 300 authenticated, 10 auth endpoints)

### SSL/TLS Configuration

DocPat supports TLS 1.2/1.3 with HSTS. Two approaches:

| Approach | How It Works | Best For |
| --- | --- | --- |
| **Nginx Termination** | Nginx handles SSL, backend runs HTTP | Production (recommended) |
| **Backend Native TLS** | Backend uses rustls directly | Simple deployments, no Nginx |

For Docker with Nginx, self-signed certificates are generated automatically during build. For real certificates, use the certbot profile:

```bash
docker compose --profile with-certbot up -d
docker compose exec certbot certbot certonly --webroot \
  -w /var/www/certbot -d your-domain.com --email your@email.com --agree-tos
```

See [Deployment Guide - TLS/HTTPS](docs/DEPLOYMENT.md#tlshttps-configuration) for full configuration details.

### Maintenance

```bash
# Backup database
docker compose exec postgres pg_dump -U mpms_user mpms_prod | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore database
gunzip -c backup.sql.gz | docker compose exec -T postgres psql -U mpms_user -d mpms_prod

# Update application
git pull
docker compose --profile with-nginx build
docker compose --profile with-nginx up -d

# Or use the automated deployment script
./scripts/deploy.sh --environment prod
```

### Utility Scripts

| Script | Description |
| --- | --- |
| `scripts/install.sh` | Automated installer for bundle deployments |
| `scripts/deploy.sh` | Production deployment with rollback support |
| `scripts/create-bundle.sh` | Create distribution bundle with Docker images |
| `scripts/backup.sh` | Automated database backup |
| `scripts/restore.sh` | Database restore from backup |
| `scripts/security-scan.sh` | Trivy vulnerability scanning for all images |
| `scripts/dockerfile-lint.sh` | Hadolint Dockerfile quality checks |
| `scripts/generate-certs.sh` | TLS certificate generation (mkcert or OpenSSL) |
| `scripts/setup-dev.sh` | Development environment setup |

---

## Documentation

| Document                                                   | Description                                       |
| ---------------------------------------------------------- | ------------------------------------------------- |
| [Deployment Guide](docs/DEPLOYMENT.md)                     | Complete deployment guide (Docker, Artifacts, Bundle) |
| [API Reference](docs/API.md)                               | Complete REST API documentation (157 endpoints)   |
| [OpenAPI Spec](docs/openapi.yaml)                          | OpenAPI 3.1.0 specification                       |
| [Architecture](docs/ARCHITECTURE.md)                       | System architecture and design decisions          |
| [Security](docs/SECURITY.md)                               | Security guidelines and compliance                |
| [Docker Security Audit](docs/DOCKER_SECURITY_AUDIT.md)     | Container security audit and hardening            |
| [User Manual (EN)](frontend/public/docs/user-manual-en.md) | End-user documentation                            |
| [User Manual (IT)](frontend/public/docs/user-manual-it.md) | Documentazione utente                             |

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

```
Error: unable to connect to database
```

**Solution**: Verify PostgreSQL is running and credentials in `.env` are correct:

```bash
psql -U mpms_user -d mpms_dev -h localhost
```

#### Migration Errors

```
Error: migration failed
```

**Solution**: Ensure the database user has proper permissions:

```sql
GRANT ALL PRIVILEGES ON DATABASE mpms_dev TO mpms_user;
GRANT ALL ON SCHEMA public TO mpms_user;
```

#### Frontend Can't Connect to API

**Solution**: Check CORS configuration in backend `.env`:

```
CORS_ALLOWED_ORIGINS=https://localhost:5173
```

#### MFA Code Not Working

**Solution**: Ensure device time is synchronized. TOTP codes are time-sensitive (30-second window).

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Detailed health check (requires authentication)
curl http://localhost:8000/api/v1/system/health/detailed
```

---

## Contributing

This is a private project currently under active development. Contributions are not being accepted at this time.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with modern, open-source technologies
- Drug interaction data from [DDInter 2.0](https://ddinter2.scbdd.com/) - Xiangya School of Pharmaceutical Sciences
- Medications database from [AIFA Open Data](https://www.aifa.gov.it/)
- Designed for healthcare practitioners who value simplicity and security

---

## Security

Security is non-negotiable in healthcare applications. DocPat implements:

- **Encryption**: AES-256-GCM at rest, TLS 1.2/1.3 in transit
- **Authentication**: JWT with refresh tokens, TOTP-based MFA
- **Authorization**: Role-Based Access Control (RBAC) with Casbin
- **Data Protection**: Row-Level Security (RLS), comprehensive audit logging
- **Input Validation**: SQLx compile-time verified queries, Zod schema validation
- **Rate Limiting**: 100 req/min (anonymous), 300 req/min (authenticated)

For security concerns, please review [SECURITY.md](docs/SECURITY.md).

---

**Version**: 1.0.0
**Status**: MVP Complete - Active Development
**Last Updated**: February 2026

_Built with Rust, React, and a commitment to data sovereignty_
