# API Documentation - Medical Practice Management System

**Version**: 1.3.0
**Base URL**: `/api/v1`
**Last Updated**: January 2026

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Response Format](#response-format)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Users](#user-management-endpoints)
  - [Patients](#patient-management-endpoints)
  - [Appointments](#appointment-management-endpoints)
  - [Visits](#visit-documentation-endpoints)
  - [Diagnoses](#diagnosis-management-endpoints)
  - [Prescriptions](#prescription-management-endpoints)
  - [Visit Templates](#visit-template-endpoints)
  - [Prescription Templates](#prescription-template-endpoints)
  - [Visit Versions](#visit-version-history-endpoints)
  - [Reports & Analytics](#reports--analytics-endpoints)
  - [Settings](#settings-endpoints)
  - [Working Hours](#working-hours-endpoints)
  - [Holidays](#holidays-endpoints)
  - [Audit Logs](#audit-logs-endpoints)
  - [System Health](#system-health-endpoints)
  - [File Upload](#file-upload-endpoints)
  - [Logo](#logo-endpoints)
  - [Document Templates](#document-templates-endpoints)
  - [Generated Documents](#generated-documents-endpoints)
  - [Drug Interactions](#drug-interactions-endpoints)
  - [Notifications](#notifications-endpoints)
- [Appendix](#appendix)
- [Changelog](#changelog)

---

## Overview

The Medical Practice Management System API is a RESTful API built with Rust and Axum. All endpoints require authentication unless otherwise specified.

### Base Information

- **Protocol**: HTTPS only (TLS 1.3)
- **Content-Type**: `application/json`
- **Authentication**: JWT Bearer tokens
- **Charset**: UTF-8

### API Versioning

The API is versioned through the URL path (`/api/v1`). Breaking changes will result in a new version number.

### RBAC Feature Flag

User management endpoints require the `rbac` feature flag to be enabled at compile time. When disabled, only basic role checks (ADMIN/DOCTOR) are performed.

---

## Authentication

All authenticated endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

### Token Lifecycle

- **Access Token**: Valid for 30 minutes (configurable)
- **Refresh Token**: Valid for 7 days (configurable)
- **Session Timeout**: 30 minutes of inactivity

### Security Features

- Account lockout after 5 failed login attempts
- MFA (TOTP) support for all users
- Refresh token rotation on use
- IP-based rate limiting
- Session tracking and invalidation

---

## Rate Limiting

Rate limits are enforced per IP address and per user:

| User Type | Limit |
|-----------|-------|
| Unauthenticated | 100 requests/minute |
| Authenticated | 300 requests/minute |
| Bulk Operations | 10 requests/minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1699012345
```

When rate limit is exceeded, the API returns `429 Too Many Requests`.

---

## Error Handling

All errors follow a consistent format:

### Error Response Structure

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error description"
}
```

### Standard Error Codes

| HTTP Status | Error Code | Description |
|------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | Invalid or expired token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Resource conflict (e.g., double booking, duplicate patient) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

### Validation Errors

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation error: field_name: validation message"
}
```

---

## Response Format

### Success Response (Single Resource)

```json
{
  "id": "uuid",
  "field1": "value1",
  "field2": "value2",
  "created_at": "2024-11-01T10:30:00Z",
  "updated_at": "2024-11-01T10:30:00Z"
}
```

### Paginated Response

```json
{
  "patients": [
    // Array of items
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

Note: The array key varies by resource type (e.g., `patients`, `appointments`, `visits`).

---

## API Endpoints

---

## Health Check Endpoints

### GET /health

Check if the API server is healthy.

**Authentication**: Not required

**Response** `200 OK`

```json
{
  "status": "healthy"
}
```

### GET /api/version

Get API version information.

**Authentication**: Not required

**Response** `200 OK`

```json
{
  "version": "1.1.0"
}
```

---

## Authentication Endpoints

### POST /api/v1/auth/login

Authenticate user and receive access tokens.

**Authentication**: Not required

**Request Body**

```json
{
  "username": "dr.smith",
  "password": "SecurePass123!",
  "mfa_code": "123456"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | User's username |
| `password` | string | Yes | User's password |
| `mfa_code` | string | Conditional | Required if MFA is enabled for user |

**Response** `200 OK`

When MFA is not enabled or MFA code is provided:

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "dr.smith",
    "email": "dr.smith@clinic.com",
    "first_name": "John",
    "last_name": "Smith",
    "role": "DOCTOR",
    "is_active": true,
    "mfa_enabled": true,
    "created_at": "2024-01-01T00:00:00Z",
    "last_login": "2024-11-01T09:00:00Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 1800
  },
  "requiresMfa": false
}
```

When MFA is enabled but code is not provided (partial login):

```json
{
  "user": null,
  "tokens": null,
  "requiresMfa": true
}
```

**Error Responses**

- `401 Unauthorized`: Invalid credentials or MFA code

---

### POST /api/v1/auth/refresh

Refresh access token using refresh token.

**Authentication**: Not required

**Request Body**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 1800
}
```

**Error Responses**

- `401 Unauthorized`: Invalid or expired refresh token

---

### POST /api/v1/auth/logout

Invalidate current session and tokens.

**Authentication**: Not required (but token can be provided for session invalidation)

**Request Body** (Optional)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** `200 OK`

```json
{
  "message": "Logged out successfully"
}
```

---

### POST /api/v1/auth/mfa/setup

Generate MFA secret and QR code for enrollment.

**Authentication**: Not required

**Request Body**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response** `200 OK`

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code": "data:image/png;base64,...",
  "totp_uri": "otpauth://totp/DocPat Medical:dr.smith@docpat?secret=JBSWY3DPEHPK3PXP&issuer=DocPat Medical",
  "backup_codes": [
    "12345678",
    "23456789",
    "34567890",
    "45678901",
    "56789012",
    "67890123",
    "78901234",
    "89012345",
    "90123456",
    "01234567"
  ]
}
```

**Error Responses**

- `403 Forbidden`: Account is inactive
- `404 Not Found`: User not found

---

### POST /api/v1/auth/mfa/enroll

Confirm MFA enrollment after verifying TOTP code.

**Authentication**: Not required

**Request Body**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "secret": "JBSWY3DPEHPK3PXP",
  "code": "123456",
  "backup_codes": ["12345678", "23456789", "..."]
}
```

**Response** `200 OK`

```json
{
  "message": "MFA enrolled successfully",
  "mfa_enabled": true
}
```

**Error Responses**

- `400 Bad Request`: Invalid MFA secret
- `401 Unauthorized`: Invalid MFA code
- `403 Forbidden`: Account is inactive

---

## User Management Endpoints

> **Note**: These endpoints require the `rbac` feature flag to be enabled.

### POST /api/v1/users

Create a new user account.

**Authentication**: Required
**Authorization**: ADMIN only

**Request Body**

```json
{
  "username": "dr.jones",
  "email": "dr.jones@clinic.com",
  "password": "SecurePass123!",
  "role": "DOCTOR",
  "first_name": "Sarah",
  "last_name": "Jones",
  "phone": "+1-555-0123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Unique username |
| `email` | string | Yes | Unique email address |
| `password` | string | Yes | Must meet complexity requirements |
| `role` | enum | Yes | `ADMIN` or `DOCTOR` |
| `first_name` | string | Yes | User's first name |
| `last_name` | string | Yes | User's last name |
| `phone` | string | No | Phone number |

**Response** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "username": "dr.jones",
  "email": "dr.jones@clinic.com",
  "role": "DOCTOR",
  "first_name": "Sarah",
  "last_name": "Jones",
  "phone": "+1-555-0123",
  "is_active": true,
  "mfa_enabled": false,
  "created_at": "2024-11-01T10:30:00Z",
  "last_login": null
}
```

**Error Responses**

- `400 Bad Request`: Invalid password complexity
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Username or email already exists

---

### GET /api/v1/users

List all users with pagination and filtering.

**Authentication**: Required
**Authorization**: ADMIN only

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Number of results (max 100) |
| `offset` | integer | 0 | Pagination offset |
| `role` | enum | - | Filter by role (`ADMIN`, `DOCTOR`) |
| `is_active` | boolean | - | Filter by active status |
| `search` | string | - | Search by username, email, or name |

**Response** `200 OK`

```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "dr.smith",
      "email": "dr.smith@clinic.com",
      "role": "DOCTOR",
      "first_name": "John",
      "last_name": "Smith",
      "phone": "+1-555-0100",
      "is_active": true,
      "mfa_enabled": true,
      "created_at": "2024-01-01T00:00:00Z",
      "last_login": "2024-11-01T09:00:00Z"
    }
  ],
  "total": 5,
  "offset": 0,
  "limit": 20
}
```

---

### GET /api/v1/users/:id

Get specific user details.

**Authentication**: Required
**Authorization**: ADMIN or own user

**Path Parameters**

- `id` (UUID): User ID

**Response** `200 OK`

Returns single user object (same structure as list response).

**Error Responses**

- `403 Forbidden`: Cannot access other users' data (non-admin)
- `404 Not Found`: User not found

---

### PUT /api/v1/users/:id

Update user information.

**Authentication**: Required
**Authorization**: ADMIN or own user (role changes require ADMIN)

**Path Parameters**

- `id` (UUID): User ID

**Request Body** (all fields optional)

```json
{
  "email": "new.email@clinic.com",
  "first_name": "John",
  "last_name": "Smith-Jones",
  "phone": "+1-555-0124",
  "role": "ADMIN"
}
```

**Response** `200 OK`

Returns updated user object.

**Error Responses**

- `400 Bad Request`: No fields to update
- `403 Forbidden`: Cannot change role (non-admin)
- `404 Not Found`: User not found

---

### POST /api/v1/users/:id/activate

Activate a deactivated user account.

**Authentication**: Required
**Authorization**: ADMIN only

**Path Parameters**

- `id` (UUID): User ID

**Response** `200 OK`

Returns updated user object with `is_active: true`.

---

### POST /api/v1/users/:id/deactivate

Deactivate a user account (soft delete).

**Authentication**: Required
**Authorization**: ADMIN only

**Path Parameters**

- `id` (UUID): User ID

**Response** `200 OK`

Returns updated user object with `is_active: false`.

---

### POST /api/v1/users/:id/role

Assign or change user role.

**Authentication**: Required
**Authorization**: ADMIN only

**Path Parameters**

- `id` (UUID): User ID

**Request Body**

```json
{
  "role": "ADMIN"
}
```

**Response** `200 OK`

Returns updated user object.

---

### POST /api/v1/users/:id/reset-password

Reset user password (admin action).

**Authentication**: Required
**Authorization**: ADMIN only

**Path Parameters**

- `id` (UUID): User ID

**Request Body**

```json
{
  "new_password": "NewSecurePass123!"
}
```

**Response** `204 No Content`

**Error Responses**

- `400 Bad Request`: Invalid password complexity

---

### POST /api/v1/users/:id/reset-mfa

Reset user MFA (admin action). Disables MFA for the user, requiring them to re-enroll if needed.

**Authentication**: Required
**Authorization**: ADMIN only

**Path Parameters**

- `id` (UUID): User ID

**Response** `200 OK`

```json
{
  "message": "MFA reset successfully",
  "mfa_enabled": false
}
```

**Error Responses**

- `403 Forbidden`: Insufficient permissions (non-admin)
- `404 Not Found`: User not found

---

## Patient Management Endpoints

### POST /api/v1/patients

Create a new patient record.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Request Body**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "middle_name": "Michael",
  "date_of_birth": "1980-05-15",
  "gender": "M",
  "fiscal_code": "DOEJHN80E15H501A",
  "phone_primary": "+1-555-0123",
  "phone_secondary": "+1-555-0124",
  "email": "john.doe@email.com",
  "preferred_contact_method": "PHONE",
  "address_street": "123 Main St",
  "address_city": "Springfield",
  "address_state": "IL",
  "address_zip": "62701",
  "address_country": "US",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_relationship": "Spouse",
  "emergency_contact_phone": "+1-555-0125",
  "blood_type": "A+",
  "allergies": ["Penicillin", "Peanuts"],
  "chronic_conditions": ["Hypertension", "Type 2 Diabetes"],
  "health_card_expire": "2025-12-31",
  "notes": "Patient prefers morning appointments"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | Yes | Patient's first name |
| `last_name` | string | Yes | Patient's last name |
| `date_of_birth` | date | Yes | Date of birth (YYYY-MM-DD) |
| `gender` | enum | Yes | `M`, `F`, `OTHER`, `UNKNOWN` |
| `fiscal_code` | string | No | Italian fiscal code (unique) |
| `phone_primary` | string | No | Primary phone number |
| `email` | string | No | Email address |
| Other fields | various | No | See example above |

**Response** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "medical_record_number": "MRN-2024-0001",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1980-05-15",
  "gender": "M",
  "status": "ACTIVE",
  "created_at": "2024-11-01T10:30:00Z",
  "updated_at": "2024-11-01T10:30:00Z"
}
```

**Error Responses**

- `400 Bad Request`: Validation error
- `409 Conflict`: Patient with same fiscal code already exists

---

### GET /api/v1/patients

List all patients with pagination.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Number of results (1-100) |
| `offset` | integer | 0 | Pagination offset |

**Response** `200 OK`

```json
{
  "patients": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "medical_record_number": "MRN-2024-0001",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1980-05-15",
      "gender": "M",
      "fiscal_code": "DOEJHN80E15H501A",
      "phone_primary": "+1-555-0123",
      "email": "john.doe@email.com",
      "status": "ACTIVE",
      "created_at": "2024-11-01T10:30:00Z",
      "updated_at": "2024-11-01T10:30:00Z"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/v1/patients/search

Search patients with filters.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search by name, phone, MRN, or fiscal code |
| `status` | enum | Filter by status (`ACTIVE`, `INACTIVE`, `DECEASED`) |
| `gender` | enum | Filter by gender |
| `min_age` | integer | Minimum age filter |
| `max_age` | integer | Maximum age filter |
| `has_allergies` | boolean | Filter patients with allergies |
| `has_chronic_conditions` | boolean | Filter patients with chronic conditions |
| `has_insurance` | boolean | Filter patients with insurance |
| `limit` | integer | Number of results |
| `offset` | integer | Pagination offset |

**Response** `200 OK`

```json
{
  "patients": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "medical_record_number": "MRN-2024-0001",
      "first_name": "John",
      "last_name": "Doe",
      "...": "..."
    }
  ],
  "total": 5
}
```

---

### GET /api/v1/patients/statistics

Get patient statistics.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Response** `200 OK`

```json
{
  "total_patients": 1500,
  "active_patients": 1350,
  "inactive_patients": 120,
  "deceased_patients": 30,
  "patients_with_insurance": 1200,
  "patients_with_allergies": 450,
  "patients_with_chronic_conditions": 680,
  "new_patients_this_month": 25,
  "average_age": 52.5,
  "gender_distribution": {
    "M": 720,
    "F": 750,
    "OTHER": 20,
    "UNKNOWN": 10
  }
}
```

---

### GET /api/v1/patients/:id

Get complete patient details.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Patient ID

**Response** `200 OK`

Returns complete patient object including all fields (demographics, contact info, medical info, insurance, etc.).

**Error Responses**

- `404 Not Found`: Patient not found

---

### PUT /api/v1/patients/:id

Update patient information.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Patient ID

**Request Body** (all fields optional)

```json
{
  "phone_primary": "+1-555-0999",
  "email": "new.email@example.com",
  "address_street": "456 Oak Ave",
  "allergies": ["Penicillin", "Peanuts", "Shellfish"]
}
```

**Response** `200 OK`

Returns updated patient object.

---

### DELETE /api/v1/patients/:id

Deactivate patient (soft delete).

**Authentication**: Required
**Authorization**: ADMIN only

**Path Parameters**

- `id` (UUID): Patient ID

**Response** `204 No Content`

**Error Responses**

- `403 Forbidden`: Only administrators can delete patients
- `404 Not Found`: Patient not found

---

### POST /api/v1/patients/:id/reactivate

Reactivate a deactivated patient.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Patient ID

**Response** `200 OK`

Returns the reactivated patient object with `status: ACTIVE`.

**Error Responses**

- `400 Bad Request`: Patient is already active
- `404 Not Found`: Patient not found

---

### GET /api/v1/patients/:id/visits

Get all visits for a specific patient.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Patient ID

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Number of results (max 100) |
| `offset` | integer | 0 | Pagination offset |

**Response** `200 OK`

```json
{
  "visits": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "patient_id": "550e8400-e29b-41d4-a716-446655440010",
      "provider_id": "550e8400-e29b-41d4-a716-446655440000",
      "visit_date": "2024-10-15",
      "visit_type": "FOLLOW_UP",
      "status": "SIGNED",
      "...": "..."
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

---

### GET /api/v1/patients/:id/diagnoses

Get all diagnoses for a patient across visits.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Patient ID

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `active_only` | boolean | false | Filter active diagnoses only |

**Response** `200 OK`

Returns array of diagnosis objects.

---

### GET /api/v1/patients/:id/prescriptions

Get all prescriptions for a patient.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Patient ID

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `active_only` | boolean | false | Filter active prescriptions only |

**Response** `200 OK`

Returns array of prescription objects.

---

## Appointment Management Endpoints

### Appointment Status Workflow

Appointments follow a strict status workflow:

```
SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED (final)
    ↓           ↓            ↓
CANCELLED   CANCELLED   CANCELLED (final)
    ↓           ↓
NO_SHOW     NO_SHOW (final)
```

### Appointment Types

| Type | Default Duration | Description |
|------|-----------------|-------------|
| `NEW_PATIENT` | 60 min | New patient initial consultation |
| `FOLLOW_UP` | 30 min | Follow-up appointment |
| `URGENT` | 30 min | Urgent appointment |
| `CONSULTATION` | 45 min | Consultation appointment |
| `ROUTINE_CHECKUP` | 30 min | Routine checkup |
| `ACUPUNCTURE` | 45 min | Acupuncture session |

---

### GET /api/v1/appointments/availability

Check available appointment slots for a provider on a specific date.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider_id` | UUID | Yes | Provider UUID |
| `date` | DateTime | Yes | Date to check (ISO 8601) |
| `duration_minutes` | integer | Yes | Desired appointment duration (15-480) |

**Response** `200 OK`

```json
{
  "date": "2024-11-15T00:00:00Z",
  "provider_id": "550e8400-e29b-41d4-a716-446655440000",
  "slots": [
    {
      "start": "2024-11-15T08:00:00Z",
      "end": "2024-11-15T08:30:00Z",
      "available": true
    },
    {
      "start": "2024-11-15T08:30:00Z",
      "end": "2024-11-15T09:00:00Z",
      "available": false
    }
  ]
}
```

---

### POST /api/v1/appointments

Create a new appointment with automatic conflict detection.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Request Body**

```json
{
  "patient_id": "550e8400-e29b-41d4-a716-446655440010",
  "provider_id": "550e8400-e29b-41d4-a716-446655440000",
  "scheduled_start": "2024-11-15T09:00:00Z",
  "duration_minutes": 30,
  "type": "FOLLOW_UP",
  "reason": "Blood pressure check",
  "notes": "Patient requested early morning slot",
  "is_recurring": false,
  "recurring_pattern": null
}
```

**Recurring Appointment Pattern** (optional)

```json
{
  "recurring_pattern": {
    "frequency": "WEEKLY",
    "interval": 1,
    "end_date": "2025-02-15T00:00:00Z",
    "max_occurrences": 12
  }
}
```

| Field | Type | Values |
|-------|------|--------|
| `frequency` | enum | `DAILY`, `WEEKLY`, `BIWEEKLY`, `MONTHLY` |
| `interval` | integer | 1-52 |
| `end_date` | DateTime | Optional end date for series |
| `max_occurrences` | integer | Optional max appointments (1-100) |

**Response** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440030",
  "patient_id": "550e8400-e29b-41d4-a716-446655440010",
  "provider_id": "550e8400-e29b-41d4-a716-446655440000",
  "scheduled_start": "2024-11-15T09:00:00Z",
  "scheduled_end": "2024-11-15T09:30:00Z",
  "duration_minutes": 30,
  "type": "FOLLOW_UP",
  "status": "SCHEDULED",
  "confirmation_code": "APT-2024-0001",
  "created_at": "2024-11-14T10:00:00Z",
  "updated_at": "2024-11-14T10:00:00Z"
}
```

**Error Responses**

- `400 Bad Request`: Validation error, past date, invalid duration
- `404 Not Found`: Patient or provider not found
- `409 Conflict`: Scheduling conflict detected

---

### GET /api/v1/appointments

List appointments with filtering and pagination.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `patient_id` | UUID | Filter by patient |
| `provider_id` | UUID | Filter by provider |
| `status` | enum | Filter by status |
| `type` | enum | Filter by appointment type |
| `start_date` | DateTime | Filter appointments after this date |
| `end_date` | DateTime | Filter appointments before this date |
| `limit` | integer | Results per page (1-1000, default: 50) |
| `offset` | integer | Pagination offset (default: 0) |

**Response** `200 OK`

```json
{
  "appointments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "patient_id": "550e8400-e29b-41d4-a716-446655440010",
      "provider_id": "550e8400-e29b-41d4-a716-446655440000",
      "scheduled_start": "2024-11-15T09:00:00Z",
      "scheduled_end": "2024-11-15T09:30:00Z",
      "duration_minutes": 30,
      "type": "FOLLOW_UP",
      "status": "CONFIRMED",
      "reason": "Blood pressure check",
      "confirmation_code": "APT-2024-0001"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

### GET /api/v1/appointments/:id

Get appointment details by ID.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Appointment ID

**Response** `200 OK`

Returns full appointment object.

**Error Responses**

- `404 Not Found`: Appointment not found

---

### PUT /api/v1/appointments/:id

Update appointment details.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Appointment ID

**Request Body** (all fields optional)

```json
{
  "scheduled_start": "2024-11-15T10:00:00Z",
  "duration_minutes": 45,
  "type": "CONSULTATION",
  "reason": "Updated reason",
  "notes": "Rescheduled per patient request",
  "status": "CONFIRMED"
}
```

**Status Transition Rules**

- `SCHEDULED` → `CONFIRMED`, `CANCELLED`, `NO_SHOW`
- `CONFIRMED` → `IN_PROGRESS`, `CANCELLED`, `NO_SHOW`
- `IN_PROGRESS` → `COMPLETED`, `CANCELLED`
- `COMPLETED`, `CANCELLED`, `NO_SHOW` → Cannot be changed (final states)

**Response** `200 OK`

Returns updated appointment object.

**Error Responses**

- `400 Bad Request`: Invalid status transition
- `404 Not Found`: Appointment not found
- `409 Conflict`: Rescheduling conflict detected

---

### POST /api/v1/appointments/:id/cancel

Cancel an appointment with required cancellation reason.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Appointment ID

**Request Body**

```json
{
  "cancellation_reason": "Patient called to cancel due to illness"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cancellation_reason` | string | Yes | Reason for cancellation (1-2000 chars) |

**Response** `200 OK`

Returns appointment with status `CANCELLED`.

**Error Responses**

- `400 Bad Request`: Missing reason or invalid state
- `404 Not Found`: Appointment not found

---

### GET /api/v1/appointments/schedule/daily

Get all appointments for a provider on a specific date.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider_id` | UUID | Yes | Provider UUID |
| `date` | DateTime | Yes | Date to retrieve |

**Response** `200 OK`

Returns array of appointments sorted by `scheduled_start`.

---

### GET /api/v1/appointments/schedule/weekly

Get all appointments for a provider for the week containing the specified date.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider_id` | UUID | Yes | Provider UUID |
| `date` | DateTime | Yes | Any date within the target week |

**Response** `200 OK`

Returns array of appointments (Monday-Sunday).

---

### GET /api/v1/appointments/schedule/monthly

Get all appointments for a provider for the month containing the specified date.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider_id` | UUID | Yes | Provider UUID |
| `date` | DateTime | Yes | Any date within the target month |

**Response** `200 OK`

Returns array of appointments for the entire month.

---

### GET /api/v1/appointments/statistics

Get comprehensive appointment statistics.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Response** `200 OK`

```json
{
  "total": 1250,
  "by_status": {
    "SCHEDULED": 150,
    "CONFIRMED": 200,
    "IN_PROGRESS": 5,
    "COMPLETED": 800,
    "CANCELLED": 75,
    "NO_SHOW": 20
  },
  "by_type": {
    "NEW_PATIENT": 250,
    "FOLLOW_UP": 700,
    "URGENT": 100,
    "CONSULTATION": 150,
    "ROUTINE_CHECKUP": 30,
    "ACUPUNCTURE": 20
  },
  "upcoming_today": 15,
  "upcoming_week": 82,
  "no_show_rate": 1.6,
  "cancellation_rate": 6.0
}
```

---

## Visit Documentation Endpoints

### Visit Status Workflow

```
DRAFT → SIGNED → LOCKED
```

- **DRAFT**: Visit can be edited
- **SIGNED**: Visit is signed but can still be amended
- **LOCKED**: Visit is immutable

---

### POST /api/v1/visits

Create new visit documentation.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Request Body**

```json
{
  "patient_id": "550e8400-e29b-41d4-a716-446655440010",
  "provider_id": "550e8400-e29b-41d4-a716-446655440000",
  "appointment_id": "550e8400-e29b-41d4-a716-446655440030",
  "visit_date": "2024-11-15",
  "visit_type": "FOLLOW_UP",
  "chief_complaint": "Blood pressure follow-up",
  "subjective": "Patient reports feeling well, no headaches or dizziness...",
  "objective": "BP 120/80, HR 72, regular rhythm...",
  "assessment": "Hypertension well-controlled",
  "plan": "Continue current medications, follow-up in 3 months",
  "vitals": {
    "blood_pressure_systolic": 120,
    "blood_pressure_diastolic": 80,
    "heart_rate": 72,
    "temperature_celsius": 36.6,
    "weight_kg": 75,
    "height_cm": 175,
    "oxygen_saturation": 98,
    "respiratory_rate": 16
  },
  "physical_exam": "General: Well-appearing. CV: RRR, no murmurs...",
  "instructions": "Continue medications as prescribed"
}
```

**Response** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440040",
  "patient_id": "550e8400-e29b-41d4-a716-446655440010",
  "provider_id": "550e8400-e29b-41d4-a716-446655440000",
  "visit_date": "2024-11-15",
  "visit_type": "FOLLOW_UP",
  "status": "DRAFT",
  "version": 1,
  "created_at": "2024-11-15T09:45:00Z",
  "updated_at": "2024-11-15T09:45:00Z"
}
```

---

### GET /api/v1/visits

List visits with filtering and pagination.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `patient_id` | UUID | Filter by patient |
| `provider_id` | UUID | Filter by provider |
| `visit_type` | enum | Filter by visit type |
| `status` | enum | Filter by status (`DRAFT`, `SIGNED`, `LOCKED`) |
| `date_from` | date | Filter visits after this date (YYYY-MM-DD) |
| `date_to` | date | Filter visits before this date |
| `limit` | integer | Results per page (default: 20, max: 100) |
| `offset` | integer | Pagination offset |

**Response** `200 OK`

```json
{
  "visits": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440040",
      "patient_id": "550e8400-e29b-41d4-a716-446655440010",
      "provider_id": "550e8400-e29b-41d4-a716-446655440000",
      "visit_date": "2024-11-15",
      "visit_type": "FOLLOW_UP",
      "status": "SIGNED",
      "...": "..."
    }
  ],
  "total": 250,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/v1/visits/statistics

Get visit statistics.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Response** `200 OK`

```json
{
  "total_visits": 1500,
  "by_status": {
    "DRAFT": 50,
    "SIGNED": 1200,
    "LOCKED": 250
  },
  "by_type": {
    "NEW_PATIENT": 300,
    "FOLLOW_UP": 900,
    "URGENT": 150,
    "CONSULTATION": 100,
    "ROUTINE_CHECKUP": 30,
    "ACUPUNCTURE": 20
  },
  "visits_this_month": 85,
  "visits_this_week": 22,
  "average_visits_per_day": 4.2
}
```

---

### GET /api/v1/visits/:id

Get visit details with full clinical documentation.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Visit ID

**Response** `200 OK`

Returns complete visit object including SOAP notes, vitals, diagnoses, and prescriptions.

---

### PUT /api/v1/visits/:id

Update visit (only DRAFT visits can be updated).

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Visit ID

**Request Body** (all fields optional)

```json
{
  "subjective": "Updated subjective notes...",
  "objective": "Updated objective findings...",
  "assessment": "Updated assessment...",
  "plan": "Updated treatment plan...",
  "vitals": {
    "blood_pressure_systolic": 118,
    "blood_pressure_diastolic": 78
  }
}
```

**Response** `200 OK`

Returns updated visit object. Creates a new version in history.

**Error Responses**

- `400 Bad Request`: Cannot edit visit (not DRAFT status)

---

### DELETE /api/v1/visits/:id

Delete visit (only DRAFT visits can be deleted).

**Authentication**: Required
**Authorization**: ADMIN only

**Path Parameters**

- `id` (UUID): Visit ID

**Response** `204 No Content`

**Error Responses**

- `400 Bad Request`: Cannot delete visit (not DRAFT status)
- `403 Forbidden`: Only administrators can delete visits

---

### POST /api/v1/visits/:id/sign

Digitally sign visit note (DRAFT → SIGNED).

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Visit ID

**Response** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440040",
  "status": "SIGNED",
  "signed_at": "2024-11-15T10:00:00Z",
  "signed_by": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**

- `400 Bad Request`: Cannot sign visit (not DRAFT status)

---

### POST /api/v1/visits/:id/lock

Lock visit note (SIGNED → LOCKED).

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Visit ID

**Response** `200 OK`

Returns visit with status `LOCKED`.

**Error Responses**

- `400 Bad Request`: Cannot lock visit (not SIGNED status)

---

### GET /api/v1/visits/:id/diagnoses

Get all diagnoses for a specific visit.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Visit ID

**Response** `200 OK`

Returns array of diagnosis objects.

---

### GET /api/v1/visits/:id/prescriptions

Get all prescriptions for a specific visit.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Visit ID

**Response** `200 OK`

Returns array of prescription objects.

---

## Diagnosis Management Endpoints

### POST /api/v1/diagnoses

Create a new diagnosis for a visit.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Request Body**

```json
{
  "visit_id": "550e8400-e29b-41d4-a716-446655440040",
  "icd10_code": "I10",
  "description": "Essential hypertension",
  "is_primary": true,
  "diagnosis_date": "2024-11-15",
  "status": "ACTIVE",
  "notes": "Well-controlled with medication"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `visit_id` | UUID | Yes | Associated visit ID |
| `icd10_code` | string | Yes | ICD-10 diagnosis code |
| `description` | string | Yes | Diagnosis description |
| `is_primary` | boolean | No | Primary diagnosis flag (default: false) |
| `diagnosis_date` | date | No | Date of diagnosis |
| `status` | enum | No | `ACTIVE`, `RESOLVED`, `CHRONIC` |
| `notes` | string | No | Additional notes |

**Response** `201 Created`

Returns created diagnosis object.

---

### GET /api/v1/diagnoses/icd10/search

Search ICD-10 diagnosis codes.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term |
| `limit` | integer | No | Max results (default: 20) |

**Response** `200 OK`

```json
[
  {
    "code": "I10",
    "description": "Essential (primary) hypertension"
  },
  {
    "code": "I11",
    "description": "Hypertensive heart disease"
  }
]
```

---

### GET /api/v1/diagnoses/:id

Get diagnosis details.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Diagnosis ID

**Response** `200 OK`

Returns diagnosis object.

---

### PUT /api/v1/diagnoses/:id

Update diagnosis.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Diagnosis ID

**Request Body** (all fields optional)

```json
{
  "status": "RESOLVED",
  "notes": "Resolved with treatment"
}
```

**Response** `200 OK`

Returns updated diagnosis object.

---

### DELETE /api/v1/diagnoses/:id

Delete diagnosis.

**Authentication**: Required
**Authorization**: ADMIN only

**Path Parameters**

- `id` (UUID): Diagnosis ID

**Response** `204 No Content`

---

## Prescription Management Endpoints

### GET /api/v1/prescriptions

List prescriptions with optional filters and pagination.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status (ACTIVE, COMPLETED, CANCELLED, DISCONTINUED, ON_HOLD) |
| `patient_id` | UUID | No | Filter by patient |
| `start_date` | string | No | Filter from date (YYYY-MM-DD format) |
| `end_date` | string | No | Filter to date (YYYY-MM-DD format) |
| `limit` | integer | No | Max results (default: 20, max: 100) |
| `offset` | integer | No | Pagination offset (default: 0) |

**Response** `200 OK`

```json
{
  "prescriptions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440050",
      "patient_id": "550e8400-e29b-41d4-a716-446655440010",
      "provider_id": "550e8400-e29b-41d4-a716-446655440001",
      "visit_id": "550e8400-e29b-41d4-a716-446655440040",
      "medication_name": "Lisinopril",
      "generic_name": "Lisinopril",
      "dosage": "10mg",
      "form": "Tablet",
      "route": "Oral",
      "frequency": "Once daily",
      "duration": "90 days",
      "quantity": 90,
      "refills": 2,
      "instructions": "Take in the morning with food",
      "prescribed_date": "2024-11-15",
      "start_date": "2024-11-15",
      "end_date": "2025-02-13",
      "status": "ACTIVE",
      "patient_name": "John Doe",
      "provider_name": "Dr. Smith",
      "created_at": "2024-11-15T10:00:00Z",
      "updated_at": "2024-11-15T10:00:00Z"
    }
  ],
  "total": 15
}
```

---

### POST /api/v1/prescriptions

Create a new prescription.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Request Body**

```json
{
  "patient_id": "550e8400-e29b-41d4-a716-446655440010",
  "visit_id": "550e8400-e29b-41d4-a716-446655440040",
  "medication_name": "Lisinopril",
  "generic_name": "Lisinopril",
  "dosage": "10mg",
  "form": "Tablet",
  "route": "Oral",
  "frequency": "Once daily",
  "duration": "90 days",
  "quantity": 90,
  "refills": 2,
  "instructions": "Take in the morning with food",
  "prescribed_date": "2024-11-15",
  "start_date": "2024-11-15",
  "end_date": "2025-02-13"
}
```

**Response** `201 Created`

Returns created prescription object.

---

### GET /api/v1/prescriptions/medications/search

Search medications database.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term |
| `limit` | integer | No | Max results (default: 20) |

**Response** `200 OK`

```json
[
  {
    "name": "Lisinopril",
    "generic_name": "Lisinopril",
    "forms": ["Tablet", "Oral Solution"],
    "strengths": ["2.5mg", "5mg", "10mg", "20mg", "40mg"]
  }
]
```

**Notes**:
- Searches the AIFA (Italian Medicines Agency) medications database
- Supports fuzzy matching using trigram similarity
- Results include both brand names and generic names
- Database contains ~2,600+ Italian medications with ATC codes

---

### POST /api/v1/prescriptions/medications/custom

Create a custom medication entry for medications not found in the AIFA database.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Request Body**

```json
{
  "name": "Custom Medication Name",
  "generic_name": "Generic Name (optional)",
  "form": "Tablet",
  "dosages": "10mg, 20mg, 50mg"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Medication brand/trade name |
| `generic_name` | string | No | Generic/active ingredient name |
| `form` | string | No | Pharmaceutical form (tablet, capsule, etc.) |
| `dosages` | string | No | Common dosage strengths |

**Response** `201 Created`

```json
{
  "id": "uuid",
  "name": "Custom Medication Name",
  "generic_name": "Generic Name",
  "form": "Tablet",
  "dosages": "10mg, 20mg, 50mg",
  "source": "CUSTOM",
  "created_by": "uuid",
  "created_at": "2026-01-05T12:00:00Z"
}
```

**Notes**:
- Custom medications are marked with `source = 'CUSTOM'` and linked to the creating user
- Useful for compounding medications, foreign medications, or specialized preparations
- Custom medications appear in search results alongside AIFA medications
- Requires audit logging for compliance

---

### GET /api/v1/prescriptions/:id

Get prescription details.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Prescription ID

**Response** `200 OK`

Returns prescription object.

---

### PUT /api/v1/prescriptions/:id

Update prescription.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Prescription ID

**Request Body** (all fields optional)

```json
{
  "dosage": "20mg",
  "instructions": "Take twice daily"
}
```

**Response** `200 OK`

Returns updated prescription object.

---

### POST /api/v1/prescriptions/:id/discontinue

Discontinue a prescription. Used when stopping a prescription early for medical reasons.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Prescription ID

**Request Body**

```json
{
  "reason": "Patient experienced side effects"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Discontinuation reason (1-500 chars) |

**Response** `200 OK`

Returns prescription with status `DISCONTINUED`.

**Error Responses**

- `400 Bad Request`: Cannot discontinue (invalid current status)

---

### POST /api/v1/prescriptions/:id/cancel

Cancel a prescription. Used when voiding a prescription before it has been dispensed (e.g., wrong medication, duplicate order).

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Prescription ID

**Request Body** (optional)

```json
{
  "reason": "Duplicate order"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | No | Optional cancellation reason |

**Response** `200 OK`

Returns prescription with status `CANCELLED`.

**Valid Transitions**

- ACTIVE → CANCELLED

**Error Responses**

- `400 Bad Request`: Cannot cancel (invalid current status - must be ACTIVE)
- `404 Not Found`: Prescription not found

---

### POST /api/v1/prescriptions/:id/hold

Put a prescription on hold. Used when temporarily pausing a prescription (e.g., awaiting lab results, surgery preparation).

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Prescription ID

**Request Body**

```json
{
  "reason": "Awaiting lab results before continuing medication"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Reason for putting on hold (1-500 chars) |

**Response** `200 OK`

Returns prescription with status `ON_HOLD`.

**Valid Transitions**

- ACTIVE → ON_HOLD

**Error Responses**

- `400 Bad Request`: Cannot put on hold (invalid current status - must be ACTIVE)
- `400 Bad Request`: Reason is required
- `404 Not Found`: Prescription not found

---

### POST /api/v1/prescriptions/:id/resume

Resume a prescription that was on hold. Returns the prescription to ACTIVE status.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Prescription ID

**Request Body**: None required

**Response** `200 OK`

Returns prescription with status `ACTIVE`.

**Valid Transitions**

- ON_HOLD → ACTIVE

**Error Responses**

- `400 Bad Request`: Cannot resume (invalid current status - must be ON_HOLD)
- `404 Not Found`: Prescription not found

---

### POST /api/v1/prescriptions/:id/complete

Mark a prescription as completed. Used when the full course of medication has been taken as prescribed.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Prescription ID

**Request Body**: None required

**Response** `200 OK`

Returns prescription with status `COMPLETED`.

**Valid Transitions**

- ACTIVE → COMPLETED

**Error Responses**

- `400 Bad Request`: Cannot complete (invalid current status - must be ACTIVE)
- `404 Not Found`: Prescription not found

---

### DELETE /api/v1/prescriptions/:id

Delete prescription.

**Authentication**: Required
**Authorization**: ADMIN only

**Path Parameters**

- `id` (UUID): Prescription ID

**Response** `204 No Content`

---

## Visit Template Endpoints

Visit templates allow providers to save reusable SOAP note templates.

### POST /api/v1/visit-templates

Create a new visit template.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Request Body**

```json
{
  "name": "Hypertension Follow-up",
  "description": "Standard template for hypertension follow-up visits",
  "visit_type": "FOLLOW_UP",
  "subjective_template": "Patient presents for hypertension follow-up. Reports: [compliance with medications], [symptoms]...",
  "objective_template": "Vitals: BP [X]/[X], HR [X]\nGeneral: [appearance]\nCV: [findings]...",
  "assessment_template": "Hypertension: [controlled/uncontrolled]",
  "plan_template": "1. Continue current medications\n2. Follow-up in [X] months",
  "is_active": true
}
```

**Response** `201 Created`

Returns created template object.

---

### GET /api/v1/visit-templates

List visit templates for current user.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `active_only` | boolean | true | Filter active templates only |

**Response** `200 OK`

Returns array of template objects.

---

### GET /api/v1/visit-templates/:id

Get visit template details.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Template ID

**Response** `200 OK`

Returns template object.

---

### PUT /api/v1/visit-templates/:id

Update visit template.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR (must own template or be ADMIN)

**Path Parameters**

- `id` (UUID): Template ID

**Request Body** (all fields optional)

```json
{
  "name": "Updated Template Name",
  "plan_template": "Updated plan template..."
}
```

**Response** `200 OK`

Returns updated template object.

**Error Responses**

- `403 Forbidden`: Cannot modify other users' templates (non-admin)

---

### DELETE /api/v1/visit-templates/:id

Delete visit template (soft delete).

**Authentication**: Required
**Authorization**: ADMIN only

**Path Parameters**

- `id` (UUID): Template ID

**Response** `204 No Content`

---

## Prescription Template Endpoints

Prescription templates allow providers to save reusable prescription configurations.

### POST /api/v1/prescription-templates

Create a new prescription template.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Request Body**

```json
{
  "name": "Lisinopril 10mg Daily",
  "description": "Standard hypertension treatment starting dose",
  "medication_name": "Lisinopril",
  "generic_name": "Lisinopril",
  "dosage": "10mg",
  "form": "Tablet",
  "route": "Oral",
  "frequency": "Once daily in the morning",
  "duration": "90 days",
  "quantity": 90,
  "refills": 2,
  "instructions": "Take in the morning with food. Avoid potassium supplements.",
  "is_active": true
}
```

**Response** `201 Created`

Returns created template object.

---

### GET /api/v1/prescription-templates

List prescription templates for current user.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `active_only` | boolean | true | Filter active templates only |

**Response** `200 OK`

Returns array of template objects.

---

### GET /api/v1/prescription-templates/:id

Get prescription template details.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Template ID

**Response** `200 OK`

Returns template object.

---

### PUT /api/v1/prescription-templates/:id

Update prescription template.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR (must own template or be ADMIN)

**Path Parameters**

- `id` (UUID): Template ID

**Request Body** (all fields optional)

```json
{
  "dosage": "20mg",
  "instructions": "Updated instructions..."
}
```

**Response** `200 OK`

Returns updated template object.

---

### DELETE /api/v1/prescription-templates/:id

Delete prescription template (soft delete).

**Authentication**: Required
**Authorization**: ADMIN only

**Path Parameters**

- `id` (UUID): Template ID

**Response** `204 No Content`

---

## Visit Version History Endpoints

Visit versions track the complete history of changes to a visit.

### GET /api/v1/visits/:visit_id/versions

Get all versions for a visit.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `visit_id` (UUID): Visit ID

**Response** `200 OK`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440050",
    "visit_id": "550e8400-e29b-41d4-a716-446655440040",
    "version_number": 1,
    "changed_by": "550e8400-e29b-41d4-a716-446655440000",
    "change_reason": "Initial creation",
    "created_at": "2024-11-15T09:45:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440051",
    "visit_id": "550e8400-e29b-41d4-a716-446655440040",
    "version_number": 2,
    "changed_by": "550e8400-e29b-41d4-a716-446655440000",
    "change_reason": "Updated assessment",
    "created_at": "2024-11-15T10:00:00Z"
  }
]
```

---

### GET /api/v1/visits/:visit_id/versions/:version_number

Get a specific version of a visit.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `visit_id` (UUID): Visit ID
- `version_number` (integer): Version number

**Response** `200 OK`

Returns complete visit data as it was at that version.

**Error Responses**

- `404 Not Found`: Version not found

---

### POST /api/v1/visits/:visit_id/versions/:version_number/restore

Restore a visit to a previous version.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `visit_id` (UUID): Visit ID
- `version_number` (integer): Version to restore to

**Response** `200 OK`

Returns the restored visit object. Creates a new version recording the restoration.

**Error Responses**

- `400 Bad Request`: Cannot restore visit (not DRAFT status)
- `404 Not Found`: Version not found

---

## Reports & Analytics Endpoints

Reports provide comprehensive analytics on appointments, patients, diagnoses, productivity, and revenue.

### GET /api/v1/reports/appointments

Get appointment utilization report.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `start_date` (string, optional): Start date (YYYY-MM-DD)
- `end_date` (string, optional): End date (YYYY-MM-DD)
- `provider_id` (UUID, optional): Filter by provider

**Response** `200 OK`

```json
{
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  },
  "total_appointments": 450,
  "completed_appointments": 380,
  "cancelled_appointments": 45,
  "no_show_appointments": 25,
  "utilization_rate": 84.4,
  "by_type": [
    { "type": "NEW_PATIENT", "count": 120 },
    { "type": "FOLLOW_UP", "count": 280 },
    { "type": "ACUPUNCTURE", "count": 50 }
  ],
  "by_day_of_week": [
    { "day": "Monday", "count": 95 },
    { "day": "Tuesday", "count": 88 }
  ]
}
```

---

### GET /api/v1/reports/patients

Get patient statistics report.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `start_date` (string, optional): Start date (YYYY-MM-DD)
- `end_date` (string, optional): End date (YYYY-MM-DD)

**Response** `200 OK`

```json
{
  "total_patients": 1250,
  "new_patients_this_period": 45,
  "active_patients": 980,
  "inactive_patients": 270,
  "by_gender": {
    "M": 580,
    "F": 620,
    "OTHER": 30,
    "UNKNOWN": 20
  },
  "by_age_group": [
    { "group": "0-18", "count": 45 },
    { "group": "19-35", "count": 180 },
    { "group": "36-50", "count": 320 },
    { "group": "51-65", "count": 380 },
    { "group": "65+", "count": 325 }
  ],
  "average_age": 52.3
}
```

---

### GET /api/v1/reports/diagnoses

Get diagnosis trends report.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `start_date` (string, optional): Start date (YYYY-MM-DD)
- `end_date` (string, optional): End date (YYYY-MM-DD)
- `provider_id` (UUID, optional): Filter by provider
- `limit` (integer, optional): Limit results (default: 10)

**Response** `200 OK`

```json
{
  "total_diagnoses": 1850,
  "top_diagnoses": [
    {
      "icd10_code": "I10",
      "description": "Essential hypertension",
      "count": 245
    },
    {
      "icd10_code": "E11",
      "description": "Type 2 diabetes mellitus",
      "count": 180
    }
  ],
  "by_category": [
    { "category": "Cardiovascular", "count": 420 },
    { "category": "Metabolic", "count": 380 }
  ]
}
```

---

### GET /api/v1/reports/productivity

Get provider productivity report.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `start_date` (string, optional): Start date (YYYY-MM-DD)
- `end_date` (string, optional): End date (YYYY-MM-DD)
- `provider_id` (UUID, optional): Filter by provider

**Response** `200 OK`

```json
{
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  },
  "total_visits": 380,
  "total_appointments": 420,
  "completion_rate": 90.5,
  "average_visit_duration_minutes": 28,
  "visits_per_day_average": 8.2,
  "by_provider": [
    {
      "provider_id": "550e8400-e29b-41d4-a716-446655440000",
      "provider_name": "Dr. Smith",
      "visits": 380,
      "appointments": 420
    }
  ]
}
```

---

### GET /api/v1/reports/revenue

Get revenue report.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `start_date` (string, optional): Start date (YYYY-MM-DD)
- `end_date` (string, optional): End date (YYYY-MM-DD)
- `provider_id` (UUID, optional): Filter by provider

**Response** `200 OK`

```json
{
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  },
  "total_revenue": 125000.00,
  "by_service_type": [
    { "type": "CONSULTATION", "amount": 85000.00 },
    { "type": "ACUPUNCTURE", "amount": 40000.00 }
  ],
  "by_month": [
    { "month": "2024-01", "amount": 10500.00 },
    { "month": "2024-02", "amount": 11200.00 }
  ]
}
```

---

### GET /api/v1/reports/dashboard

Get dashboard summary report.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Response** `200 OK`

```json
{
  "today": {
    "appointments_scheduled": 12,
    "appointments_completed": 8,
    "patients_seen": 8,
    "new_patients": 2
  },
  "this_week": {
    "appointments_scheduled": 45,
    "appointments_completed": 38,
    "patients_seen": 38,
    "new_patients": 8
  },
  "this_month": {
    "appointments_scheduled": 180,
    "appointments_completed": 160,
    "patients_seen": 155,
    "new_patients": 28
  },
  "upcoming_appointments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "patient_name": "John Doe",
      "scheduled_start": "2024-11-15T10:00:00Z",
      "type": "FOLLOW_UP"
    }
  ]
}
```

---

### POST /api/v1/reports/export

Export report in various formats.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Request Body**

```json
{
  "report_type": "appointment_utilization",
  "format": "pdf",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "provider_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Report Types**
- `appointment_utilization`
- `patient_statistics`
- `diagnosis_trends`
- `provider_productivity`
- `revenue`
- `dashboard`

**Export Formats**
- `json`
- `csv`
- `pdf`
- `excel`

**Response** `200 OK`

Returns file download with appropriate Content-Type header.

---

## Settings Endpoints

System settings for practice configuration. Settings are organized by groups (clinic, security, notifications, system, etc.).

### GET /api/v1/settings

List all settings.

**Authentication**: Required
**Authorization**: ADMIN (non-admins see only public settings)

**Query Parameters**

- `group` (string, optional): Filter by group (clinic, security, notifications, system)
- `public_only` (boolean, optional): Only return public settings
- `search` (string, optional): Search settings by key or name

**Response** `200 OK`

```json
{
  "settings": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "setting_key": "clinic.name",
      "setting_group": "clinic",
      "setting_name": "Practice Name",
      "setting_value": "Medical Practice",
      "value_type": "STRING",
      "description": "Name of the medical practice",
      "default_value": "",
      "is_public": true,
      "is_readonly": false,
      "updated_at": "2024-11-15T10:00:00Z"
    }
  ],
  "total": 45
}
```

---

### GET /api/v1/settings/groups

List all setting groups.

**Authentication**: Required
**Authorization**: ADMIN

**Response** `200 OK`

```json
{
  "groups": [
    {
      "key": "clinic",
      "name": "Clinic Settings",
      "setting_count": 12
    },
    {
      "key": "appointment",
      "name": "Appointment Settings",
      "setting_count": 5
    },
    {
      "key": "security",
      "name": "Security Settings",
      "setting_count": 8
    },
    {
      "key": "localization",
      "name": "Localization Settings",
      "setting_count": 5
    },
    {
      "key": "notification",
      "name": "Notification Settings",
      "setting_count": 6
    },
    {
      "key": "backup",
      "name": "Backup Settings",
      "setting_count": 4
    },
    {
      "key": "system",
      "name": "System Settings",
      "setting_count": 10
    }
  ]
}
```

---

### GET /api/v1/settings/group/:group

Get settings for a specific group.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `group` (string): Setting group name

**Response** `200 OK`

Returns array of settings in the specified group.

---

### GET /api/v1/settings/:key

Get a specific setting by key.

**Authentication**: Required
**Authorization**: ADMIN (or authenticated user for public settings)

**Path Parameters**

- `key` (string): Setting key (e.g., "clinic.name")

**Response** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "setting_key": "clinic.name",
  "setting_group": "clinic",
  "setting_name": "Practice Name",
  "setting_value": "Medical Practice",
  "value_type": "STRING",
  "description": "Name of the medical practice",
  "default_value": "",
  "is_public": true,
  "is_readonly": false,
  "updated_at": "2024-11-15T10:00:00Z"
}
```

---

### PUT /api/v1/settings/:key

Update a setting value.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `key` (string): Setting key

**Request Body**

```json
{
  "value": "New Practice Name"
}
```

Note: The `value` field must match the setting's `value_type`. For example:
- `STRING`: `"value": "text value"`
- `INTEGER`: `"value": 30`
- `BOOLEAN`: `"value": true`
- `JSON`: `"value": {"key": "value"}`

**Response** `200 OK`

Returns updated setting object.

**Error Responses**

- `400 Bad Request`: Invalid value type or validation failed
- `400 Bad Request`: Setting is readonly (READONLY_SETTING)
- `404 Not Found`: Setting not found

---

### POST /api/v1/settings/bulk

Bulk update multiple settings.

**Authentication**: Required
**Authorization**: ADMIN

**Request Body**

```json
{
  "settings": [
    {
      "key": "clinic.name",
      "value": "Updated Practice Name"
    },
    {
      "key": "clinic.phone",
      "value": "+1-555-123-4567"
    }
  ]
}
```

**Response** `200 OK`

Returns array of updated setting objects:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "setting_key": "clinic.name",
    "setting_group": "clinic",
    "setting_name": "Practice Name",
    "setting_value": "Updated Practice Name",
    "value_type": "STRING",
    "description": "Name of the medical practice",
    "default_value": "",
    "is_public": true,
    "is_readonly": false,
    "created_at": "2024-11-15T10:00:00Z",
    "updated_at": "2024-11-15T11:00:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "setting_key": "clinic.phone",
    "setting_group": "clinic",
    "setting_name": "Practice Phone",
    "setting_value": "+1-555-123-4567",
    "value_type": "STRING",
    "description": "Primary phone number",
    "default_value": "",
    "is_public": true,
    "is_readonly": false,
    "created_at": "2024-11-15T10:00:00Z",
    "updated_at": "2024-11-15T11:00:00Z"
  }
]
```

**Error Responses**

- `400 Bad Request`: At least one setting is required
- `400 Bad Request`: Bulk update failed (one or more settings failed)

---

### POST /api/v1/settings/reset/:key

Reset a setting to its default value.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `key` (string): Setting key

**Response** `200 OK`

Returns setting object with default value restored.

---

## Working Hours Endpoints

Manage practice working hours schedule and overrides for holidays or special days.

### GET /api/v1/working-hours

Get the weekly working hours schedule.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Response** `200 OK`

```json
{
  "days": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "day_of_week": "MONDAY",
      "day_name": "Monday",
      "is_working_day": true,
      "start_time": "09:00",
      "end_time": "18:00",
      "break_start": "13:00",
      "break_end": "14:00",
      "updated_at": "2024-11-15T10:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "day_of_week": "TUESDAY",
      "day_name": "Tuesday",
      "is_working_day": true,
      "start_time": "09:00",
      "end_time": "18:00",
      "break_start": "13:00",
      "break_end": "14:00",
      "updated_at": "2024-11-15T10:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440006",
      "day_of_week": "SATURDAY",
      "day_name": "Saturday",
      "is_working_day": false,
      "start_time": null,
      "end_time": null,
      "break_start": null,
      "break_end": null,
      "updated_at": "2024-11-15T10:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440007",
      "day_of_week": "SUNDAY",
      "day_name": "Sunday",
      "is_working_day": false,
      "start_time": null,
      "end_time": null,
      "break_start": null,
      "break_end": null,
      "updated_at": "2024-11-15T10:00:00Z"
    }
  ]
}
```

Note: Time format is HH:MM (24-hour). Day of week uses ISO 8601: Monday=1, Sunday=7.

---

### PUT /api/v1/working-hours

Update the entire weekly working hours schedule.

**Authentication**: Required
**Authorization**: ADMIN

**Request Body**

```json
{
  "days": [
    {
      "day_of_week": 1,
      "is_working_day": true,
      "start_time": "08:00",
      "end_time": "17:00",
      "break_start": "12:30",
      "break_end": "13:30"
    },
    {
      "day_of_week": 6,
      "is_working_day": false,
      "start_time": null,
      "end_time": null,
      "break_start": null,
      "break_end": null
    }
  ]
}
```

Note: Include all 7 days for a complete bulk update, or only the days you want to change.

**Response** `200 OK`

Returns updated weekly schedule.

---

### PUT /api/v1/working-hours/:day

Update working hours for a specific day.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `day` (integer): Day of week (1=Monday, 7=Sunday)

**Request Body**

```json
{
  "day_of_week": 1,
  "is_working_day": true,
  "start_time": "08:00",
  "end_time": "18:00",
  "break_start": "13:00",
  "break_end": "14:00"
}
```

Note: `day_of_week` in request body must match path parameter.

**Response** `200 OK`

Returns updated day schedule object:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "day_of_week": "MONDAY",
  "day_name": "Monday",
  "is_working_day": true,
  "start_time": "08:00",
  "end_time": "18:00",
  "break_start": "13:00",
  "break_end": "14:00",
  "updated_at": "2024-11-15T11:00:00Z"
}
```

**Error Responses**

- `400 Bad Request`: Invalid day (INVALID_DAY) - Day must be between 1 and 7
- `400 Bad Request`: Invalid time format or range (INVALID_TIME)

---

### GET /api/v1/working-hours/effective

Get effective working hours for a date range (combines default schedule with overrides).

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `from_date` (string, required): Start date (YYYY-MM-DD)
- `to_date` (string, required): End date (YYYY-MM-DD, max 90 days range)

**Response** `200 OK`

```json
{
  "from_date": "2024-12-01",
  "to_date": "2024-12-31",
  "days": [
    {
      "date": "2024-12-25",
      "day_of_week": 3,
      "day_name": "Wednesday",
      "is_working_day": false,
      "start_time": null,
      "end_time": null,
      "break_start": null,
      "break_end": null,
      "is_override": true,
      "source": "OVERRIDE"
    },
    {
      "date": "2024-12-26",
      "day_of_week": 4,
      "day_name": "Thursday",
      "is_working_day": true,
      "start_time": "09:00",
      "end_time": "18:00",
      "break_start": "13:00",
      "break_end": "14:00",
      "is_override": false,
      "source": "DEFAULT"
    }
  ]
}
```

---

### GET /api/v1/working-hours/check/:date

Check if a specific date is a working day.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `date` (string): Date to check (YYYY-MM-DD)

**Response** `200 OK`

```json
{
  "date": "2024-12-25",
  "is_working_day": false
}
```

---

### GET /api/v1/working-hours/overrides

List working hours overrides.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `from_date` (string, optional): Start date filter
- `to_date` (string, optional): End date filter
- `override_type` (string, optional): Filter by type (CLOSED, CUSTOM_HOURS, EXTENDED_HOURS)
- `future_only` (boolean, optional): Only return future overrides

**Response** `200 OK`

```json
{
  "overrides": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "override_date": "2024-12-25",
      "override_type": "CLOSED",
      "start_time": null,
      "end_time": null,
      "break_start": null,
      "break_end": null,
      "reason": "Christmas Day",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "override_date": "2024-12-31",
      "override_type": "CUSTOM_HOURS",
      "start_time": "09:00",
      "end_time": "13:00",
      "break_start": null,
      "break_end": null,
      "reason": "New Year's Eve - Half day",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 12
}
```

---

### POST /api/v1/working-hours/overrides

Create a working hours override.

**Authentication**: Required
**Authorization**: ADMIN

**Request Body**

```json
{
  "override_date": "2024-12-31",
  "override_type": "CUSTOM_HOURS",
  "start_time": "09:00",
  "end_time": "13:00",
  "break_start": null,
  "break_end": null,
  "reason": "New Year's Eve - Half day"
}
```

**Override Types**
- `CLOSED` - Practice closed (no start_time/end_time required)
- `CUSTOM_HOURS` - Custom working hours (start_time and end_time required)
- `EXTENDED_HOURS` - Extended working hours (start_time and end_time required)

Note: `override_date` must be today or in the future. For `CLOSED` type, times are optional (can be null).

**Response** `201 Created`

Returns created override object:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "override_date": "2024-12-31",
  "override_type": "CUSTOM_HOURS",
  "start_time": "09:00",
  "end_time": "13:00",
  "break_start": null,
  "break_end": null,
  "reason": "New Year's Eve - Half day",
  "created_at": "2024-11-15T10:00:00Z",
  "updated_at": "2024-11-15T10:00:00Z"
}
```

**Error Responses**

- `400 Bad Request`: Date must be today or in the future
- `400 Bad Request`: Invalid time format or range
- `409 Conflict`: Override already exists for this date (DUPLICATE_DATE)

---

### GET /api/v1/working-hours/overrides/:id

Get a specific working hours override.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Override ID

**Response** `200 OK`

Returns override object.

---

### PUT /api/v1/working-hours/overrides/:id

Update a working hours override.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `id` (UUID): Override ID

**Request Body**

All fields are optional:

```json
{
  "override_type": "CUSTOM_HOURS",
  "start_time": "09:00",
  "end_time": "14:00",
  "break_start": null,
  "break_end": null,
  "reason": "Updated reason"
}
```

**Response** `200 OK`

Returns updated override object.

**Error Responses**

- `400 Bad Request`: Cannot modify past date overrides
- `400 Bad Request`: Invalid time format or range
- `404 Not Found`: Override not found

---

### DELETE /api/v1/working-hours/overrides/:id

Delete a working hours override.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `id` (UUID): Override ID

**Response** `204 No Content`

---

## Holidays Endpoints

Manage practice holidays (national holidays, practice closures, vacations).

### GET /api/v1/holidays

List holidays.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `from_date` (string, optional): Start date filter
- `to_date` (string, optional): End date filter
- `holiday_type` (string, optional): Filter by type (NATIONAL, PRACTICE_CLOSED, VACATION)
- `year` (integer, optional): Filter by year
- `include_recurring` (boolean, optional): Include recurring holidays

**Response** `200 OK`

```json
{
  "holidays": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "holiday_date": "2024-12-25",
      "name": "Natale",
      "holiday_type": "NATIONAL",
      "holiday_type_display": "National Holiday",
      "is_recurring": true,
      "notes": "National holiday - Christmas Day",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "holiday_date": "2024-08-15",
      "name": "Ferragosto",
      "holiday_type": "NATIONAL",
      "holiday_type_display": "National Holiday",
      "is_recurring": true,
      "notes": "Assumption of Mary",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 15
}
```

---

### POST /api/v1/holidays

Create a holiday.

**Authentication**: Required
**Authorization**: ADMIN

**Request Body**

```json
{
  "holiday_date": "2024-08-15",
  "name": "Ferragosto",
  "holiday_type": "NATIONAL",
  "is_recurring": true,
  "notes": "Italian national holiday - Assumption of Mary"
}
```

**Holiday Types**
- `NATIONAL` - National/public holiday
- `PRACTICE_CLOSED` - Practice closure (e.g., staff training day)
- `VACATION` - Doctor's vacation day

Note: `is_recurring` indicates if the holiday repeats annually on the same month/day (e.g., Christmas on Dec 25).

**Response** `201 Created`

Returns created holiday object:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "holiday_date": "2024-08-15",
  "name": "Ferragosto",
  "holiday_type": "NATIONAL",
  "holiday_type_display": "National Holiday",
  "is_recurring": true,
  "notes": "Italian national holiday - Assumption of Mary",
  "created_at": "2024-11-15T10:00:00Z",
  "updated_at": "2024-11-15T10:00:00Z"
}
```

**Error Responses**

- `400 Bad Request`: Validation error (name required, max 200 chars; notes max 1000 chars)
- `409 Conflict`: Holiday already exists for this date (DUPLICATE_DATE)

---

### GET /api/v1/holidays/:id

Get a specific holiday.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Holiday ID

**Response** `200 OK`

Returns holiday object.

---

### PUT /api/v1/holidays/:id

Update a holiday.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `id` (UUID): Holiday ID

**Request Body**

All fields are optional:

```json
{
  "holiday_date": "2024-08-16",
  "name": "Updated Holiday Name",
  "holiday_type": "PRACTICE_CLOSED",
  "is_recurring": false,
  "notes": "Updated notes"
}
```

**Response** `200 OK`

Returns updated holiday object.

**Error Responses**

- `400 Bad Request`: Validation error
- `404 Not Found`: Holiday not found
- `409 Conflict`: Another holiday already exists for the new date (DUPLICATE_DATE)

---

### DELETE /api/v1/holidays/:id

Delete a holiday.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `id` (UUID): Holiday ID

**Response** `204 No Content`

---

### GET /api/v1/holidays/check/:date

Check if a date is a holiday.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `date` (string): Date to check (YYYY-MM-DD)

**Response** `200 OK`

```json
{
  "date": "2024-12-25",
  "is_holiday": true,
  "holiday": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "holiday_date": "2024-12-25",
    "name": "Natale",
    "holiday_type": "NATIONAL",
    "holiday_type_display": "National Holiday",
    "is_recurring": true,
    "notes": "Christmas Day",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

If not a holiday:

```json
{
  "date": "2024-12-24",
  "is_holiday": false,
  "holiday": null
}
```

---

### GET /api/v1/holidays/range

Get holidays within a date range.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `from_date` (string, required): Start date (YYYY-MM-DD)
- `to_date` (string, required): End date (YYYY-MM-DD, max 1 year range)

**Response** `200 OK`

Returns array of holiday objects within the specified range.

---

### POST /api/v1/holidays/import-national

Import Italian national holidays for a specific year. Includes both fixed-date holidays and calculated Easter-dependent holidays.

**Authentication**: Required
**Authorization**: ADMIN

**Request Body**

```json
{
  "year": 2025,
  "override_existing": false
}
```

Parameters:
- `year` (integer, required): Year to import holidays for (2020-2100)
- `override_existing` (boolean, optional): If true, replaces existing national holidays for the year. Default: false

**Imported Italian National Holidays**
- Capodanno (New Year's Day) - January 1
- Epifania (Epiphany) - January 6
- Pasqua (Easter Sunday) - variable
- Lunedì dell'Angelo (Easter Monday) - variable
- Festa della Liberazione (Liberation Day) - April 25
- Festa del Lavoro (Labour Day) - May 1
- Festa della Repubblica (Republic Day) - June 2
- Ferragosto (Assumption of Mary) - August 15
- Ognissanti (All Saints' Day) - November 1
- Immacolata Concezione (Immaculate Conception) - December 8
- Natale (Christmas Day) - December 25
- Santo Stefano (St. Stephen's Day) - December 26

**Response** `201 Created`

```json
{
  "year": 2025,
  "imported_count": 12,
  "skipped_count": 0,
  "holidays": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "holiday_date": "2025-01-01",
      "name": "Capodanno",
      "holiday_type": "NATIONAL",
      "holiday_type_display": "National Holiday",
      "is_recurring": true,
      "notes": "New Year's Day",
      "created_at": "2024-11-15T10:00:00Z",
      "updated_at": "2024-11-15T10:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "holiday_date": "2025-01-06",
      "name": "Epifania",
      "holiday_type": "NATIONAL",
      "holiday_type_display": "National Holiday",
      "is_recurring": true,
      "notes": "Epiphany",
      "created_at": "2024-11-15T10:00:00Z",
      "updated_at": "2024-11-15T10:00:00Z"
    }
  ]
}
```

**Error Responses**

- `400 Bad Request`: Year must be between 2020 and 2100 (INVALID_YEAR)

---

## Audit Logs Endpoints

View audit trail of system activities. All audit endpoints require ADMIN role.

### GET /api/v1/audit-logs

List audit logs with filtering and pagination.

**Authentication**: Required
**Authorization**: ADMIN

**Query Parameters**

- `user_id` (UUID, optional): Filter by user
- `action` (string, optional): Filter by action type
- `entity_type` (string, optional): Filter by entity type
- `entity_id` (string, optional): Filter by specific entity ID
- `date_from` (date, optional): Start date filter (YYYY-MM-DD, inclusive)
- `date_to` (date, optional): End date filter (YYYY-MM-DD, inclusive)
- `ip_address` (string, optional): Filter by IP address (partial match)
- `page` (integer, optional): Page number (default: 1)
- `page_size` (integer, optional): Items per page (default: 50, max: 100)
- `sort_by` (string, optional): Sort field - `created_at`, `action`, `entity_type`, `user_email` (default: `created_at`)
- `sort_order` (string, optional): Sort direction - `asc`, `desc` (default: `desc`)

**Response** `200 OK`

```json
{
  "logs": [
    {
      "id": 12345,
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_email": "admin@docpat.local",
      "action": "UPDATE",
      "entity_type": "PATIENT",
      "entity_id": "550e8400-e29b-41d4-a716-446655440001",
      "changes": {
        "first_name": "John",
        "last_name": "Doe",
        "phone_primary": "+1-555-222-2222"
      },
      "ip_address": "127.0.0.1/32",
      "user_agent": "Mozilla/5.0 (X11; Linux x86_64) ...",
      "request_id": "3ec655bd-f948-4c8a-b8b7-f54959c91827",
      "created_at": "2025-12-20T10:30:00Z"
    }
  ],
  "total": 5420,
  "page": 1,
  "page_size": 50,
  "total_pages": 109
}
```

---

### GET /api/v1/audit-logs/:id

Get a specific audit log entry.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `id` (integer): Audit log ID

**Response** `200 OK`

```json
{
  "id": 12345,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_email": "admin@docpat.local",
  "action": "UPDATE",
  "entity_type": "PATIENT",
  "entity_id": "550e8400-e29b-41d4-a716-446655440001",
  "changes": { "phone_primary": "+1-555-222-2222" },
  "ip_address": "127.0.0.1/32",
  "user_agent": "Mozilla/5.0...",
  "request_id": "3ec655bd-f948-4c8a-b8b7-f54959c91827",
  "created_at": "2025-12-20T10:30:00Z"
}
```

**Response** `404 Not Found`

```json
{
  "error": "Not found",
  "message": "Audit log with id 12345 not found"
}
```

---

### GET /api/v1/audit-logs/statistics

Get audit log statistics.

**Authentication**: Required
**Authorization**: ADMIN

**Response** `200 OK`

```json
{
  "total_logs": 54280,
  "logs_today": 125,
  "logs_this_week": 890,
  "logs_this_month": 3450,
  "actions_breakdown": [
    { "action": "CREATE", "count": 12500 },
    { "action": "UPDATE", "count": 28000 },
    { "action": "DELETE", "count": 1200 },
    { "action": "READ", "count": 10000 },
    { "action": "LOGIN", "count": 2580 }
  ],
  "entity_types_breakdown": [
    { "entity_type": "PATIENT", "count": 18000 },
    { "entity_type": "VISIT", "count": 15000 },
    { "entity_type": "APPOINTMENT", "count": 12000 },
    { "entity_type": "USER", "count": 5000 }
  ],
  "top_users": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_email": "admin@docpat.local",
      "count": 25000
    }
  ]
}
```

---

### GET /api/v1/audit-logs/user/:user_id/activity

Get activity summary for a specific user.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `user_id` (UUID): User ID

**Response** `200 OK`

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_email": "admin@docpat.local",
  "total_actions": 25000,
  "first_activity": "2025-01-15T08:00:00Z",
  "last_activity": "2025-12-20T10:30:00Z",
  "actions_breakdown": [
    { "action": "CREATE", "count": 5000 },
    { "action": "UPDATE", "count": 12000 },
    { "action": "READ", "count": 8000 }
  ],
  "recent_logs": [
    {
      "id": 12345,
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_email": "admin@docpat.local",
      "action": "UPDATE",
      "entity_type": "PATIENT",
      "entity_id": "550e8400-e29b-41d4-a716-446655440001",
      "changes": { "phone_primary": "+1-555-222-2222" },
      "ip_address": "127.0.0.1/32",
      "user_agent": "Mozilla/5.0...",
      "request_id": "3ec655bd-f948-4c8a-b8b7-f54959c91827",
      "created_at": "2025-12-20T10:30:00Z"
    }
  ]
}
```

**Response** `404 Not Found`

```json
{
  "error": "Not found",
  "message": "No activity found for user 550e8400-e29b-41d4-a716-446655440000"
}
```

---

### GET /api/v1/audit-logs/export

Export audit logs to CSV or JSON file.

**Authentication**: Required
**Authorization**: ADMIN

**Query Parameters**

- All filter parameters from list endpoint (user_id, action, entity_type, entity_id, date_from, date_to, ip_address)
- `format` (string, optional): Export format - `csv`, `json` (default: `csv`)
- `limit` (integer, optional): Maximum records to export (default: 10000, max: 50000)

**Response** `200 OK`

Returns file download with appropriate headers:
- **CSV**: `Content-Type: text/csv; charset=utf-8`
- **JSON**: `Content-Type: application/json; charset=utf-8`
- `Content-Disposition: attachment; filename="audit_logs_export_YYYYMMDD_HHMMSS.csv"`

---

### GET /api/v1/audit-logs/filter-options

Get available filter options for audit logs.

**Authentication**: Required
**Authorization**: ADMIN

**Response** `200 OK`

```json
{
  "actions": ["CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "SEARCH", "EXPORT"],
  "entity_types": ["PATIENT", "PATIENT_INSURANCE", "VISIT", "PRESCRIPTION", "DIAGNOSIS", "APPOINTMENT", "USER", "DOCUMENT", "HOLIDAY", "WORKING_HOURS", "SYSTEM_SETTING", "FILE", "TEMPLATE"]
}
```

---

## System Health Endpoints

Monitor system health, resources, and status. All endpoints require ADMIN role.

### GET /api/v1/system/health/detailed

Get detailed system health status with component-level details.

**Authentication**: Required
**Authorization**: ADMIN

**Response** `200 OK`

```json
{
  "status": "healthy",
  "timestamp": "2024-11-15T10:30:00Z",
  "uptime_seconds": 864000,
  "version": "0.1.0",
  "components": [
    {
      "name": "database",
      "status": "healthy",
      "message": null,
      "latency_ms": 2,
      "details": null
    },
    {
      "name": "disk",
      "status": "healthy",
      "message": null,
      "latency_ms": null,
      "details": {
        "available_gb": 93.1,
        "total_gb": 146.3,
        "usage_percent": 36.4
      }
    },
    {
      "name": "memory",
      "status": "healthy",
      "message": null,
      "latency_ms": null,
      "details": {
        "used_mb": 8192,
        "total_mb": 32768,
        "usage_percent": 25.0
      }
    }
  ],
  "database_pool": {
    "size": 10,
    "available": 8,
    "in_use": 2,
    "max_connections": 100
  },
  "system_resources": {
    "memory_used_mb": 8192,
    "memory_total_mb": 32768,
    "memory_percent": 25.0,
    "cpu_usage_percent": 12.5,
    "disk_used_gb": 53.2,
    "disk_total_gb": 146.3,
    "disk_percent": 36.4
  }
}
```

**Status Values**
- `healthy` - All systems operational
- `degraded` - Some issues detected (e.g., high memory usage)
- `unhealthy` - Critical issues (e.g., database unreachable, disk full)

**Component Status Triggers**
- Database: `unhealthy` if connection fails
- Disk: `unhealthy` if usage > 95%, `degraded` if > 85%
- Memory: `degraded` if usage > 90%

**Error Response** `403 Forbidden`

```json
{
  "error": "Access denied",
  "message": "Insufficient permissions for this operation"
}
```

---

### GET /api/v1/system/info

Get comprehensive system information.

**Authentication**: Required
**Authorization**: ADMIN

**Response** `200 OK`

```json
{
  "application": {
    "name": "DocPat Backend",
    "version": "0.1.0",
    "rust_version": "1.83.0",
    "build_timestamp": "2024-12-20T10:30:00Z",
    "git_commit": "54f0801"
  },
  "server": {
    "hostname": "docpat-server",
    "os": "linux",
    "arch": "x86_64",
    "uptime_seconds": 864000,
    "started_at": "2024-11-05T10:30:00Z"
  },
  "database": {
    "version": "PostgreSQL 17.0",
    "database_name": "mpms_dev",
    "connection_pool_size": 10,
    "last_migration": "20251214000002_add_localization_settings",
    "total_tables": 25
  },
  "environment": {
    "environment": "development",
    "debug_mode": true,
    "log_level": "info,tower_http=debug,docpat_backend=debug",
    "timezone": "UTC"
  }
}
```

**Field Notes**
- `build_timestamp`: Set at compile time via build.rs, null if not available
- `git_commit`: Short SHA from git, null if not available
- `last_migration`: Most recent applied migration name
- `total_tables`: Count of tables in public schema

**Error Response** `500 Internal Server Error`

```json
{
  "error": "Failed to get system info",
  "message": "Database connection error"
}
```

---

### GET /api/v1/system/storage

Get storage statistics for database and file system.

**Authentication**: Required
**Authorization**: ADMIN

**Response** `200 OK`

```json
{
  "database": {
    "total_size_mb": 16.89,
    "tables_size_mb": 12.45,
    "indexes_size_mb": 4.44,
    "estimated_rows": 1250
  },
  "file_system": {
    "documents_size_mb": 0.0,
    "uploads_size_mb": 0.0,
    "logs_size_mb": 0.0,
    "available_disk_gb": 93.1,
    "total_disk_gb": 146.3,
    "disk_usage_percent": 36.4
  },
  "breakdown": {
    "tables": [
      {
        "table_name": "audit_logs",
        "size_mb": 4.5,
        "row_count": 850
      },
      {
        "table_name": "visits",
        "size_mb": 3.2,
        "row_count": 125
      },
      {
        "table_name": "patients",
        "size_mb": 1.5,
        "row_count": 13
      }
    ]
  }
}
```

**Field Notes**
- `database.total_size_mb`: Total database size from pg_database_size()
- `database.tables_size_mb`: Sum of table sizes (heap)
- `database.indexes_size_mb`: Sum of index sizes
- `database.estimated_rows`: Estimated total rows via pg_stat_user_tables
- `file_system.disk_*`: Root filesystem stats via statvfs (system-wide, not app-specific)
- `breakdown.tables`: Top 20 tables by size, ordered descending

**Error Response** `500 Internal Server Error`

```json
{
  "error": "Failed to get storage stats",
  "message": "Permission denied reading directory"
}
```

---

### GET /api/v1/system/backup-status

Get backup status and configuration.

**Authentication**: Required
**Authorization**: ADMIN

**Response** `200 OK` (backups disabled - directory doesn't exist)

```json
{
  "enabled": false,
  "last_backup": null,
  "next_scheduled": null,
  "backup_location": "/var/backups/docpat",
  "retention_days": 30
}
```

**Response** `200 OK` (backups enabled with history)

```json
{
  "enabled": true,
  "last_backup": {
    "timestamp": "2024-11-15T02:00:00Z",
    "size_mb": 850.5,
    "duration_seconds": 120,
    "status": "success",
    "filename": "backup_20241115_020000.sql.gz"
  },
  "next_scheduled": "2024-11-16T02:00:00Z",
  "backup_location": "/var/backups/docpat",
  "retention_days": 30
}
```

**Field Notes**
- `enabled`: true if backup directory exists
- `last_backup`: Read from status.json in backup directory, null if not found
- `next_scheduled`: Calculated from status.json, null if not scheduled
- `backup_location`: From BACKUP_DIR env var, default `/var/backups/docpat`
- `retention_days`: Hardcoded to 30 (configurable backup system not yet implemented)

**Expected status.json Format** (written by backup script)

```json
{
  "last_backup_timestamp": "2024-11-15T02:00:00Z",
  "last_backup_size_bytes": 891289600,
  "last_backup_duration_seconds": 120,
  "last_backup_status": "success",
  "last_backup_filename": "backup_20241115_020000.sql.gz",
  "next_scheduled": "2024-11-16T02:00:00Z"
}
```

---

## File Upload Endpoints

Manage file uploads including practice logo, attachments, and documents.

### GET /api/v1/files

List uploaded files.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `purpose` (string, optional): Filter by purpose (LOGO, ATTACHMENT, DOCUMENT, AVATAR)
- `created_by` (UUID, optional): Filter by uploader
- `search` (string, optional): Search by filename
- `page` (integer, optional): Page number
- `page_size` (integer, optional): Items per page

**Response** `200 OK`

```json
{
  "files": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "filename": "lab_results.pdf",
      "original_filename": "Lab Results - Nov 2024.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 125000,
      "purpose": "ATTACHMENT",
      "alt_text": "Patient lab results",
      "description": "Blood test results from November 2024",
      "created_by": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-11-15T10:00:00Z"
    }
  ],
  "total": 125,
  "page": 1,
  "page_size": 20
}
```

---

### POST /api/v1/files/upload

Upload a file.

**Authentication**: Required
**Authorization**: ADMIN

**Request**: Multipart form data

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | binary | Yes | File to upload (max 50MB) |
| purpose | string | No | LOGO, ATTACHMENT, DOCUMENT, AVATAR (default: ATTACHMENT) |
| alt_text | string | No | Alt text for accessibility |
| description | string | No | File description |

**Response** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "filename": "550e8400-e29b-41d4-a716-446655440001.pdf",
  "original_filename": "document.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 125000,
  "purpose": "ATTACHMENT",
  "storage_path": "/uploads/550e8400-e29b-41d4-a716-446655440001.pdf",
  "created_at": "2024-11-15T10:00:00Z"
}
```

**Error Responses**

- `400 Bad Request`: Invalid file type or missing file
- `413 Payload Too Large`: File exceeds 50MB limit

**Blocked File Types**
- SVG files (security risk)

---

### GET /api/v1/files/:id

Get file metadata.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): File ID

**Response** `200 OK`

Returns file metadata object.

---

### PUT /api/v1/files/:id

Update file metadata.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `id` (UUID): File ID

**Request Body**

```json
{
  "alt_text": "Updated alt text",
  "description": "Updated description"
}
```

**Response** `200 OK`

Returns updated file metadata.

---

### DELETE /api/v1/files/:id

Delete a file.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `id` (UUID): File ID

**Response** `204 No Content`

---

### GET /api/v1/files/:id/download

Download a file (attachment disposition).

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): File ID

**Response** `200 OK`

Returns file with `Content-Disposition: attachment` header.

---

### GET /api/v1/files/:id/serve

Serve a file inline (for embedding).

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): File ID

**Response** `200 OK`

Returns file with `Content-Disposition: inline` header.

---

## Logo Endpoints

Manage practice logo. Located under settings path.

### GET /api/v1/settings/logo

Get current logo metadata.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Response** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "filename": "logo.png",
  "mime_type": "image/png",
  "size_bytes": 25000,
  "created_at": "2024-11-15T10:00:00Z",
  "url": "/api/v1/settings/logo/image"
}
```

**Response** `404 Not Found`

No logo has been uploaded.

---

### POST /api/v1/settings/logo

Upload practice logo.

**Authentication**: Required
**Authorization**: ADMIN

**Request**: Multipart form data

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | binary | Yes | Image file (PNG, JPG, GIF, WebP) |

**Response** `201 Created`

Returns logo metadata object.

**Error Responses**

- `400 Bad Request`: Invalid image type
- `413 Payload Too Large`: File too large

---

### DELETE /api/v1/settings/logo

Delete practice logo.

**Authentication**: Required
**Authorization**: ADMIN

**Response** `204 No Content`

---

### GET /api/v1/settings/logo/image

Serve logo image (public endpoint).

**Authentication**: Not required
**Authorization**: Public

**Response** `200 OK`

Returns image file with appropriate Content-Type header.

**Response** `404 Not Found`

No logo has been uploaded.

---

## Document Templates Endpoints

Manage document templates for generating medical documents. Requires `pdf-export` feature.

### GET /api/v1/document-templates

List document templates.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `document_type` (string, optional): Filter by type
- `language` (string, optional): Filter by language (ITALIAN, ENGLISH)
- `is_active` (boolean, optional): Filter active/inactive
- `is_default` (boolean, optional): Filter default templates
- `search` (string, optional): Search by name/description
- `limit` (integer, optional): Items per page
- `offset` (integer, optional): Offset for pagination

**Response** `200 OK`

```json
{
  "templates": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Medical Report",
      "description": "Standard medical report template",
      "document_type": "MEDICAL_REPORT",
      "language": "ITALIAN",
      "is_active": true,
      "is_default": true,
      "created_by": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-11-15T10:00:00Z",
      "updated_at": "2024-11-15T10:00:00Z"
    }
  ],
  "total": 12
}
```

---

### POST /api/v1/document-templates

Create a document template.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Request Body**

```json
{
  "name": "Referral Letter",
  "description": "Template for specialist referral letters",
  "document_type": "REFERRAL",
  "language": "ITALIAN",
  "content": "<html><head>...</head><body>{{patient.name}}...</body></html>",
  "is_active": true,
  "is_default": false
}
```

**Document Types**
- `MEDICAL_REPORT` - Clinical assessment report
- `PRESCRIPTION` - Prescription document
- `CERTIFICATE` - Medical certificate
- `REFERRAL` - Referral letter
- `DISCHARGE_SUMMARY` - Discharge summary

**Template Variables**

Templates support variable substitution using `{{variable}}` syntax:
- `{{patient.name}}`, `{{patient.date_of_birth}}`, `{{patient.fiscal_code}}`
- `{{visit.date}}`, `{{visit.chief_complaint}}`, `{{visit.assessment}}`
- `{{provider.name}}`, `{{provider.specialty}}`
- `{{clinic.name}}`, `{{clinic.address}}`, `{{clinic.phone}}`, `{{clinic.logo}}`
- `{{document.date}}`, `{{document.number}}`

**Response** `201 Created`

Returns created template object.

---

### GET /api/v1/document-templates/default

Get default template for a document type.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `document_type` (string, required): Document type
- `language` (string, optional): Language preference (default: ITALIAN)

**Response** `200 OK`

Returns template object.

**Response** `404 Not Found`

No default template found for specified type/language.

---

### GET /api/v1/document-templates/:id

Get a specific template.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Template ID

**Response** `200 OK`

Returns template object including content.

---

### PUT /api/v1/document-templates/:id

Update a template.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR (must own template or be ADMIN)

**Path Parameters**

- `id` (UUID): Template ID

**Request Body**

```json
{
  "name": "Updated Template Name",
  "description": "Updated description",
  "content": "<html>...</html>",
  "is_active": true,
  "is_default": true
}
```

**Response** `200 OK`

Returns updated template object.

---

### DELETE /api/v1/document-templates/:id

Delete a template.

**Authentication**: Required
**Authorization**: ADMIN

**Path Parameters**

- `id` (UUID): Template ID

**Response** `204 No Content`

---

## Generated Documents Endpoints

Generate and manage medical documents. Requires `pdf-export` feature.

### GET /api/v1/documents

List generated documents.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Query Parameters**

- `patient_id` (UUID, optional): Filter by patient
- `visit_id` (UUID, optional): Filter by visit
- `provider_id` (UUID, optional): Filter by provider
- `document_type` (string, optional): Filter by type
- `status` (string, optional): Filter by status
- `is_signed` (boolean, optional): Filter signed/unsigned
- `from_date` (string, optional): Created after date
- `to_date` (string, optional): Created before date
- `limit` (integer, optional): Items per page
- `offset` (integer, optional): Offset for pagination

**Response** `200 OK`

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "document_type": "MEDICAL_REPORT",
      "patient_id": "550e8400-e29b-41d4-a716-446655440010",
      "patient_name": "John Doe",
      "visit_id": "550e8400-e29b-41d4-a716-446655440020",
      "provider_id": "550e8400-e29b-41d4-a716-446655440000",
      "provider_name": "Dr. Smith",
      "status": "SIGNED",
      "is_signed": true,
      "signed_at": "2024-11-15T11:00:00Z",
      "file_path": "/documents/550e8400.pdf",
      "file_size_bytes": 125000,
      "created_at": "2024-11-15T10:00:00Z"
    }
  ],
  "total": 450
}
```

---

### POST /api/v1/documents/generate

Generate a new document.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Request Body**

```json
{
  "template_id": "550e8400-e29b-41d4-a716-446655440001",
  "patient_id": "550e8400-e29b-41d4-a716-446655440010",
  "visit_id": "550e8400-e29b-41d4-a716-446655440020",
  "variables": {
    "custom_field": "Custom value",
    "additional_notes": "Additional notes to include"
  }
}
```

**Response** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "document_type": "MEDICAL_REPORT",
  "patient_id": "550e8400-e29b-41d4-a716-446655440010",
  "visit_id": "550e8400-e29b-41d4-a716-446655440020",
  "status": "DRAFT",
  "is_signed": false,
  "file_path": "/documents/550e8400.pdf",
  "file_size_bytes": 125000,
  "created_at": "2024-11-15T10:00:00Z"
}
```

---

### GET /api/v1/documents/statistics

Get document generation statistics.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Response** `200 OK`

```json
{
  "total_documents": 1250,
  "documents_this_month": 85,
  "by_type": {
    "MEDICAL_REPORT": 450,
    "PRESCRIPTION": 380,
    "CERTIFICATE": 220,
    "REFERRAL": 150,
    "DISCHARGE_SUMMARY": 50
  },
  "by_status": {
    "DRAFT": 45,
    "SIGNED": 1180,
    "DELIVERED": 25
  },
  "total_size_mb": 580
}
```

---

### GET /api/v1/documents/:id

Get document details.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Document ID

**Response** `200 OK`

Returns document object with all metadata.

---

### DELETE /api/v1/documents/:id

Delete a document.

**Authentication**: Required
**Authorization**: ADMIN (signed documents can only be deleted by ADMIN)

**Path Parameters**

- `id` (UUID): Document ID

**Response** `204 No Content`

**Error Responses**

- `403 Forbidden`: Cannot delete signed document (non-admin)

---

### GET /api/v1/documents/:id/download

Download document PDF.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Document ID

**Response** `200 OK`

Returns PDF file with `Content-Disposition: attachment` header.

---

### POST /api/v1/documents/:id/sign

Sign a document.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Document ID

**Response** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "SIGNED",
  "is_signed": true,
  "signed_at": "2024-11-15T11:00:00Z",
  "signed_by": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**

- `400 Bad Request`: Document already signed

---

### POST /api/v1/documents/:id/deliver

Record document delivery.

**Authentication**: Required
**Authorization**: ADMIN, DOCTOR

**Path Parameters**

- `id` (UUID): Document ID

**Request Body**

```json
{
  "delivery_method": "email",
  "delivered_to": "patient@example.com",
  "delivery_notes": "Sent per patient request"
}
```

**Delivery Methods**
- `email` - Sent via email
- `printed` - Printed and given to patient
- `downloaded` - Downloaded by patient/provider

**Response** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "DELIVERED",
  "delivered_at": "2024-11-15T11:30:00Z",
  "delivery_method": "email",
  "delivered_to": "patient@example.com"
}
```

---

## Drug Interactions Endpoints

Drug-drug interaction checking using the DDInter 2.0 database with over 170,000 interactions mapped via WHO ATC classification codes.

**Base Path**: `/api/v1/drug-interactions`
**Required Permission**: `drug_interactions:read`

---

### Check Drug Interactions

Check for interactions between multiple medications identified by ATC codes.

**Endpoint**: `POST /api/v1/drug-interactions/check`

**Request Body**

```json
{
  "atc_codes": ["B01AA03", "A02BC01", "N02BE01"],
  "min_severity": "moderate"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `atc_codes` | string[] | Yes | WHO ATC codes for medications to check |
| `min_severity` | string | No | Minimum severity filter: "contraindicated", "major", "moderate", "minor" |

**Response** `200 OK`

```json
{
  "interactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "drug_a_atc_code": "A02BC01",
      "drug_a_name": "Omeprazole",
      "drug_b_atc_code": "B01AA03",
      "drug_b_name": "Warfarin",
      "severity": "moderate",
      "effect": "May increase anticoagulant effect",
      "mechanism": "CYP2C19 inhibition",
      "management": "Monitor INR closely when starting or stopping PPI",
      "source": "DDInter"
    }
  ],
  "total": 1,
  "major_count": 0,
  "moderate_count": 1,
  "minor_count": 0,
  "highest_severity": "moderate"
}
```

---

### Check New Medication Interactions

Check interactions when adding a new medication to existing prescriptions.

**Endpoint**: `POST /api/v1/drug-interactions/check-new`

**Request Body**

```json
{
  "new_atc_code": "B01AA03",
  "existing_atc_codes": ["A02BC01", "N02BE01"],
  "min_severity": "moderate"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `new_atc_code` | string | Yes | ATC code of the medication being added |
| `existing_atc_codes` | string[] | Yes | ATC codes of current medications |
| `min_severity` | string | No | Minimum severity filter |

**Response** `200 OK`

Returns same format as Check Drug Interactions, filtered to only include interactions involving the new medication.

---

### Check New Medication for Patient

Check interactions when adding a new medication for a specific patient. Uses medication names with fuzzy matching to check against the patient's existing active prescriptions.

**Endpoint**: `POST /api/v1/drug-interactions/check-new-for-patient`

**Request Body**

```json
{
  "new_medication_name": "COUMADIN",
  "new_generic_name": "Warfarin",
  "patient_id": "550e8400-e29b-41d4-a716-446655440010",
  "min_severity": "moderate"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `new_medication_name` | string | Yes | Name of the new medication (from AIFA database or custom) |
| `new_generic_name` | string | No | Generic name (improves matching accuracy) |
| `patient_id` | UUID | Yes | Patient ID to check existing prescriptions against |
| `min_severity` | string | No | Minimum severity filter |

**Response** `200 OK`

Returns same format as Check Drug Interactions, with interactions found between the new medication and the patient's active prescriptions.

**Notes**:
- Uses fuzzy matching to find ATC codes from medication names
- Decrypts patient prescription data to access medication names
- Checks interactions against all ACTIVE status prescriptions
- Useful when prescribing from the UI before creating the prescription

---

### Check Patient Interactions

Check interactions for a patient's active prescriptions.

**Endpoint**: `GET /api/v1/drug-interactions/patient/{patient_id}`

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `patient_id` | UUID | Patient ID |

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `min_severity` | string | Optional: "contraindicated", "major", "moderate", "minor" |

**Response** `200 OK`

Returns same format as Check Drug Interactions, with interactions found between the patient's active prescriptions.

---

### Get Interaction Statistics

Get statistics about the drug interaction database.

**Endpoint**: `GET /api/v1/drug-interactions/statistics`

**Response** `200 OK`

```json
{
  "total": 170449,
  "contraindicated": 0,
  "major": 29133,
  "moderate": 97683,
  "minor": 6331,
  "unknown": 37302,
  "sources": 1
}
```

---

### Severity Levels

| Level | Description |
|-------|-------------|
| `contraindicated` | Medications should never be used together |
| `major` | Significant risk; may require alternative therapy |
| `moderate` | May require dose adjustment or monitoring |
| `minor` | Minimal clinical significance |
| `unknown` | Interaction documented but severity not classified |

---

## Notifications Endpoints

Email-based notification system for appointment reminders, confirmations, and cancellations.

**Base Path**: `/api/v1/notifications`
**Required Permission**: `notifications:read`, `notifications:create`, `notifications:update`

---

### List Notifications

List all notifications with optional filtering.

**Endpoint**: `GET /api/v1/notifications`

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `patient_id` | UUID | Filter by patient |
| `appointment_id` | UUID | Filter by appointment |
| `notification_type` | string | Filter by type (see Notification Types) |
| `status` | string | Filter by status (PENDING, SENT, FAILED, CANCELLED) |
| `from_date` | DateTime | Filter from date (ISO 8601 datetime, e.g., `2026-01-01T00:00:00Z`) |
| `to_date` | DateTime | Filter to date (ISO 8601 datetime, e.g., `2026-01-31T23:59:59Z`) |
| `offset` | integer | Pagination offset (default 0) |
| `limit` | integer | Pagination limit (default 50, max 100) |

**Response** `200 OK`

```json
{
  "notifications": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "patient_id": "550e8400-e29b-41d4-a716-446655440010",
      "patient_name": "Mario Rossi",
      "appointment_id": "550e8400-e29b-41d4-a716-446655440020",
      "notification_type": "APPOINTMENT_REMINDER",
      "delivery_method": "EMAIL",
      "recipient_email": "mario.rossi@example.com",
      "recipient_name": "Mario Rossi",
      "subject": "Appointment Reminder - January 15, 2026",
      "scheduled_for": "2026-01-14T08:00:00Z",
      "priority": 5,
      "status": "SENT",
      "retry_count": 0,
      "max_retries": 3,
      "sent_at": "2026-01-14T08:01:23Z",
      "error_message": null,
      "created_at": "2026-01-13T10:30:00Z"
    }
  ],
  "total": 150,
  "offset": 0,
  "limit": 50
}
```

---

### Get Notification

Get a single notification by ID.

**Endpoint**: `GET /api/v1/notifications/{id}`

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Notification ID |

**Response** `200 OK`

Returns a single notification object (same structure as list item).

**Error Responses**

| Status | Description |
|--------|-------------|
| 404 | Notification not found |

---

### Create Notification

Create a new notification to be queued for delivery.

**Endpoint**: `POST /api/v1/notifications`

**Request Body**

```json
{
  "patient_id": "550e8400-e29b-41d4-a716-446655440010",
  "appointment_id": "550e8400-e29b-41d4-a716-446655440020",
  "notification_type": "APPOINTMENT_REMINDER",
  "delivery_method": "EMAIL",
  "recipient_email": "patient@example.com",
  "recipient_name": "Mario Rossi",
  "subject": "Appointment Reminder",
  "message_body": "Your appointment is scheduled for tomorrow...",
  "scheduled_for": "2026-01-14T08:00:00Z",
  "priority": 5,
  "metadata": {
    "appointment_type": "Check-up"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patient_id` | UUID | No | Associated patient |
| `appointment_id` | UUID | No | Associated appointment |
| `notification_type` | string | Yes | Type of notification (see enum) |
| `delivery_method` | string | No | Delivery channel (default: EMAIL) |
| `recipient_email` | string | No* | Recipient email (*required for EMAIL) |
| `recipient_name` | string | No | Recipient display name |
| `subject` | string | No | Email subject line |
| `message_body` | string | Yes | Notification content (1-10000 chars) |
| `scheduled_for` | ISO 8601 | No | When to send (default: now) |
| `priority` | integer | No | 1-10, lower=higher priority (default: 5) |
| `metadata` | object | No | Additional JSON metadata |

**Response** `201 Created`

Returns the created notification object.

---

### Retry Notification

Retry a failed notification.

**Endpoint**: `POST /api/v1/notifications/{id}/retry`

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Notification ID |

**Response** `200 OK`

Returns the updated notification object with status reset to PENDING.

**Error Responses**

| Status | Description |
|--------|-------------|
| 400 | Notification cannot be retried (not in FAILED status or max retries reached) |
| 404 | Notification not found |

---

### Cancel Notification

Cancel a pending notification.

**Endpoint**: `DELETE /api/v1/notifications/{id}`

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Notification ID |

**Response** `200 OK`

Returns the notification object with status set to CANCELLED.

**Notes**:
- Only PENDING or FAILED notifications can be cancelled
- SENT or PROCESSING notifications cannot be cancelled

**Error Responses**

| Status | Description |
|--------|-------------|
| 400 | Notification cannot be cancelled |
| 404 | Notification not found |

---

### Get Notification Statistics

Get notification statistics for the dashboard.

**Endpoint**: `GET /api/v1/notifications/statistics`

**Response** `200 OK`

```json
{
  "total_pending": 12,
  "total_sent_today": 45,
  "total_failed_today": 2,
  "email_sent_today": 45
}
```

---

### Get Email Service Status

Check if email service is configured and enabled.

**Endpoint**: `GET /api/v1/notifications/email-status`

**Response** `200 OK`

```json
{
  "enabled": true,
  "configured": true
}
```

---

### Send Test Email

Send a test email to verify SMTP configuration.

**Endpoint**: `POST /api/v1/notifications/send-test`

**Required Role**: ADMIN only

**Request Body**

```json
{
  "to_email": "admin@example.com",
  "to_name": "Admin User"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to_email` | string | Yes | Test email recipient |
| `to_name` | string | No | Recipient display name |

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Test email sent successfully"
}
```

**Error Response** `400 Bad Request`

```json
{
  "success": false,
  "message": "Failed to send: SMTP connection error"
}
```

---

### Get Patient Notification Preferences

Get notification preferences for a specific patient.

**Endpoint**: `GET /api/v1/patients/{patient_id}/notification-preferences`

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `patient_id` | UUID | Patient ID |

**Response** `200 OK`

```json
{
  "patient_id": "550e8400-e29b-41d4-a716-446655440010",
  "email_enabled": true,
  "email_address_override": null,
  "reminder_enabled": true,
  "reminder_days_before": 1,
  "confirmation_enabled": true,
  "updated_at": "2026-01-13T10:30:00Z"
}
```

**Notes**:
- If preferences don't exist for the patient, returns default values
- Default: email_enabled=true, reminder_enabled=true, reminder_days_before=1, confirmation_enabled=true

---

### Update Patient Notification Preferences

Update notification preferences for a specific patient.

**Endpoint**: `PUT /api/v1/patients/{patient_id}/notification-preferences`

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `patient_id` | UUID | Patient ID |

**Request Body**

```json
{
  "email_enabled": true,
  "email_address_override": "alternate@example.com",
  "reminder_enabled": true,
  "reminder_days_before": 2,
  "confirmation_enabled": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email_enabled` | boolean | No | Enable/disable email notifications |
| `email_address_override` | string | No | Override patient's primary email |
| `reminder_enabled` | boolean | No | Enable appointment reminders |
| `reminder_days_before` | integer | No | Days before appointment to send reminder (0-7) |
| `confirmation_enabled` | boolean | No | Enable appointment confirmations |

**Response** `200 OK`

Returns the updated preferences object.

---

### Notification Types

| Type | Description |
|------|-------------|
| `APPOINTMENT_REMINDER` | Reminder before scheduled appointment (sent by scheduler based on patient's reminder_days_before preference) |
| `APPOINTMENT_BOOKED` | Confirmation when appointment is created |
| `APPOINTMENT_CONFIRMATION` | Alternative confirmation type (legacy) |
| `APPOINTMENT_CANCELLATION` | Notice when appointment is cancelled |
| `CUSTOM` | Custom notification |

**Note**: The scheduler automatically generates `APPOINTMENT_REMINDER` notifications based on each patient's `reminder_days_before` preference setting.

### Notification Status

| Status | Description |
|--------|-------------|
| `PENDING` | Queued for delivery |
| `PROCESSING` | Currently being sent |
| `SENT` | Successfully delivered |
| `FAILED` | Delivery failed (may be retried) |
| `CANCELLED` | Cancelled before delivery |

### Delivery Methods

| Method | Description |
|--------|-------------|
| `EMAIL` | Email delivery (currently supported) |
| `SMS` | SMS text message (future) |
| `WHATSAPP` | WhatsApp message (future) |
| `PUSH` | Push notification (future) |

---

## Appendix

### Enum Values Reference

#### User Roles
- `ADMIN` - Full system access
- `DOCTOR` - Clinical access

#### Patient Status
- `ACTIVE` - Active patient
- `INACTIVE` - Inactive patient
- `DECEASED` - Deceased patient

#### Patient Gender
- `M` - Male
- `F` - Female
- `OTHER` - Other
- `UNKNOWN` - Unknown

#### Appointment Status
- `SCHEDULED` - Appointment created
- `CONFIRMED` - Appointment confirmed
- `IN_PROGRESS` - Appointment in progress
- `COMPLETED` - Appointment completed (final)
- `CANCELLED` - Appointment cancelled (final)
- `NO_SHOW` - Patient no-show (final)

#### Appointment Type
- `NEW_PATIENT` - New patient consultation
- `FOLLOW_UP` - Follow-up appointment
- `URGENT` - Urgent appointment
- `CONSULTATION` - Consultation
- `ROUTINE_CHECKUP` - Routine checkup
- `ACUPUNCTURE` - Acupuncture session

#### Visit Status
- `DRAFT` - Editable
- `SIGNED` - Signed by provider
- `LOCKED` - Immutable

#### Visit Type
- `NEW_PATIENT` - Initial visit
- `FOLLOW_UP` - Follow-up visit
- `URGENT` - Urgent visit
- `CONSULTATION` - Consultation
- `ROUTINE_CHECKUP` - Routine checkup
- `ACUPUNCTURE` - Acupuncture session

#### Diagnosis Status
- `ACTIVE` - Current diagnosis
- `RESOLVED` - Resolved diagnosis
- `CHRONIC` - Chronic condition

#### Prescription Status
- `ACTIVE` - Active prescription
- `COMPLETED` - Completed prescription
- `DISCONTINUED` - Discontinued prescription
- `EXPIRED` - Expired prescription

#### Holiday Type
- `NATIONAL` - National/public holiday
- `PRACTICE_CLOSED` - Practice closure
- `VACATION` - Vacation day

#### Holiday Recurring Pattern
- `YEARLY` - Same date every year
- `MONTHLY` - Same date every month
- `WEEKLY` - Same day every week

#### Working Hours Override Type
- `CLOSED` - Practice closed
- `CUSTOM_HOURS` - Custom working hours
- `EXTENDED_HOURS` - Extended working hours

#### Document Type
- `MEDICAL_REPORT` - Clinical assessment report
- `PRESCRIPTION` - Prescription document
- `CERTIFICATE` - Medical certificate
- `REFERRAL` - Referral letter
- `DISCHARGE_SUMMARY` - Discharge summary

#### Document Status
- `DRAFT` - Editable document
- `SIGNED` - Signed by provider
- `DELIVERED` - Delivered to patient

#### File Purpose
- `LOGO` - Practice logo
- `ATTACHMENT` - File attachment
- `DOCUMENT` - Generated document
- `AVATAR` - User avatar

#### Audit Log Actions
- `CREATE` - Resource creation
- `READ` - Resource read/view
- `UPDATE` - Resource update
- `DELETE` - Resource deletion
- `LOGIN` - User login
- `LOGOUT` - User logout
- `SEARCH` - Search operation
- `EXPORT` - Data export

#### Audit Log Entity Types
- `PATIENT` - Patient records
- `PATIENT_INSURANCE` - Patient insurance records
- `VISIT` - Visit records
- `PRESCRIPTION` - Prescriptions
- `DIAGNOSIS` - Diagnoses
- `APPOINTMENT` - Appointments
- `USER` - User accounts
- `DOCUMENT` - Generated documents
- `HOLIDAY` - Holiday records
- `WORKING_HOURS` - Working hours schedules
- `SYSTEM_SETTING` - System settings
- `FILE` - Uploaded files
- `TEMPLATE` - Document/visit/prescription templates

#### System Health Status
- `healthy` - All systems operational
- `degraded` - Some issues detected (e.g., memory usage > 90%, disk usage > 85%)
- `unhealthy` - Critical issues (e.g., database unreachable, disk usage > 95%)

#### Report Types
- `appointment_utilization` - Appointment utilization report
- `patient_statistics` - Patient statistics report
- `diagnosis_trends` - Diagnosis trends report
- `provider_productivity` - Provider productivity report
- `revenue` - Revenue report
- `dashboard` - Dashboard summary

#### Export Formats
- `json` - JSON format
- `csv` - CSV format
- `pdf` - PDF format
- `excel` - Excel format

---

## Changelog

### Version 1.3.0 (January 2026)

**Drug Interactions Module**
- Added Drug Interactions endpoints using DDInter 2.0 database:
  - `POST /drug-interactions/check` - Check interactions between multiple medications
  - `POST /drug-interactions/check-new` - Check interactions when adding new medication
  - `POST /drug-interactions/check-new-for-patient` - Check interactions using medication names for a patient
  - `GET /drug-interactions/patient/{id}` - Check patient's active prescription interactions
  - `GET /drug-interactions/statistics` - Get drug interaction database statistics
- Added RBAC policy for `drug_interactions:read` permission
- Database includes 170,449+ drug-drug interactions with ATC code mapping
- Supports severity filtering: contraindicated, major, moderate, minor, unknown

**Patient Management**
- Added `POST /patients/{id}/reactivate` endpoint to reactivate deactivated patients

**Documentation**
- Generated OpenAPI 3.1.0 specification (`docs/openapi.yaml`)
- Added comprehensive request/response examples for all endpoints
- Documented complete authentication flow with MFA support
- Updated API changelog with all changes
- Cross-verified all 155+ endpoints against backend route definitions

### Version 1.2.0 (December 2025)

- Added Reports & Analytics endpoints (appointments, patients, diagnoses, productivity, revenue, dashboard, export)
- Added Settings management endpoints (list, groups, get/update/reset, bulk operations)
- Added Working Hours endpoints (weekly schedule, overrides, effective hours, day checks)
- Added Holidays endpoints (CRUD, check, range, import national holidays)
- Added Audit Logs endpoints (list, statistics, user activity, export, filter options)
- Added System Health endpoints (detailed health, system info, storage, backup status)
- Added File Upload endpoints (list, upload, metadata, download, serve)
- Added Logo management endpoints (upload, get, delete, serve)
- Added Document Templates endpoints (CRUD, get default template)
- Added Generated Documents endpoints (generate, list, statistics, download, sign, deliver)
- Added comprehensive enum values documentation
- Updated API documentation to reflect all implemented features

### Version 1.1.0 (November 2025)

- Added visit templates endpoints
- Added prescription templates endpoints
- Added visit version history endpoints
- Added diagnosis management endpoints
- Added medication search endpoint
- Added prescription discontinue endpoint
- Enhanced patient search with additional filters
- Updated documentation for all endpoints

### Version 1.0.0 (October 2025)

- Initial API release
- Core authentication endpoints
- Patient management
- Appointment scheduling
- Visit documentation
- Basic reporting

---

## Support

For API support, questions, or issues:

- Check the [documentation](.)
- Review [PLANNING.md](PLANNING.md) for architecture details
- Consult [SECURITY.md](SECURITY.md) for security guidelines

---

**Last Updated**: January 2026
**API Version**: 1.3.0
**Status**: Production Ready
