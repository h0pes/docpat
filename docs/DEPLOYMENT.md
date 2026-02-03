# DocPat Deployment Guide

**Version:** 2.1.0
**Last Updated:** 2026-02-02

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Files Explained](#environment-files-explained)
3. [Required vs Optional Variables](#required-vs-optional-variables)
4. [Understanding Development vs Production](#understanding-development-vs-production)
5. [SCENARIO A: Docker Deployment](#scenario-a-docker-deployment-synologyportainerlocal-server)
6. [SCENARIO B: Artifacts Deployment](#scenario-b-artifacts-deployment-no-docker)
7. [TLS/HTTPS Configuration](#tlshttps-configuration)
8. [Post-Deployment Tasks](#post-deployment-tasks)
9. [Maintenance Procedures](#maintenance-procedures)
10. [Troubleshooting](#troubleshooting)
11. [Appendix](#appendix)

---

## Overview

This guide provides **two independent deployment procedures**. Choose ONE:

| Scenario | Use When | What You Need |
|----------|----------|---------------|
| **A: Docker** | Synology NAS with Portainer, any Docker host | Docker, Docker Compose |
| **B: Artifacts** | Bare metal server, VPS, no containers | Rust, Node.js, PostgreSQL installed |

**IMPORTANT**: Each scenario is COMPLETE and SELF-CONTAINED. Follow only ONE scenario from start to finish.

### What You're Deploying

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────┐
│  Frontend (React)   │               │  Backend (Rust)     │
│   Port 8080         │               │  Port 8000          │
└─────────────────────┘               └──────────┬──────────┘
                                                 │
                                      ┌──────────┴──────────┐
                                      ▼                     ▼
                          ┌─────────────────┐    ┌──────────────┐
                          │  PostgreSQL 18  │    │  File System │
                          │  Port 5432      │    │  (uploads)   │
                          └─────────────────┘    └──────────────┘
```

### Key Technical Facts

- **Backend binary name**: `docpat-backend`
- **Redis**: NOT implemented (ignore any Redis references)
- **Nginx**: OPTIONAL - backend has native TLS via rustls
- **Required PostgreSQL extensions**: uuid-ossp, pgcrypto, btree_gist, pg_trgm

---

## Environment Files Explained

**This is the most confusing part - read carefully!**

Your repository contains MULTIPLE `.env` files with DIFFERENT purposes:

### The 4 Environment Files

```
docpat/
├── backend/.env          # (1) LOCAL DEV - Used by: cargo run
├── frontend/.env         # (2) LOCAL DEV - Used by: npm run dev (Vite)
├── .env (root)           # (3) DOCKER - Used by: docker compose
└── /opt/docpat/config/   # (4) ARTIFACTS PROD - Used by: systemd service
    └── backend.env
```

### Which File Is Used When?

| Scenario | Command | .env File Used |
|----------|---------|----------------|
| **Local Development** | `cd backend && cargo run` | `backend/.env` |
| **Local Development** | `cd frontend && npm run dev` | `frontend/.env` |
| **Docker (any environment)** | `docker compose up` | Root `.env` |
| **Artifacts Production** | `systemctl start docpat-backend` | `/opt/docpat/config/backend.env` |

### Why Does `backend/.env` Have 300+ Lines?

Your `backend/.env` file serves TWO purposes:
1. **Configuration** for your local development
2. **Documentation** showing ALL available options

**Most options have sensible defaults.** You only need 4 variables to run the app. The other 296 lines are optional features you can enable when needed.

### What About Docker?

When using Docker Compose:
- The **root `.env`** provides variables to `docker-compose.yml`
- `docker-compose.yml` then passes these to containers via the `environment:` section
- The backend container does NOT read `backend/.env` - it gets environment variables from Docker
- The frontend is built at image creation time with values baked in

---

## Required vs Optional Variables

### The Backend Only Requires 4 Variables

The backend application will **crash on startup** without these:

| Variable | Why It's Required | How to Generate |
|----------|-------------------|-----------------|
| `DATABASE_URL` | Database connection | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Sign access tokens | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Sign refresh tokens | `openssl rand -base64 64` |
| `ENCRYPTION_KEY` | Encrypt medical data (AES-256) | `openssl rand -base64 32` |

### Everything Else Has Defaults

| Variable | Default | Notes |
|----------|---------|-------|
| `SERVER_HOST` | `0.0.0.0` | Listen on all interfaces |
| `SERVER_PORT` | `8000` | Backend API port |
| `ENVIRONMENT` | `development` | Set to `production` in prod |
| `DATABASE_MAX_CONNECTIONS` | `20` | Connection pool size |
| `JWT_ACCESS_TOKEN_EXPIRY` | `900` | 15 minutes |
| `JWT_REFRESH_TOKEN_EXPIRY` | `604800` | 7 days |
| `SESSION_TIMEOUT` | `1800` | 30 minutes |
| `MAX_LOGIN_ATTEMPTS` | `5` | Before account lockout |
| `ACCOUNT_LOCKOUT_DURATION` | `900` | 15 minutes |
| `TLS_ENABLED` | `false` | Enable backend HTTPS |
| `SMTP_ENABLED` | `false` | Enable email sending |
| `CORS_ALLOWED_ORIGINS` | `https://localhost` | Comma-separated URLs |

### Minimal Production .env (Docker)

Here's the **absolute minimum** for Docker production:

```bash
# REQUIRED - Application will not start without these
POSTGRES_PASSWORD=your_generated_password
JWT_SECRET=your_64_byte_base64_secret
JWT_REFRESH_SECRET=your_64_byte_base64_secret
ENCRYPTION_KEY=your_32_byte_base64_key

# RECOMMENDED - Explicit is better than implicit
POSTGRES_DB=mpms_prod
POSTGRES_USER=mpms_user
ENVIRONMENT=production
RUST_LOG=info
```

That's it! The docker-compose.yml file constructs `DATABASE_URL` automatically from the individual `POSTGRES_*` variables.

---

## Understanding Development vs Production

**Important Question Answered**: How do I keep my development environment working while also deploying to production?

### Files in Your Repository

Your repository contains files for BOTH development AND production. Here's what each is for:

```
docpat/
├── backend/
│   ├── .env                    # LOCAL DEVELOPMENT - Your dev database, dev secrets
│   ├── .env.example            # Template showing all available options
│   ├── Cargo.toml              # Shared - same for dev and prod
│   └── src/                    # Shared - same code for dev and prod
│
├── frontend/
│   ├── .env                    # LOCAL DEVELOPMENT - Optional, for dev settings
│   ├── .env.example            # Template showing all options
│   └── src/                    # Shared - same code for dev and prod
│
├── .env                        # PRODUCTION (Docker) - Create this for deployment
├── docker-compose.yml          # PRODUCTION (Docker) - Only used for Docker deployment
├── infrastructure/
│   └── docker/                 # PRODUCTION (Docker) - Dockerfiles
│
└── docs/
    └── DEPLOYMENT.md           # This file
```

### The Key Insight

| Environment | Configuration Location | Used By |
|-------------|----------------------|---------|
| **Local Development** | `backend/.env` | `cargo run` on your dev machine |
| **Docker Production** | Root `.env` (next to docker-compose.yml) | Docker Compose |
| **Artifacts Production** | `/opt/docpat/config/backend.env` on server | systemd service |

**Your development `.env` files stay on your local machine. Production `.env` files are created on the production server.**

### Typical Workflow

1. **Develop locally**: Use `backend/.env` with `mpms_dev` database, dev secrets
2. **Push to GitHub**: `.env` files are in `.gitignore`, they're NOT pushed
3. **On production server**: Clone repo + create NEW `.env` with production values
4. **Result**: Dev machine has dev config, prod server has prod config - completely separate

---

# SCENARIO A: Docker Deployment (Synology/Portainer/Local Server)

**Prerequisites**: Docker Engine 24+ and Docker Compose v2.20+ installed

**Time estimate**: 30-60 minutes

---

## A.1 Install Docker (Skip if already installed)

### Ubuntu/Debian Server

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose plugin
sudo apt update
sudo apt install -y docker-compose-plugin

# Add your user to docker group (requires logout/login)
sudo usermod -aG docker $USER

# Verify installation
docker --version      # Should show 24.x or higher
docker compose version  # Should show v2.20 or higher
```

### Synology NAS

1. Open **Package Center**
2. Install **Container Manager** (formerly Docker)
3. (Optional) Install Portainer:
   ```bash
   sudo docker run -d -p 9000:9000 --name portainer \
     --restart=always \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -v portainer_data:/data \
     portainer/portainer-ce:latest
   ```
4. Access Portainer at `http://your-nas-ip:9000`

---

## A.2 Clone the Repository

```bash
# Navigate to where you want to install (example paths)
cd /opt                          # Linux server
# OR
cd /volume1/docker               # Synology NAS

# Clone the repository
git clone https://github.com/h0pes/docpat.git
cd docpat

# Verify you're in the correct directory
ls docker-compose.yml
# Should output: docker-compose.yml
```

---

## A.3 Create Data Directories

Docker volumes require these directories to exist BEFORE starting:

```bash
# Make sure you're in the docpat directory
pwd
# Should show: /opt/docpat (or /volume1/docker/docpat)

# Create directories for PostgreSQL data and backups
mkdir -p ./data/postgres
mkdir -p ./backups/postgres

# Set ownership for PostgreSQL container (UID 999 is postgres user inside container)
sudo chown -R 999:999 ./data/postgres
sudo chown -R 999:999 ./backups/postgres

# Verify directories exist
ls -la ./data/
ls -la ./backups/
```

---

## A.4 Generate Security Keys

Run these commands and **SAVE THE OUTPUT** - you'll need these values in the next step:

```bash
echo "=== SAVE THESE VALUES ==="
echo ""
echo "POSTGRES_PASSWORD:"
openssl rand -base64 24
echo ""
echo "JWT_SECRET:"
openssl rand -base64 64
echo ""
echo "JWT_REFRESH_SECRET:"
openssl rand -base64 64
echo ""
echo "ENCRYPTION_KEY:"
openssl rand -base64 32
echo ""
echo "=== END OF VALUES ==="
```

**Example output** (DO NOT USE THESE - generate your own):

```
POSTGRES_PASSWORD:
Hk7mNpQ2rS9tUvW3xYz1A4bC6dE8fG==

JWT_SECRET:
a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6a7B8c9D0e1F2g3H4==

JWT_REFRESH_SECRET:
z9Y8x7W6v5U4t3S2r1Q0p9O8n7M6l5K4j3I2h1G0f9E8d7C6b5A4z3Y2x1W0v9U8t7==

ENCRYPTION_KEY:
xK9h2mLpQr7NvYw3jE6uC1tZaS5dF8gH0iJ4kM2nO9P=
```

---

## A.5 Create Production Environment File

Create a `.env` file in the **docpat root directory** (same folder as docker-compose.yml):

```bash
# Make sure you're in the docpat directory
pwd
# Should show: /opt/docpat

# Create the .env file
nano .env
```

**Copy-paste this template and replace the placeholder values with your generated keys from Step A.4:**

```bash
# ===========================================
# DocPat Docker Production Configuration
# ===========================================
# Location: /opt/docpat/.env (same directory as docker-compose.yml)
# This file is read by: docker compose

# PostgreSQL Database
POSTGRES_DB=mpms_prod
POSTGRES_USER=mpms_user
POSTGRES_PASSWORD=PASTE_YOUR_POSTGRES_PASSWORD_HERE

# JWT Authentication
JWT_SECRET=PASTE_YOUR_JWT_SECRET_HERE
JWT_REFRESH_SECRET=PASTE_YOUR_JWT_REFRESH_SECRET_HERE

# Data Encryption (AES-256)
ENCRYPTION_KEY=PASTE_YOUR_ENCRYPTION_KEY_HERE

# Volume Paths (relative to docker-compose.yml)
DATA_DIR=./data
BACKUP_DIR=./backups

# Logging
RUST_LOG=info
```

**Save the file** (Ctrl+O, Enter, Ctrl+X in nano), then set permissions:

```bash
# Restrict permissions - only owner can read
chmod 600 .env

# Verify the file exists and has content
head -5 .env
```

---

## A.6 Build Docker Images

This step compiles the Rust backend and builds the React frontend into Docker images.

**Choose ONE option based on whether you want Nginx:**

### Option A: Without Nginx (Direct Port Access)

Use this for testing or if you have an external reverse proxy:

```bash
# Build core images only (backend + frontend)
docker compose build backend frontend
```

### Option B: With Nginx (Recommended for Production)

Use this for production with TLS termination:

```bash
# Build ALL images including Nginx
docker compose --profile with-nginx build
```

**Verify images were created:**

```bash
docker images | grep docpat
```

**Expected output (Option B with Nginx):**

```
REPOSITORY          TAG       IMAGE ID       CREATED          SIZE
docpat-nginx        latest    xyz789abc123   1 minute ago     30MB
docpat-frontend     latest    abc123def456   2 minutes ago    50MB
docpat-backend      latest    789ghi012jkl   5 minutes ago    150MB
```

---

## A.7 Start All Services

**Match your choice from A.6:**

```bash
# Option A: Without Nginx
docker compose up -d

# Option B: With Nginx (RECOMMENDED)
docker compose --profile with-nginx up -d

# Watch the logs to see startup progress
docker compose logs -f
```

**Wait until you see healthy status for all services.** Press `Ctrl+C` to exit logs.

```bash
# Check service status
docker compose ps
```

**Expected output (all should show "healthy"):**

Option A (without Nginx):
```
NAME              STATUS                   PORTS
docpat-postgres   Up (healthy)             127.0.0.1:5432->5432/tcp
docpat-backend    Up (healthy)             8000/tcp
docpat-frontend   Up (healthy)             8080/tcp
```

Option B (with Nginx):
```
NAME              STATUS                   PORTS
docpat-postgres   Up (healthy)             127.0.0.1:5432->5432/tcp
docpat-backend    Up (healthy)             8000/tcp
docpat-frontend   Up (healthy)             8080/tcp
docpat-nginx      Up (healthy)             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

**If a service is unhealthy**, check its logs:

```bash
docker compose logs backend   # Check backend errors
docker compose logs postgres  # Check database errors
```

---

## A.8 Run Database Migrations

The PostgreSQL container automatically:
- Creates the database (`mpms_prod`)
- Creates the user (`mpms_user`)
- Installs required extensions (via init.sql)

**BUT you need to run migrations to create the application tables and seed default data:**

> **Note:** Migrations automatically seed required default data including system settings, working hours, holidays, and document templates. No separate seeding step is needed.

```bash
# Connect to the backend container and run migrations
docker compose exec backend /bin/sh -c "cd /app && ./docpat-backend migrate"
```

If the above command doesn't work (migration subcommand not implemented), run migrations from your local machine:

```bash
# On your LOCAL development machine (not the server), if you have Rust installed:
cd backend
export DATABASE_URL="postgresql://mpms_user:YOUR_POSTGRES_PASSWORD@YOUR_SERVER_IP:5432/mpms_prod"
cargo sqlx migrate run
```

**Verify tables were created:**

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U mpms_user -d mpms_prod

# List tables (inside psql)
\dt

# Expected: users, patients, appointments, visits, prescriptions, etc.

# Exit psql
\q
```

---

## A.9 Create Admin User

You need at least one user to log in. First, generate a password hash:

**In a separate terminal on any machine with Python:**

```bash
# Install argon2 if needed
pip install argon2-cffi

# Generate password hash (CHANGE THE PASSWORD!)
python3 << 'EOF'
from argon2 import PasswordHasher
ph = PasswordHasher()
password = "YourSecurePassword123!"  # <-- CHANGE THIS
print("Your password hash:")
print(ph.hash(password))
EOF
```

**Copy the hash output** (starts with `$argon2id$...`).

**Now insert the admin user:**

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U mpms_user -d mpms_prod
```

**Inside psql, run:**

```sql
INSERT INTO users (
    id,
    username,
    email,
    password_hash,
    role,
    first_name,
    last_name,
    is_active,
    mfa_enabled,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'admin',
    'admin@yourpractice.com',  -- Change this
    '$argon2id$v=19$m=65536,t=3,p=4$YOUR_HASH_HERE',  -- Paste your hash
    'ADMIN',
    'System',
    'Administrator',
    true,
    false,
    NOW(),
    NOW()
);

-- Verify user was created
SELECT username, email, role FROM users;

-- Exit
\q
```

---

## A.10 Access Your Application

Based on which option you chose in A.6:

### If You Used Option B (With Nginx - Recommended)

Access via HTTPS on standard ports:

| URL | Description |
|-----|-------------|
| `https://your-server-ip/` | Frontend application |
| `https://your-server-ip/api/health` | Backend health check |

**Note:** You'll see a browser warning about the self-signed certificate. Accept it to proceed. For real SSL certificates, see the [TLS/HTTPS Configuration](#tlshttps-configuration) section.

### If You Used Option A (Without Nginx)

You need to expose ports by editing `docker-compose.yml`:

```bash
nano docker-compose.yml
```

Find the `backend` service and uncomment the ports:

```yaml
    ports:
      - "8000:8000"
```

Find the `frontend` service and uncomment the ports:

```yaml
    ports:
      - "8080:8080"
```

Then restart:

```bash
docker compose up -d
```

| URL | Description |
|-----|-------------|
| `http://your-server-ip:8080/` | Frontend application |
| `http://your-server-ip:8000/api/health` | Backend health check |

**Warning:** Option A has NO TLS encryption - use only for testing!

---

## A.11 Verify Deployment

```bash
# Test backend health endpoint
curl http://localhost:8000/api/health
# Expected: {"status":"healthy","timestamp":"..."}

# Test frontend loads
curl -s http://localhost:8080/ | head -20
# Expected: HTML content with DocPat

# If using Nginx:
curl -k https://localhost/api/health
```

**Docker deployment is complete!** Go to [Post-Deployment Tasks](#post-deployment-tasks).

---

# SCENARIO B: Artifacts Deployment (No Docker)

**Use this when**: You have a bare metal server or VPS and prefer not to use Docker.

**Time estimate**: 1-2 hours

---

## B.1 System Requirements

### Hardware

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 50 GB SSD | 200+ GB SSD |

### Software to Install

The following instructions are for **Ubuntu 22.04/24.04 or Debian 12**:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install build dependencies
sudo apt install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    curl \
    git \
    wget \
    python3 \
    python3-pip
```

---

## B.2 Install Rust 1.90+

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Choose option 1 (default installation)

# Reload shell environment
source $HOME/.cargo/env

# Verify installation
rustc --version
# Expected: rustc 1.90.x or higher
```

---

## B.3 Install Node.js 22+

```bash
# Install Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
# Expected: v22.x.x

npm --version
# Expected: v10.x.x
```

---

## B.4 Install PostgreSQL 18

```bash
# Add PostgreSQL official repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import repository key
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update and install
sudo apt update
sudo apt install -y postgresql-18 postgresql-contrib-18

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
# Expected: psql (PostgreSQL) 18.x
```

---

## B.5 Create PostgreSQL Database and User

```bash
# Switch to postgres system user
sudo -u postgres psql
```

**Inside psql, run each command one by one:**

```sql
-- Create database user (CHANGE THE PASSWORD!)
CREATE USER mpms_user WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';

-- Create production database
CREATE DATABASE mpms_prod
    WITH OWNER = mpms_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE mpms_prod TO mpms_user;

-- Connect to the new database
\c mpms_prod

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO mpms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mpms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mpms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO mpms_user;

-- Exit psql
\q
```

---

## B.6 Install PostgreSQL Extensions

```bash
# Connect as postgres superuser to the mpms_prod database
sudo -u postgres psql -d mpms_prod
```

**Inside psql:**

```sql
-- Install required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verify extensions
SELECT extname FROM pg_extension;
-- Expected: uuid-ossp, pgcrypto, btree_gist, pg_trgm

-- Exit
\q
```

---

## B.7 Clone Repository

```bash
# Create installation directory
sudo mkdir -p /opt/docpat
sudo chown $USER:$USER /opt/docpat

# Clone repository
git clone https://github.com/h0pes/docpat.git /opt/docpat
cd /opt/docpat

# Verify
ls -la
```

---

## B.8 Generate Security Keys

```bash
echo "=== SAVE THESE VALUES ==="
echo ""
echo "JWT_SECRET:"
openssl rand -base64 64
echo ""
echo "JWT_REFRESH_SECRET:"
openssl rand -base64 64
echo ""
echo "ENCRYPTION_KEY:"
openssl rand -base64 32
echo ""
echo "=== END OF VALUES ==="
```

**Save these values!**

---

## B.9 Create Backend Configuration

```bash
# Navigate to backend directory
cd /opt/docpat/backend

# Copy example config
cp .env.example .env

# Set permissions (readable only by owner)
chmod 600 .env

# Edit the config
nano .env
```

**Find and update these values** (search with Ctrl+W in nano):

```bash
# DATABASE (use the password from step B.5)
DATABASE_URL=postgresql://mpms_user:YOUR_POSTGRES_PASSWORD@localhost:5432/mpms_prod

# ENVIRONMENT (change from development to production)
ENVIRONMENT=production
DEV_MODE=false

# JWT (paste your generated values from step B.8)
JWT_SECRET=YOUR_GENERATED_JWT_SECRET
JWT_REFRESH_SECRET=YOUR_GENERATED_JWT_REFRESH_SECRET

# ENCRYPTION (paste your generated value from step B.8)
ENCRYPTION_KEY=YOUR_GENERATED_ENCRYPTION_KEY

# REDIS (disable - not implemented)
REDIS_ENABLED=false
```

**Save** (Ctrl+O, Enter, Ctrl+X).

---

## B.10 Build Backend

```bash
# Navigate to backend directory
cd /opt/docpat/backend

# Build release binary with required features
# This takes 10-20 minutes on first build
cargo build --release --features "rbac,report-export,pdf-export"

# Verify binary was created
ls -la target/release/docpat-backend
# Expected: -rwxr-xr-x ... docpat-backend

# Test binary runs
./target/release/docpat-backend --help
```

---

## B.11 Run Database Migrations

Migrations create all application tables and seed required default data (system settings, working hours, holidays, and document templates).

```bash
# Make sure you're in backend directory
cd /opt/docpat/backend

# Set DATABASE_URL for sqlx
export DATABASE_URL="postgresql://mpms_user:YOUR_POSTGRES_PASSWORD@localhost:5432/mpms_prod"

# Install sqlx-cli if not already installed
cargo install sqlx-cli --no-default-features --features rustls,postgres

# Run migrations
cargo sqlx migrate run

# Verify
cargo sqlx migrate info
# Expected: All migrations show "applied"
```

---

## B.12 Build Frontend

```bash
# Navigate to frontend directory
cd /opt/docpat/frontend

# Install dependencies
npm ci

# Create production environment file
cat > .env.production << 'EOF'
VITE_API_BASE_URL=/api
VITE_APP_NAME=DocPat
EOF

# Build for production
npm run build

# Verify build
ls -la dist/
# Expected: index.html, assets/ directory
```

---

## B.13 Create Admin User

Generate password hash:

```bash
pip3 install argon2-cffi

python3 << 'EOF'
from argon2 import PasswordHasher
ph = PasswordHasher()
password = "YourSecurePassword123!"  # <-- CHANGE THIS
print("Hash:")
print(ph.hash(password))
EOF
```

Insert user:

```bash
psql -U mpms_user -d mpms_prod -h localhost
```

```sql
INSERT INTO users (
    id, username, email, password_hash, role,
    first_name, last_name, is_active, mfa_enabled,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'admin',
    'admin@yourpractice.com',
    '$argon2id$v=19$m=65536,t=3,p=4$YOUR_HASH_HERE',
    'ADMIN',
    'System',
    'Administrator',
    true,
    false,
    NOW(),
    NOW()
);

SELECT username, email, role FROM users;
\q
```

---

## B.14 Setup Application Directories

```bash
# Create system user for the application
sudo useradd -r -s /bin/false -d /opt/docpat docpat

# Create required directories
sudo mkdir -p /opt/docpat/uploads
sudo mkdir -p /opt/docpat/logs
sudo mkdir -p /opt/docpat/bin
sudo mkdir -p /opt/docpat/frontend-dist
sudo mkdir -p /opt/docpat/config

# Copy built binary
sudo cp /opt/docpat/backend/target/release/docpat-backend /opt/docpat/bin/

# Copy casbin policies
sudo cp -r /opt/docpat/backend/casbin /opt/docpat/config/

# Copy frontend build
sudo cp -r /opt/docpat/frontend/dist/* /opt/docpat/frontend-dist/

# Copy backend config
sudo cp /opt/docpat/backend/.env /opt/docpat/config/backend.env

# Set ownership
sudo chown -R docpat:docpat /opt/docpat/uploads
sudo chown -R docpat:docpat /opt/docpat/logs
sudo chown docpat:docpat /opt/docpat/bin/docpat-backend
sudo chown -R docpat:docpat /opt/docpat/config
sudo chmod 600 /opt/docpat/config/backend.env
```

---

## B.15 Create Systemd Service (Backend)

```bash
sudo nano /etc/systemd/system/docpat-backend.service
```

**Paste:**

```ini
[Unit]
Description=DocPat Backend API Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=docpat
Group=docpat
WorkingDirectory=/opt/docpat
EnvironmentFile=/opt/docpat/config/backend.env
ExecStart=/opt/docpat/bin/docpat-backend
Restart=always
RestartSec=5
StandardOutput=append:/opt/docpat/logs/backend.log
StandardError=append:/opt/docpat/logs/backend-error.log

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=/opt/docpat/uploads /opt/docpat/logs

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable docpat-backend
sudo systemctl start docpat-backend

# Check status
sudo systemctl status docpat-backend

# View logs if there are errors
sudo journalctl -u docpat-backend -f
```

---

## B.16 Serve Frontend (Choose One Option)

### Option A: Using `serve` (Simple)

```bash
# Install serve globally
sudo npm install -g serve

# Create systemd service
sudo nano /etc/systemd/system/docpat-frontend.service
```

```ini
[Unit]
Description=DocPat Frontend Server
After=network.target

[Service]
Type=simple
User=docpat
Group=docpat
WorkingDirectory=/opt/docpat/frontend-dist
ExecStart=/usr/bin/serve -s /opt/docpat/frontend-dist -l 8080
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable docpat-frontend
sudo systemctl start docpat-frontend
```

### Option B: Using Nginx (Production)

```bash
sudo apt install nginx

sudo nano /etc/nginx/sites-available/docpat
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        root /opt/docpat/frontend-dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/docpat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## B.17 Verify Deployment

```bash
# Check backend is running
sudo systemctl status docpat-backend

# Test backend API
curl http://localhost:8000/api/health

# Check frontend is running
sudo systemctl status docpat-frontend

# Test frontend
curl http://localhost:8080/

# Check for errors
sudo tail -f /opt/docpat/logs/backend-error.log
```

**Artifacts deployment is complete!**

---

# TLS/HTTPS Configuration

This section explains how to enable HTTPS encryption for production. **Choose ONE approach** based on your deployment scenario.

---

## Understanding TLS Options

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TLS TERMINATION OPTIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Option 1: Nginx Termination (Recommended)                                  │
│  ─────────────────────────────────────────                                  │
│                                                                             │
│    Internet ──HTTPS──► Nginx ──HTTP──► Backend (port 8000)                  │
│                         │                                                   │
│                         └──HTTP──► Frontend (port 8080)                     │
│                                                                             │
│    • Nginx handles SSL certificates                                         │
│    • Backend runs plain HTTP                                                │
│    • Single place for certificate management                                │
│    • Let's Encrypt integration built-in                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Option 2: Backend Native TLS (simpler, no Nginx needed)                    │
│  ───────────────────────────────────────────────────────                    │
│                                                                             │
│    Internet ──HTTPS──► Backend (port 8000, rustls)                          │
│              ──HTTPS──► Frontend (separate server)                          │
│                                                                             │
│    • Backend handles its own TLS via rustls                                 │
│    • No reverse proxy needed                                                │
│    • Good for simple deployments                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Docker + Nginx TLS (Recommended for Docker Deployment)

This is the simplest production setup. Nginx handles all TLS termination.

### Step 1: Generate Self-Signed Certificates (Testing)

The Nginx Docker image already generates self-signed certificates during build. To use them:

```bash
# Start with Nginx profile
docker compose --profile with-nginx up -d

# Access via HTTPS (accept self-signed cert warning)
# https://your-server-ip/
```

### Step 2: Use Let's Encrypt (Production)

For real SSL certificates:

```bash
# First, ensure your domain points to your server's IP
# Then start with certbot profile
docker compose --profile with-certbot up -d

# Run certbot to get certificates
docker compose exec certbot certbot certonly --webroot \
  -w /var/www/certbot \
  -d your-domain.com \
  --email your@email.com \
  --agree-tos \
  --no-eff-email

# Update nginx config to use Let's Encrypt certs
# Edit infrastructure/nginx/proxy.conf:
# Comment out:   ssl_certificate /etc/nginx/ssl/self-signed.crt;
# Uncomment:     ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;

# Rebuild and restart nginx
docker compose --profile with-certbot up -d --build nginx
```

### Step 3: Update CORS (Important!)

Add your domain to the allowed origins in root `.env`:

```bash
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

Restart backend:

```bash
docker compose restart backend
```

---

## Docker + Backend Native TLS (Alternative)

If you don't want Nginx, enable TLS directly in the backend.

### Step 1: Generate Certificates

```bash
# Create certificate directory
mkdir -p /opt/docpat/certs

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout /opt/docpat/certs/server.key \
  -out /opt/docpat/certs/server.crt \
  -subj "/C=IT/ST=Italy/L=City/O=DocPat/CN=your-domain.com"

# Set permissions
chmod 600 /opt/docpat/certs/server.key
chmod 644 /opt/docpat/certs/server.crt
```

### Step 2: Update docker-compose.yml

Add certificate volumes and enable TLS:

```yaml
backend:
  environment:
    TLS_ENABLED: "true"
    TLS_CERT_PATH: /app/certs/server.crt
    TLS_KEY_PATH: /app/certs/server.key
  volumes:
    - /opt/docpat/certs:/app/certs:ro
  ports:
    - "8000:8000"  # Expose HTTPS port directly
```

### Step 3: Start Without Nginx

```bash
# Don't use the with-nginx profile
docker compose up -d  # Just postgres, backend, frontend
```

Access backend at `https://your-server-ip:8000`

---

## Artifacts Deployment TLS

For non-Docker deployments, you have similar options.

### Option A: Nginx + Let's Encrypt (Recommended)

This is already covered in [B.16 Serve Frontend](#b16-serve-frontend-choose-one-option) Option B.

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### Option B: Backend Native TLS

```bash
# Generate certificates
sudo mkdir -p /opt/docpat/certs
sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout /opt/docpat/certs/server.key \
  -out /opt/docpat/certs/server.crt \
  -subj "/C=IT/ST=Italy/L=City/O=DocPat/CN=your-domain.com"

# Set ownership
sudo chown docpat:docpat /opt/docpat/certs/*
sudo chmod 600 /opt/docpat/certs/server.key
```

Update `/opt/docpat/config/backend.env`:

```bash
TLS_ENABLED=true
TLS_CERT_PATH=/opt/docpat/certs/server.crt
TLS_KEY_PATH=/opt/docpat/certs/server.key
```

Restart the backend:

```bash
sudo systemctl restart docpat-backend
```

---

## TLS Configuration Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `TLS_ENABLED` | Enable backend HTTPS | `false` |
| `TLS_CERT_PATH` | Path to certificate (.crt/.pem) | - |
| `TLS_KEY_PATH` | Path to private key (.key) | - |

**Important Notes:**

1. If `TLS_ENABLED=true` but paths are missing, the backend logs a warning and falls back to HTTP
2. Certificate files must be readable by the backend process/container
3. The backend uses **rustls** (pure Rust TLS) - no OpenSSL dependency

---

## Comparing Local Dev vs Production TLS

| Aspect | Local Development | Production (Nginx) | Production (Native) |
|--------|-------------------|--------------------|--------------------|
| **Certificates** | Self-signed (`certs/backend/`) | Let's Encrypt | Self-signed or LE |
| **Who terminates TLS** | Backend (rustls) | Nginx | Backend (rustls) |
| **Browser warning** | Yes (self-signed) | No | Depends on cert |
| **Certificate renewal** | Manual | Automatic (certbot) | Manual |
| **Recommended for** | Development only | Production | Simple setups |

---

# Post-Deployment Tasks

## First Login

1. Open browser to your deployment URL
2. Log in with admin credentials you created
3. **Immediately change your password**: Profile → Security → Change Password
4. **Enable MFA**: Profile → Security → Enable Two-Factor Authentication

## Configure Email (Optional)

**For Docker:** Edit `/opt/docpat/.env`:

**For Artifacts:** Edit `/opt/docpat/config/backend.env`:

```bash
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_16_char_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_FROM_NAME=Dr. Your Name
```

**For Gmail:** Generate an App Password at https://myaccount.google.com/apppasswords

Restart the backend after changing configuration.

---

# Maintenance Procedures

## Backup Database

**Docker:**
```bash
docker compose exec postgres pg_dump -U mpms_user mpms_prod | gzip > backup_$(date +%Y%m%d).sql.gz
```

**Artifacts:**
```bash
pg_dump -U mpms_user -h localhost mpms_prod | gzip > backup_$(date +%Y%m%d).sql.gz
```

## Restore Database

**Docker:**
```bash
gunzip -c backup.sql.gz | docker compose exec -T postgres psql -U mpms_user -d mpms_prod
```

**Artifacts:**
```bash
gunzip -c backup.sql.gz | psql -U mpms_user -h localhost -d mpms_prod
```

## Update Application

### Docker Update

```bash
cd /opt/docpat
git pull
docker compose build
docker compose down
docker compose up -d
```

### Artifacts Update

```bash
cd /opt/docpat
git pull

# Rebuild backend
cd backend
cargo build --release --features "rbac,report-export,pdf-export"

# Rebuild frontend
cd ../frontend
npm ci && npm run build

# Stop services
sudo systemctl stop docpat-backend docpat-frontend

# Deploy new files
sudo cp backend/target/release/docpat-backend /opt/docpat/bin/
sudo cp -r frontend/dist/* /opt/docpat/frontend-dist/

# Run migrations
export DATABASE_URL="postgresql://mpms_user:PASSWORD@localhost:5432/mpms_prod"
cargo sqlx migrate run

# Start services
sudo systemctl start docpat-backend docpat-frontend
```

---

# Troubleshooting

## Backend Won't Start

```bash
# Docker
docker compose logs backend

# Artifacts
sudo journalctl -u docpat-backend -n 100
sudo cat /opt/docpat/logs/backend-error.log
```

**Common causes:**
- Wrong DATABASE_URL (check password, hostname)
- Missing ENCRYPTION_KEY or JWT_SECRET
- Port 8000 already in use: `sudo lsof -i :8000`
- Missing casbin policy files

## Database Connection Failed

```bash
# Test PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U mpms_user -h localhost -d mpms_prod -c "SELECT 1;"
```

## Frontend Shows Blank Page

- Check browser console for JavaScript errors
- Verify VITE_API_BASE_URL in frontend build matches your setup
- Check backend is accessible at the configured URL

---

# Appendix

## Complete Environment Variable Reference

### Required Variables (App Crashes Without These)

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `ENCRYPTION_KEY` | 32-byte base64 AES-256 key | `openssl rand -base64 32` |
| `JWT_SECRET` | 64-byte base64 JWT signing key | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | 64-byte base64 refresh token key | `openssl rand -base64 64` |

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_HOST` | `0.0.0.0` | Listen address |
| `SERVER_PORT` | `8000` | HTTP/HTTPS port |
| `ENVIRONMENT` | `development` | `development`, `staging`, `production` |

### Database Pool

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_MAX_CONNECTIONS` | `20` | Max pool connections |
| `DATABASE_MIN_CONNECTIONS` | `5` | Min pool connections |
| `DATABASE_CONNECT_TIMEOUT` | `30` | Connection timeout (seconds) |
| `DATABASE_IDLE_TIMEOUT` | `600` | Idle connection timeout (seconds) |

### Authentication & Security

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_ACCESS_TOKEN_EXPIRY` | `900` | Access token TTL (seconds, 15 min) |
| `JWT_REFRESH_TOKEN_EXPIRY` | `604800` | Refresh token TTL (seconds, 7 days) |
| `SESSION_TIMEOUT` | `1800` | Session timeout (seconds, 30 min) |
| `MAX_LOGIN_ATTEMPTS` | `5` | Failed logins before lockout |
| `ACCOUNT_LOCKOUT_DURATION` | `900` | Lockout duration (seconds, 15 min) |

### TLS/HTTPS

| Variable | Default | Description |
|----------|---------|-------------|
| `TLS_ENABLED` | `false` | Enable backend native TLS |
| `TLS_CERT_PATH` | - | Path to certificate file |
| `TLS_KEY_PATH` | - | Path to private key file |

### CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ALLOWED_ORIGINS` | `https://localhost` | Comma-separated allowed origins |

### Email (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_ENABLED` | `false` | Enable email sending |
| `SMTP_HOST` | - | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USERNAME` | - | SMTP username |
| `SMTP_PASSWORD` | - | SMTP password |
| `SMTP_FROM_EMAIL` | - | Sender email address |
| `SMTP_FROM_NAME` | `DocPat` | Sender display name |

### Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `RUST_LOG` | `info` | Log level: `trace`, `debug`, `info`, `warn`, `error` |

## Which .env File to Use - Quick Reference

```
┌───────────────────────────────────────────────────────────────────────────┐
│  WHERE ARE YOU?            │  WHICH .env?          │  WHICH COMMAND?      │
├────────────────────────────┼───────────────────────┼──────────────────────┤
│  Your laptop (development) │  backend/.env         │  cargo run           │
│  Your laptop (development) │  frontend/.env        │  npm run dev         │
│  Your laptop (Docker test) │  .env (root)          │  docker compose up   │
│  Server (Docker)           │  .env (root)          │  docker compose up   │
│  Server (Artifacts)        │  /opt/.../backend.env │  systemctl start     │
└───────────────────────────────────────────────────────────────────────────┘
```

## Docker Compose Commands Reference

```bash
# Core services (no Nginx)
docker compose up -d

# With Nginx (self-signed certs)
docker compose --profile with-nginx up -d

# With Nginx + Let's Encrypt
docker compose --profile with-certbot up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f [service]

# Check status
docker compose ps

# Database shell
docker compose exec postgres psql -U mpms_user -d mpms_prod

# Rebuild images after code changes
docker compose build
docker compose up -d
```

## Systemd Commands Reference (Artifacts)

```bash
# Check service status
sudo systemctl status docpat-backend
sudo systemctl status docpat-frontend

# View logs
sudo journalctl -u docpat-backend -f
sudo journalctl -u docpat-frontend -f

# Restart services
sudo systemctl restart docpat-backend
sudo systemctl restart docpat-frontend

# Enable services on boot
sudo systemctl enable docpat-backend
sudo systemctl enable docpat-frontend
```

---

**Document Version:** 2.1.0
**Last Updated:** 2026-02-02
