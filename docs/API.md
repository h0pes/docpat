# API Documentation - Medical Practice Management System

**Version**: 1.0.0
**Base URL**: `/api/v1`
**Last Updated**: October 2025

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Response Format](#response-format)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Users](#user-management-endpoints)
  - [Patients](#patient-management-endpoints)
  - [Appointments](#appointment-management-endpoints)
  - [Visits](#visit-documentation-endpoints)
  - [Prescriptions](#prescription-endpoints)
  - [Documents](#document-generation-endpoints)
  - [Reports](#reporting-endpoints)
  - [Settings](#system-settings-endpoints)

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

---

## Authentication

All authenticated endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

### Token Lifecycle

- **Access Token**: Valid for 30 minutes
- **Refresh Token**: Valid for 7 days
- **Session Timeout**: 30 minutes of inactivity

### Security Features

- Account lockout after 5 failed login attempts
- MFA (TOTP) support for all users
- Refresh token rotation on use
- IP-based rate limiting

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
  "message": "Human-readable error description",
  "details": {
    "field": "additional context"
  },
  "request_id": "req_abc123",
  "timestamp": "2024-11-01T10:30:00Z"
}
```

### Standard Error Codes

| HTTP Status | Error Code | Description |
|------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Invalid or expired token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Resource conflict (e.g., double booking) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

### Validation Errors

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {
    "email": "Invalid email format",
    "phone": "Phone number must be in E.164 format"
  },
  "request_id": "req_abc123",
  "timestamp": "2024-11-01T10:30:00Z"
}
```

---

## Response Format

### Success Response

```json
{
  "data": {
    // Response data
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### Paginated Response

```json
{
  "data": [
    // Array of items
  ],
  "pagination": {
    "total": 150,
    "offset": 0,
    "limit": 20,
    "has_more": true
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## API Endpoints

---

## Authentication Endpoints

### POST /api/v1/auth/login

Authenticate user and receive access tokens.

**Request**

```json
{
  "username": "dr.smith",
  "password": "SecurePass123!",
  "mfa_code": "123456"  // Optional, required if MFA enabled
}
```

**Response** `200 OK`

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 1800,
    "user": {
      "id": "usr_123",
      "username": "dr.smith",
      "name": "Dr. John Smith",
      "role": "DOCTOR",
      "permissions": ["write:patients", "write:visits"]
    }
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Error Response** `401 Unauthorized`

```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Username or password incorrect",
  "details": {
    "attempts_remaining": 3
  },
  "request_id": "req_abc123",
  "timestamp": "2024-11-01T10:30:00Z"
}
```

---

### POST /api/v1/auth/refresh

Refresh access token using refresh token.

**Request**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** `200 OK`

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 1800
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### POST /api/v1/auth/logout

Invalidate current session and tokens.

**Headers**
```
Authorization: Bearer <access_token>
```

**Response** `200 OK`

```json
{
  "data": {
    "message": "Logged out successfully"
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### POST /api/v1/auth/mfa/enroll

Enroll in multi-factor authentication.

**Headers**
```
Authorization: Bearer <access_token>
```

**Response** `200 OK`

```json
{
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qr_code": "data:image/png;base64,...",
    "backup_codes": [
      "12345-67890",
      "23456-78901"
    ]
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### POST /api/v1/auth/mfa/verify

Verify MFA code to complete enrollment or login.

**Request**

```json
{
  "code": "123456"
}
```

**Response** `200 OK`

```json
{
  "data": {
    "verified": true
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## User Management Endpoints

### GET /api/v1/users

List all users (Admin only).

**Headers**
```
Authorization: Bearer <access_token>
```

**Query Parameters**

- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `role` (optional): Filter by role (`ADMIN`, `DOCTOR`)
- `is_active` (optional): Filter by active status (true/false)

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "usr_123",
      "username": "dr.smith",
      "email": "dr.smith@clinic.com",
      "first_name": "John",
      "last_name": "Smith",
      "role": "DOCTOR",
      "is_active": true,
      "mfa_enabled": true,
      "last_login": "2024-11-01T09:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "offset": 0,
    "limit": 20,
    "has_more": false
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### POST /api/v1/users

Create new user (Admin only).

**Request**

```json
{
  "username": "dr.jones",
  "email": "dr.jones@clinic.com",
  "password": "SecurePass123!",
  "first_name": "Sarah",
  "last_name": "Jones",
  "role": "DOCTOR",
  "phone": "+1-555-0123"
}
```

**Response** `201 Created`

```json
{
  "data": {
    "id": "usr_456",
    "username": "dr.jones",
    "email": "dr.jones@clinic.com",
    "created_at": "2024-11-01T10:30:00Z"
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### PUT /api/v1/users/:id

Update user information.

**Request**

```json
{
  "first_name": "Sarah",
  "last_name": "Jones-Smith",
  "email": "sarah.jones@clinic.com",
  "phone": "+1-555-0124"
}
```

**Response** `200 OK`

---

### DELETE /api/v1/users/:id

Deactivate user (soft delete).

**Response** `200 OK`

---

## Patient Management Endpoints

### GET /api/v1/patients

Search and list patients.

**Headers**
```
Authorization: Bearer <access_token>
```

**Query Parameters**

- `search` (optional): Search by name, phone, or MRN
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset
- `status` (optional): Filter by status (ACTIVE, INACTIVE, DECEASED)
- `age_min` (optional): Minimum age filter
- `age_max` (optional): Maximum age filter

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "pat_456",
      "medical_record_number": "MRN-2024-0456",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1980-05-15",
      "age": 44,
      "gender": "M",
      "phone_primary": "+1-555-0123",
      "email": "john.doe@email.com",
      "status": "ACTIVE",
      "last_visit": "2024-10-15T14:30:00Z",
      "upcoming_appointments": 1,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 1500,
    "offset": 0,
    "limit": 20,
    "has_more": true
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### GET /api/v1/patients/:id

Get patient details by ID.

**Response** `200 OK`

```json
{
  "data": {
    "id": "pat_456",
    "medical_record_number": "MRN-2024-0456",
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
    "address": {
      "street": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zip": "62701",
      "country": "US"
    },
    "emergency_contact": {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "phone": "+1-555-0125"
    },
    "blood_type": "A+",
    "allergies": ["Penicillin", "Peanuts"],
    "chronic_conditions": ["Hypertension", "Type 2 Diabetes"],
    "current_medications": [
      {
        "name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily"
      }
    ],
    "health_card_expire": "2025-12-31",
    "insurance": {
      "provider_name": "Blue Cross",
      "policy_number": "BC123456789",
      "group_number": "GRP001",
      "effective_date": "2024-01-01",
      "expiration_date": "2024-12-31"
    },
    "status": "ACTIVE",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-10-01T00:00:00Z"
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### POST /api/v1/patients

Create new patient record.

**Request**

```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "date_of_birth": "1985-08-22",
  "gender": "F",
  "fiscal_code": "SMTJNE85M62H501B",
  "phone_primary": "+1-555-0456",
  "email": "jane.smith@email.com",
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701",
    "country": "US"
  },
  "emergency_contact": {
    "name": "John Smith",
    "relationship": "Spouse",
    "phone": "+1-555-0457"
  },
  "blood_type": "O+",
  "health_card_expire": "2026-06-30",
  "insurance": {
    "provider_name": "Blue Cross",
    "policy_number": "BC987654321",
    "group_number": "GRP002"
  }
}
```

**Response** `201 Created`

```json
{
  "data": {
    "id": "pat_789",
    "medical_record_number": "MRN-2024-0789",
    "created_at": "2024-11-01T10:30:00Z"
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### PUT /api/v1/patients/:id

Update patient information.

**Request**

```json
{
  "phone_primary": "+1-555-0999",
  "email": "new.email@example.com",
  "address": {
    "street": "456 Oak Ave",
    "city": "Springfield",
    "state": "IL",
    "zip": "62702",
    "country": "US"
  }
}
```

**Response** `200 OK`

---

### DELETE /api/v1/patients/:id

Deactivate patient (soft delete).

**Response** `200 OK`

---

### GET /api/v1/patients/:id/history

Get patient medical history.

**Response** `200 OK`

```json
{
  "data": {
    "patient_id": "pat_456",
    "visits": [
      {
        "id": "vst_123",
        "visit_date": "2024-10-15",
        "visit_type": "FOLLOW_UP",
        "provider": "Dr. Smith",
        "diagnoses": ["Hypertension"],
        "status": "SIGNED"
      }
    ],
    "total_visits": 25,
    "last_visit": "2024-10-15T14:30:00Z",
    "upcoming_appointments": 1
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## Appointment Management Endpoints

### GET /api/v1/appointments/availability

Check available appointment slots.

**Query Parameters**

- `provider_id`: Provider UUID
- `date`: Date in YYYY-MM-DD format
- `duration`: Duration in minutes (default: 30)

**Response** `200 OK`

```json
{
  "data": {
    "date": "2024-11-15",
    "provider_id": "usr_123",
    "available_slots": [
      {
        "start": "2024-11-15T09:00:00Z",
        "end": "2024-11-15T09:30:00Z"
      },
      {
        "start": "2024-11-15T10:30:00Z",
        "end": "2024-11-15T11:00:00Z"
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### GET /api/v1/appointments

List appointments with filters.

**Query Parameters**

- `provider_id` (optional): Filter by provider
- `patient_id` (optional): Filter by patient
- `start_date` (optional): Start date filter
- `end_date` (optional): End date filter
- `status` (optional): Filter by status
- `limit`, `offset`: Pagination

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "apt_999",
      "patient": {
        "id": "pat_456",
        "name": "John Doe"
      },
      "provider": {
        "id": "usr_123",
        "name": "Dr. Smith"
      },
      "scheduled_start": "2024-11-15T09:00:00Z",
      "duration_minutes": 30,
      "type": "FOLLOW_UP",
      "status": "SCHEDULED",
      "reason": "Blood pressure check",
      "confirmation_code": "APT-2024-0999"
    }
  ],
  "pagination": {
    "total": 50,
    "offset": 0,
    "limit": 20,
    "has_more": true
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### POST /api/v1/appointments

Create new appointment.

**Request**

```json
{
  "patient_id": "pat_456",
  "provider_id": "usr_123",
  "scheduled_start": "2024-11-15T09:00:00Z",
  "duration_minutes": 30,
  "type": "FOLLOW_UP",
  "reason": "Blood pressure check",
  "notes": "Patient requested early morning slot"
}
```

**Response** `201 Created`

```json
{
  "data": {
    "id": "apt_999",
    "confirmation_code": "APT-2024-0999",
    "status": "SCHEDULED",
    "reminders_scheduled": ["EMAIL", "SMS"]
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### PUT /api/v1/appointments/:id

Update appointment.

**Request**

```json
{
  "scheduled_start": "2024-11-15T10:00:00Z",
  "notes": "Rescheduled per patient request"
}
```

**Response** `200 OK`

---

### DELETE /api/v1/appointments/:id

Cancel appointment.

**Request**

```json
{
  "reason": "Patient called to cancel"
}
```

**Response** `200 OK`

---

### GET /api/v1/appointments/schedule/daily

Get daily schedule for provider.

**Query Parameters**

- `provider_id`: Provider UUID
- `date`: Date in YYYY-MM-DD format (default: today)

**Response** `200 OK`

```json
{
  "data": {
    "date": "2024-11-15",
    "provider_id": "usr_123",
    "appointments": [
      {
        "id": "apt_999",
        "patient": {
          "id": "pat_456",
          "name": "John Doe",
          "age": 44
        },
        "scheduled_start": "2024-11-15T09:00:00Z",
        "duration_minutes": 30,
        "type": "FOLLOW_UP",
        "status": "CONFIRMED",
        "reason": "Blood pressure check"
      }
    ],
    "summary": {
      "total_appointments": 12,
      "confirmed": 10,
      "scheduled": 2,
      "completed": 0
    }
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## Visit Documentation Endpoints

### POST /api/v1/visits

Create new visit documentation.

**Request**

```json
{
  "appointment_id": "apt_999",
  "patient_id": "pat_456",
  "provider_id": "usr_123",
  "visit_date": "2024-11-15",
  "visit_type": "FOLLOW_UP",
  "vitals": {
    "blood_pressure_systolic": 120,
    "blood_pressure_diastolic": 80,
    "heart_rate": 72,
    "temperature_celsius": 36.6,
    "weight_kg": 75,
    "height_cm": 175,
    "oxygen_saturation": 98
  },
  "soap_note": {
    "subjective": "Patient reports feeling well...",
    "objective": "BP 120/80, HR 72, regular rhythm...",
    "assessment": "Hypertension well-controlled",
    "plan": "Continue current medications, follow-up in 3 months"
  },
  "diagnoses": [
    {
      "icd10_code": "I10",
      "description": "Essential hypertension",
      "is_primary": true
    }
  ],
  "prescriptions": [
    {
      "medication_name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "Once daily",
      "duration": "90 days",
      "refills": 2
    }
  ]
}
```

**Response** `201 Created`

```json
{
  "data": {
    "id": "vst_555",
    "status": "DRAFT",
    "created_at": "2024-11-15T09:45:00Z"
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### GET /api/v1/visits/:id

Get visit details.

**Response** `200 OK`

---

### PUT /api/v1/visits/:id

Update visit (only if status is DRAFT).

**Request**

```json
{
  "soap_note": {
    "subjective": "Updated subjective notes...",
    "objective": "Updated objective findings...",
    "assessment": "Updated assessment...",
    "plan": "Updated treatment plan..."
  }
}
```

**Response** `200 OK`

---

### POST /api/v1/visits/:id/sign

Digitally sign visit note.

**Response** `200 OK`

```json
{
  "data": {
    "id": "vst_555",
    "status": "SIGNED",
    "signed_at": "2024-11-15T10:00:00Z",
    "signed_by": "usr_123"
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### POST /api/v1/visits/:id/lock

Lock visit note (prevents further edits).

**Response** `200 OK`

---

## Prescription Endpoints

### GET /api/v1/prescriptions

List prescriptions with filters.

**Query Parameters**

- `patient_id` (optional): Filter by patient
- `provider_id` (optional): Filter by provider
- `status` (optional): Filter by status
- `limit`, `offset`: Pagination

**Response** `200 OK`

---

### POST /api/v1/prescriptions

Create new prescription.

**Request**

```json
{
  "visit_id": "vst_555",
  "patient_id": "pat_456",
  "provider_id": "usr_123",
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
  "prescribed_date": "2024-11-15"
}
```

**Response** `201 Created`

---

## Document Generation Endpoints

### POST /api/v1/documents/generate

Generate document from template.

**Request**

```json
{
  "template_id": "tpl_medical_cert",
  "patient_id": "pat_456",
  "visit_id": "vst_555",
  "data": {
    "diagnosis": "Acute upper respiratory infection",
    "rest_days": 3,
    "restrictions": "Light duty only"
  }
}
```

**Response** `201 Created`

```json
{
  "data": {
    "id": "doc_888",
    "document_type": "MEDICAL_CERTIFICATE",
    "download_url": "/api/v1/documents/doc_888/download",
    "generated_at": "2024-11-01T10:30:00Z"
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### GET /api/v1/documents/:id/download

Download generated document.

**Response** `200 OK` (PDF file)

Headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="medical_certificate_20241101.pdf"
```

---

## Reporting Endpoints

### GET /api/v1/reports/appointments

Get appointment statistics.

**Query Parameters**

- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `provider_id` (optional): Filter by provider

**Response** `200 OK`

```json
{
  "data": {
    "period": {
      "start": "2024-10-01",
      "end": "2024-10-31"
    },
    "total_appointments": 250,
    "by_status": {
      "completed": 220,
      "cancelled": 15,
      "no_show": 15
    },
    "by_type": {
      "new_patient": 50,
      "follow_up": 180,
      "urgent": 20
    },
    "utilization_rate": 88.0,
    "average_duration_minutes": 28
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### GET /api/v1/reports/patients

Get patient statistics.

**Query Parameters**

- `start_date` (optional): Start date
- `end_date` (optional): End date

**Response** `200 OK`

```json
{
  "data": {
    "total_patients": 1500,
    "active_patients": 1350,
    "new_patients_period": 45,
    "by_age_group": {
      "0-18": 150,
      "19-35": 300,
      "36-50": 400,
      "51-65": 400,
      "66+": 250
    },
    "by_gender": {
      "M": 720,
      "F": 750,
      "OTHER": 30
    }
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## System Settings Endpoints

### GET /api/v1/settings

Get system settings (Admin only).

**Response** `200 OK`

```json
{
  "data": {
    "general": {
      "clinic_name": "Springfield Medical Center",
      "clinic_address": "123 Main St, Springfield, IL 62701",
      "clinic_phone": "+1-555-0100"
    },
    "appointment": {
      "default_duration_minutes": 30,
      "booking_advance_days": 90,
      "cancellation_hours": 24
    },
    "notification": {
      "reminder_hours_before": 24,
      "email_enabled": true,
      "sms_enabled": true
    },
    "security": {
      "session_timeout_minutes": 30,
      "mfa_required": true,
      "password_expiry_days": 90
    }
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

### PUT /api/v1/settings

Update system settings (Admin only).

**Request**

```json
{
  "appointment": {
    "default_duration_minutes": 45
  }
}
```

**Response** `200 OK`

---

## Audit Log Endpoints

### GET /api/v1/audit-logs

Get audit logs (Admin only).

**Query Parameters**

- `user_id` (optional): Filter by user
- `entity_type` (optional): Filter by entity type
- `action` (optional): Filter by action
- `start_date`, `end_date`: Date range
- `limit`, `offset`: Pagination

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": 12345,
      "user_id": "usr_123",
      "user_name": "Dr. Smith",
      "action": "UPDATE",
      "entity_type": "PATIENT",
      "entity_id": "pat_456",
      "changes": {
        "phone_primary": {
          "old": "+1-555-0123",
          "new": "+1-555-0999"
        }
      },
      "ip_address": "192.168.1.100",
      "created_at": "2024-11-01T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 5000,
    "offset": 0,
    "limit": 20,
    "has_more": true
  },
  "metadata": {
    "timestamp": "2024-11-01T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## Webhooks (Future Enhancement)

Webhooks will be available for real-time notifications of events:

- `appointment.created`
- `appointment.updated`
- `appointment.cancelled`
- `visit.signed`
- `prescription.created`

---

## SDK Support

Official SDKs will be provided for:

- TypeScript/JavaScript
- Python
- Java
- C# .NET

---

## Changelog

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

**Last Updated**: October 2025
**API Version**: 1.0.0
**Status**: Under Development
