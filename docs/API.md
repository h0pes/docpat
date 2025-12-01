# API Documentation - Medical Practice Management System

**Version**: 1.1.0
**Base URL**: `/api/v1`
**Last Updated**: November 2025

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
  }
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

Discontinue a prescription.

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

- `400 Bad Request`: Cannot discontinue (already discontinued)

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

---

## Changelog

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

**Last Updated**: November 2025
**API Version**: 1.1.0
**Status**: Production Ready
