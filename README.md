# DocPat - Medical Practice Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.90+-orange.svg)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19.1-blue.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)

> A secure, self-hosted Medical Practice Management System designed for individual practitioners prioritizing simplicity, data sovereignty, and military-grade security.

## 🎯 Overview

DocPat (Documentation for Patients) is a comprehensive medical practice management system built specifically for solo practitioners, initially designed for a geriatrician/acupuncturist. The system handles patient management, appointment scheduling, clinical documentation, and administrative tasks while maintaining complete data ownership through self-hosted deployment.

### Core Philosophy

- **Simplicity First**: Designed for one doctor, not enterprise complexity
- **Security by Default**: All medical data encrypted at rest and in transit
- **User-Centric**: Intuitive workflows that reduce administrative burden
- **Self-Hosted**: Complete data sovereignty, no vendor lock-in
- **Compliance-Ready**: Built-in HIPAA and regulatory compliance

### Key Features

- 🔐 **Military-Grade Security**: AES-256 encryption, MFA, comprehensive audit trails
- 🗓️ **Smart Scheduling**: Conflict detection, recurring appointments, automated reminders
- 📋 **Clinical Documentation**: SOAP notes, vital signs, ICD-10 diagnoses, digital signatures
- 👥 **Patient Management**: Fast search (<2s), duplicate detection, complete medical history
- 📊 **Analytics & Reporting**: Appointment utilization, patient statistics, productivity metrics
- 🌍 **Internationalization**: Full Italian/English support with runtime switching
- 🎨 **Theme Support**: Light/Dark themes with user preferences
- 📄 **Document Generation**: Medical certificates, referral letters, visit summaries (PDF)

## 🏗️ Technology Stack

### Frontend
- **React 19.1** with TypeScript 5.9
- **Vite** - Lightning-fast build tool
- **Tailwind CSS 4.1** - Utility-first styling
- **Shadcn UI 3.3.1** - Beautiful component library
- **React Query** - Server state management
- **React Hook Form + Zod** - Forms and validation
- **i18next** - Internationalization

### Backend
- **Rust 1.90** - Memory-safe systems programming
- **Axum 0.8.6** - Modern web framework
- **SQLx** - Compile-time verified SQL
- **Tokio** - Async runtime
- **Argon2** - Secure password hashing
- **JWT** - Token-based authentication

### Database & Infrastructure
- **PostgreSQL 17** - Primary database with encryption
- **Redis 8.2** - Optional session caching
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy with SSL/TLS
- **Let's Encrypt** - Free SSL certificates

## 🚀 Quick Start

### Prerequisites

- Rust 1.90+ ([Install Rust](https://www.rust-lang.org/tools/install))
- Node.js 20+ LTS ([Install Node](https://nodejs.org/))
- PostgreSQL 17
- Redis 8.2
- Docker and Docker Compose
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

```bash
# Build and run all services
docker-compose -f docker-compose.dev.yml up --build

# Run in detached mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📖 Documentation

- **[Product Requirements Document (PRD)](docs/PRD.md)** - Comprehensive requirements and specifications (Private)
- **[Planning Document](docs/PLANNING.md)** - Architecture and development setup (Private)
- **[Task Tracking](docs/TASKS.md)** - Milestone-based task breakdown (Private)
- **[Claude Development Guide](docs/CLAUDE.md)** - AI-assisted development guidelines (Private)
- **[API Documentation](docs/API.md)** - REST API endpoints and examples
- **[Security Guidelines](docs/SECURITY.md)** - Security best practices and compliance

## 🏛️ Architecture

```
┌─────────────────────────────────────┐
│         Nginx (Reverse Proxy)       │
│    SSL/TLS, Rate Limiting, WAF      │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│      Rust/Axum Application          │
│     (Multiple instances possible)    │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│         PostgreSQL 17                │
│    (With read replicas optional)     │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│      Redis (Optional Cache)          │
└─────────────────────────────────────┘
```

### Project Structure

```
docpat/
├── backend/          # Rust backend application
├── frontend/         # React frontend application
├── infrastructure/   # Docker, Nginx, monitoring configs
├── scripts/          # Utility scripts (setup, backup, deploy)
├── docs/             # Documentation (private)
└── docker-compose.yml
```

## 🔒 Security

Security is non-negotiable in healthcare applications. DocPat implements:

- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Authentication**: JWT with refresh tokens, MFA (TOTP)
- **Authorization**: Role-Based Access Control (RBAC) with Casbin
- **Audit Logging**: Immutable audit trails for all medical data access
- **Input Validation**: Comprehensive validation at API and database levels
- **SQL Injection Prevention**: SQLx compile-time verified queries
- **XSS Protection**: React escaping + Content Security Policy headers
- **Rate Limiting**: 100 req/min default, 300 for authenticated users

**IMPORTANT**: All medical data is encrypted at rest and in transit. Zero data breach tolerance.

## 🎯 Performance Targets

| Metric | Target |
|--------|--------|
| System Uptime | 99.9% |
| Page Load Time | <2 seconds |
| API Response Time | <200ms (p95) |
| Database Query Time | <100ms (p95) |
| Appointment Scheduling | <1 minute |
| Visit Documentation | <5 minutes during visit |

## 🧪 Testing

```bash
# Backend tests
cd backend
cargo test
cargo test --test integration_tests

# Frontend tests
cd frontend
npm test
npm run test:e2e

# Code coverage
cd backend && cargo tarpaulin --out Html
cd frontend && npm run test:coverage
```

## 📝 Development Workflow

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

Example: `feat(auth): add MFA support with TOTP`

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

## 🗺️ Roadmap

### Phase 1: Foundation (Weeks 1-6) ✅ In Progress
- ✅ Project structure and infrastructure setup
- 🔄 Database schema and migrations
- ⏳ Authentication system with MFA
- ⏳ Core data models

### Phase 2: MVP (Weeks 7-14)
- ⏳ Patient management
- ⏳ Appointment scheduling
- ⏳ Clinical documentation (SOAP notes)
- ⏳ Prescription management

### Phase 3: Enhancement (Weeks 15-20)
- ⏳ Document generation (PDF reports)
- ⏳ Analytics and reporting
- ⏳ Admin features and settings
- ⏳ Automated notifications (email/SMS)

### Future Enhancements
- Patient portal (self-service)
- Mobile app (Android)
- HL7/FHIR integration
- Telemedicine integration

## 🤝 Contributing

This is a private project currently under active development. Contributions are not being accepted at this time.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues, questions, or support:
- Check the [documentation](docs/)
- Review [PLANNING.md](docs/PLANNING.md) for architecture details
- Consult [TASKS.md](docs/TASKS.md) for known issues

## ⚠️ Compliance Notice

This system is designed to help healthcare practitioners maintain HIPAA compliance. However, achieving full compliance requires proper configuration, deployment, and operational procedures. Consult with compliance experts for your specific use case.

## 🙏 Acknowledgments

- Built with modern, open-source technologies
- Designed for healthcare practitioners who value simplicity and security
- Inspired by the need for affordable, self-hosted practice management

---

**Version**: 1.0.0-alpha
**Status**: Active Development
**Last Updated**: October 2025

**⚡ Built with Rust, React, and a commitment to data sovereignty**
