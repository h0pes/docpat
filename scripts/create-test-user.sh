#!/bin/bash
#
# Create Test User Script
#
# Creates a test user in the database for development/testing purposes.
# Password: Test123!
#

set -e

# Database connection
DB_USER="mpms_user"
DB_NAME="mpms_dev"
DB_HOST="localhost"

# User details
USERNAME="testdoctor"
EMAIL="test@docpat.local"
PASSWORD="Test123!"
ROLE="DOCTOR"
FIRST_NAME="Test"
LAST_NAME="Doctor"

echo "Creating test user..."
echo "Username: $USERNAME"
echo "Email: $EMAIL"
echo "Password: $PASSWORD"
echo "Role: $ROLE"
echo ""

# Generate Argon2id hash using a simple approach
# Note: In production, this should use the backend's password hashing
# For testing, we'll use a pre-computed hash
PASSWORD_HASH='$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZTEyMw$8nN3hGjvPJ7pT6QmZwJZCN0HzL5KqxYZJF2jF9bPqF8'

# Insert user
psql -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO users (
    username,
    email,
    password_hash,
    role,
    first_name,
    last_name,
    is_active,
    mfa_enabled
) VALUES (
    '$USERNAME',
    '$EMAIL',
    '$PASSWORD_HASH',
    '$ROLE',
    '$FIRST_NAME',
    '$LAST_NAME',
    true,
    false
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active;

SELECT id, username, email, role, is_active, mfa_enabled
FROM users
WHERE username = '$USERNAME';
EOF

echo ""
echo "✅ Test user created successfully!"
echo ""
echo "Login credentials:"
echo "  Username: $USERNAME"
echo "  Password: $PASSWORD"
echo ""
