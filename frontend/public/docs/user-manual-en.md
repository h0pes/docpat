# DocPat User Manual

**Version 1.0 | January 2026**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Dashboard](#3-dashboard)
4. [Patient Management](#4-patient-management)
5. [Appointments](#5-appointments)
6. [Clinical Visits](#6-clinical-visits)
7. [Prescriptions](#7-prescriptions)
8. [Documents](#8-documents)
9. [Reports](#9-reports)
10. [Notifications](#10-notifications)
11. [Administration](#11-administration)
12. [Troubleshooting](#12-troubleshooting)
13. [Appendix](#13-appendix)

---

## 1. Introduction

### 1.1 What is DocPat?

DocPat is a comprehensive Medical Practice Management System (MPMS) designed specifically for individual medical practitioners. Built with a focus on simplicity, security, and ease of use, DocPat provides healthcare professionals with all the tools needed to manage their practice efficiently.

DocPat enables you to:

- **Manage Patient Records**: Maintain comprehensive patient demographics, medical history, allergies, chronic conditions, and emergency contacts in one centralized location.
- **Schedule Appointments**: Use an intuitive calendar interface with day, week, and month views. Supports recurring appointments and automatic conflict detection.
- **Document Clinical Visits**: Record clinical encounters using the industry-standard SOAP (Subjective, Objective, Assessment, Plan) format with digital signatures.
- **Write Prescriptions**: Create prescriptions with automatic drug interaction checking, refill tracking, and template support.
- **Generate Documents**: Produce professional medical certificates, referral letters, lab requests, and visit summaries using customizable templates.
- **Track Analytics**: Monitor practice performance with detailed reports on appointments, patients, diagnoses, and provider productivity.
- **Manage Notifications**: Send appointment reminders and document deliveries via email with full tracking.

### 1.2 Target Audience

DocPat is designed for:

- **Individual Medical Practitioners**: Geriatricians, general practitioners, specialists, and alternative medicine providers (such as acupuncturists)
- **Small Medical Practices**: Solo practices or small clinics with one to three practitioners
- **Administrative Staff**: Office managers and medical assistants who handle scheduling and documentation

### 1.3 Key Features

| Feature | Description |
|---------|-------------|
| Patient Management | Complete CRUD operations with search, filtering, and medical history tracking |
| Appointment Scheduling | Calendar views, conflict detection, recurring appointments, status workflow |
| Clinical Documentation | SOAP notes, vital signs, ICD-10 diagnoses, digital signatures, templates |
| Prescriptions | Drug database search, interaction warnings, refill management, templates |
| Document Generation | Template system with variables, PDF generation, email delivery |
| Reports & Analytics | Four report types with charts, date filtering, and multi-format export |
| Notifications | Email notifications with status tracking, retry functionality |
| Administration | User management, system settings, audit logs, health monitoring |

### 1.4 System Requirements

#### Browser Requirements

DocPat is a web-based application that runs in modern browsers:

| Browser | Minimum Version |
|---------|-----------------|
| Google Chrome | 100+ |
| Mozilla Firefox | 100+ |
| Apple Safari | 15+ |
| Microsoft Edge | 100+ |

**Note**: Internet Explorer is not supported. For the best experience, we recommend using the latest version of Google Chrome or Mozilla Firefox.

#### Screen Resolution

- **Minimum**: 1024×768 pixels
- **Recommended**: 1920×1080 pixels or higher
- **Mobile**: DocPat supports responsive design for tablets and smartphones, though desktop use is recommended for clinical documentation

#### Network Requirements

- Stable internet connection (minimum 1 Mbps)
- HTTPS access to your DocPat server
- Ports 443 (HTTPS) must be accessible

#### Additional Requirements

- **PDF Viewer**: Built into most modern browsers for viewing generated documents
- **Authenticator App**: Google Authenticator, Authy, or similar for Multi-Factor Authentication (MFA)

### 1.5 Security Overview

DocPat implements enterprise-grade security to protect sensitive medical data:

#### Data Encryption

- **At Rest**: All sensitive patient data is encrypted using AES-256 encryption in the database
- **In Transit**: All communications use TLS 1.3 with HTTP Strict Transport Security (HSTS)

#### Authentication & Access Control

- **Multi-Factor Authentication (MFA)**: Optional but strongly recommended TOTP-based second factor
- **Role-Based Access Control (RBAC)**: Two roles (Admin, Doctor) with granular permissions
- **Session Management**: Automatic session timeout after 30 minutes of inactivity
- **Account Lockout**: Accounts are temporarily locked after 5 failed login attempts

#### Audit & Compliance

- **Comprehensive Audit Logging**: Every action on patient data is logged with user, timestamp, and change details
- **Immutable Logs**: Audit records cannot be modified or deleted
- **HIPAA Considerations**: DocPat is designed with HIPAA compliance principles in mind

---

## 2. Getting Started

### 2.1 Accessing DocPat

To access DocPat:

1. Open your web browser
2. Navigate to your DocPat server URL (provided by your administrator)
3. You will see the login page with the DocPat logo

### 2.2 Login Process

> **📸 Screenshot needed:** Login page showing username/password fields, "Remember Me" checkbox, and "Sign In" button
>
> *File: `screenshots/login-page.png`*

#### Standard Login

1. **Enter Username**: Type your username in the first field (minimum 3 characters)
2. **Enter Password**: Type your password in the second field (minimum 8 characters)
   - Click the eye icon to show/hide your password
3. **Remember Me** (Optional): Check this box on trusted devices to stay logged in
4. **Click "Sign In"**: The button will show a loading spinner while authenticating

#### Login with Multi-Factor Authentication (MFA)

If MFA is enabled on your account:

1. Complete the standard login steps above
2. A new screen appears requesting your verification code
3. Open your authenticator app (Google Authenticator, Authy, etc.)
4. Enter the 6-digit code displayed in the app
5. Click "Verify" to complete login

> **📸 Screenshot needed:** MFA verification screen with 6-digit code input field
>
> *File: `screenshots/mfa-verification.png`*

**Important**: Codes refresh every 30 seconds. If your code is rejected, wait for the next code.

#### Forgot Password

If you forget your password:

1. Click the "Forgot password?" link below the login form
2. Enter your registered email address
3. Click "Send Reset Link"
4. Check your email for a password reset link
5. Click the link and create a new password meeting these requirements:
   - At least 8 characters
   - At least one uppercase letter (A-Z)
   - At least one lowercase letter (a-z)
   - At least one number (0-9)
   - At least one special character (!@#$%^&*)

### 2.3 Understanding the Interface

Once logged in, the DocPat interface consists of four main areas:

> **📸 Screenshot needed:** Full application interface showing sidebar, header bar, and main content area
>
> *File: `screenshots/main-interface-overview.png`*

#### Sidebar (Left Panel)

The sidebar provides navigation to all DocPat modules. It is organized into three sections:

**Clinical Features** (visible to all users):
- Dashboard – Practice overview and quick actions
- Patients – Patient record management
- Appointments – Calendar and scheduling
- Visits – Clinical documentation
- Prescriptions – Medication management
- Documents – Document generation
- Reports – Analytics and statistics
- Notifications – Message tracking

**Administration** (visible to Admin users only):
- Document Templates – Template management
- Users – User account management
- Settings – System configuration
- Audit Logs – Activity monitoring
- System Health – Server status

**Personal**:
- Profile – Your account settings
- Help – Documentation and support

#### Header (Top Bar)

The header contains:

- **Menu Button** (mobile only): Opens the sidebar drawer
- **Breadcrumbs**: Shows your current location in the application
- **Global Search**: Quick search across patients and records
- **Notifications Bell**: Shows unread notification count
- **Logout Button**: Sign out of DocPat
- **Theme Switcher**: Toggle between Light, Dark, or System theme
- **Language Selector**: Switch between English and Italian

#### Main Content Area

The central area displays the current page content, including forms, lists, charts, and details.

#### Status Indicators

Throughout the interface, you'll see visual indicators:

- **Green**: Success, active, or positive status
- **Yellow/Orange**: Warning, pending, or attention needed
- **Red**: Error, failed, or negative status
- **Blue**: Information or minor alerts
- **Gray**: Inactive, completed, or neutral status

### 2.4 User Roles and Permissions

DocPat uses two user roles with different access levels:

#### Admin Role

Administrators have full system access including:

- All clinical features (Patients, Appointments, Visits, Prescriptions, Documents, Reports, Notifications)
- User management (create, edit, activate/deactivate users)
- System settings configuration
- Document template management
- Audit log access
- System health monitoring
- Delete capabilities for most records

#### Doctor Role

Doctors have access to clinical features:

- Full access to Patients, Appointments, Visits, Prescriptions, Documents
- Access to Reports and Notifications
- Can sign and lock visits
- Cannot access administrative functions (Users, Settings, Audit Logs)
- Limited delete capabilities

### 2.5 Setting Up Your Profile

After first login, configure your profile:

1. Click **Profile** in the sidebar (or click your avatar in the header)
2. Review your personal information displayed:
   - Avatar (shows your initials)
   - Full name and username
   - Role badge (ADMIN or DOCTOR)
   - Contact information
   - Account dates

### 2.6 Enabling Multi-Factor Authentication (MFA)

We strongly recommend enabling MFA for enhanced security:

1. Navigate to **Profile** from the sidebar
2. Scroll to the **Security Settings** section
3. You'll see your current MFA status (Enabled or Disabled)
4. Click **"Enable MFA"** button

**MFA Setup Process**:

1. A dialog appears with a QR code
2. Open your authenticator app (Google Authenticator, Authy, Microsoft Authenticator)
3. Tap the "+" or "Add Account" button in the app
4. **Scan the QR Code** displayed in DocPat
   - Alternatively, click "Can't scan? Enter manually" and type the secret key
5. The app will generate a 6-digit code
6. Enter this code in the verification field
7. Click **"Verify and Enable"**
8. **Important**: Save the backup codes shown – these can be used if you lose access to your authenticator app

> **📸 Screenshot needed:** MFA setup dialog showing QR code and verification code input
>
> *File: `screenshots/mfa-setup-dialog.png`*

**Note**: If your administrator has made MFA mandatory, you will be prompted to set it up on first login and cannot skip this step.

### 2.7 Disabling MFA

To disable MFA (if allowed by system settings):

1. Navigate to **Profile**
2. In the Security Settings section, click **"Disable MFA"**
3. A confirmation dialog appears warning about reduced security
4. Click **"Confirm Disable"** to proceed

**Warning**: Disabling MFA reduces your account security. Only disable if absolutely necessary.

### 2.8 Changing Your Theme

DocPat supports light and dark themes:

1. Click the **theme icon** (sun/moon) in the header
2. Select your preference:
   - **Light**: Bright background, dark text
   - **Dark**: Dark background, light text
   - **System**: Automatically matches your device settings

> **📸 Screenshot needed:** Theme switcher dropdown showing Light/Dark/System options
>
> *File: `screenshots/theme-switcher.png`*

Your preference is saved and persists across sessions.

### 2.9 Changing the Language

DocPat supports English and Italian:

1. Click the **language selector** (flag icon) in the header
2. Select your preferred language:
   - **English** (EN)
   - **Italian** (IT)

All interface text, labels, and messages will update immediately.

### 2.10 Logging Out

To securely log out:

1. Click the **Logout button** in the header
2. You will be redirected to the login page
3. Your session is terminated on the server

**Automatic Logout**: Sessions automatically expire after 30 minutes of inactivity for security.

---

## 3. Dashboard

### 3.1 Overview

The Dashboard is your home page in DocPat, providing an at-a-glance view of your practice activity and quick access to common tasks. It's the first page you see after logging in.

> **📸 Screenshot needed:** Dashboard page showing statistics cards, recent activity, and quick actions
>
> *File: `screenshots/dashboard-overview.png`*

### 3.2 Statistics Cards

The top section displays four statistics cards in a row:

#### Active Patients Card
- **Icon**: Users (people icon)
- **Value**: Total count of active patients in your practice
- **Subtitle**: "Active"
- **Click Action**: Navigates to the Patients page

#### Appointments Today Card
- **Icon**: Calendar
- **Value**: Number of appointments scheduled for today
- **Subtitle**: "Today"
- **Click Action**: Navigates to the Appointments page

#### Visits This Week Card
- **Icon**: Document (file icon)
- **Value**: Number of visits recorded this week
- **Subtitle**: "This week"
- **Click Action**: Navigates to the Visits page

#### Active Prescriptions Card
- **Icon**: Pill
- **Value**: Number of currently active prescriptions
- **Subtitle**: "Active"
- **Click Action**: Navigates to the Prescriptions page

**Note**: Click any card to navigate directly to that module's detailed view.

### 3.3 Recent Activity Section

The Recent Activity section (left side) shows your most recent interactions:

#### Recent Appointments

Displays up to 3 recent appointments with:
- Patient name
- Appointment type (e.g., Follow-up, Consultation)
- Scheduled date and time
- Status badge (COMPLETED, SCHEDULED, etc.)

Click any appointment row to view its full details.

#### Recent Visits

Displays up to 2 recent clinical visits with:
- Patient name
- Visit type
- Visit date
- Status badge (DRAFT, SIGNED, LOCKED)

Click any visit row to view its full documentation.

**"View All Activity"** button: Opens a complete activity history.

### 3.4 Quick Actions Section

The Quick Actions section (right side) provides one-click buttons for common tasks:

| Button | Action |
|--------|--------|
| **New Appointment** | Opens the appointment creation form |
| **New Patient** | Opens the patient registration form |
| **New Visit** | Opens patient selector, then visit creation form |
| **New Prescription** | Opens the prescription creation form |

These buttons provide the fastest way to perform routine tasks.

### 3.5 Error Handling

If data fails to load:

1. An error message appears at the top of the Dashboard
2. A **Refresh** button is provided
3. Click Refresh to retry loading the data
4. If the error persists, contact your administrator

### 3.6 Loading States

While data loads:
- Statistics cards display skeleton placeholders (gray rectangles)
- Activity lists show loading indicators
- Buttons remain functional during data load

---

## 4. Patient Management

### 4.1 Overview

The Patient Management module is the foundation of DocPat, allowing you to maintain comprehensive records for all your patients. From this module, you can add new patients, search existing records, view patient details, and manage patient history.

### 4.2 Accessing Patient Management

Navigate to **Patients** from the sidebar. You will see:

- **Header**: "Patients" title with total patient count badge
- **New Patient Button**: Primary button to add new patients
- **Patient List**: Searchable, filterable list of all patients

> **📸 Screenshot needed:** Patient list page showing search bar, filters, and patient cards/rows
>
> *File: `screenshots/patient-list.png`*

### 4.3 Patient List Features

#### Search Functionality

The search bar at the top allows you to find patients by:
- First name or last name
- Medical Record Number (MRN)
- Phone number
- Email address
- Fiscal code

Results update as you type (with debounce for performance).

#### Filters

Click the filter icon to access additional filters:
- **Status**: Active or Inactive patients
- **Gender**: Male, Female, Other
- **Date Range**: Filter by registration date

#### List Display

Each patient card/row shows:
- Patient name (clickable to view details)
- Date of birth and age
- Phone number
- Medical Record Number (MRN)
- Status badge (Active/Inactive)
- Quick action buttons

#### Pagination

For large patient lists:
- Navigate using page numbers
- Select items per page (10, 25, 50, 100)
- "Showing X-Y of Z patients" indicator

### 4.4 Adding a New Patient

1. Click the **"New Patient"** button
2. You are taken to the Patient Form page

> **📸 Screenshot needed:** New patient form showing demographics section with required fields
>
> *File: `screenshots/patient-form-demographics.png`*

#### Demographics Section (Required Fields)

| Field | Requirements | Description |
|-------|--------------|-------------|
| **First Name*** | Required, max 100 characters | Patient's first name |
| **Last Name*** | Required, max 100 characters | Patient's surname |
| Middle Name | Optional, max 100 characters | Middle name if applicable |
| **Date of Birth*** | Required, must be past date | Use the calendar picker |
| **Gender*** | Required, dropdown | Male, Female, or Other |
| Fiscal Code | Optional, exactly 16 alphanumeric characters | Italian tax code |

#### Contact Information Section

| Field | Requirements | Description |
|-------|--------------|-------------|
| Primary Phone | Optional, max 20 characters | Main contact number |
| Secondary Phone | Optional, max 20 characters | Alternative number |
| Email | Optional, valid email format | Patient's email address |
| **Preferred Contact*** | Required, dropdown | PHONE, EMAIL, or SMS |

#### Address Section

| Field | Requirements | Description |
|-------|--------------|-------------|
| Street Address | Optional, max 255 characters | Street name and number |
| City | Optional, max 100 characters | City or town |
| State/Province | Optional, max 50 characters | Region or province |
| Zip Code | Optional, max 20 characters | Postal code |
| Country | Default: IT, max 2 characters | Country code |

#### Emergency Contact Section

| Field | Requirements | Description |
|-------|--------------|-------------|
| Contact Name | Optional, max 200 characters | Emergency contact person |
| Relationship | Optional, max 50 characters | Relation to patient (e.g., Spouse, Child) |
| Contact Phone | Optional, max 20 characters | Emergency phone number |

#### Medical Information Section

| Field | Requirements | Description |
|-------|--------------|-------------|
| Blood Type | Optional, max 10 characters | A+, A-, B+, B-, AB+, AB-, O+, O- |
| Allergies | Optional, comma-separated | List of known allergies |
| Chronic Conditions | Optional, comma-separated | Ongoing medical conditions |
| Health Card Expiration | Optional, date picker | Expiration date of health insurance card |

#### Notes Section

| Field | Requirements | Description |
|-------|--------------|-------------|
| Notes | Optional, textarea | Any additional notes about the patient |

#### Saving the Patient

1. Fill in all required fields (marked with *)
2. Optionally complete additional fields
3. Click **"Save"** button
4. If validation errors occur, they appear below each field in red
5. On success, you are redirected to the patient's detail page

### 4.5 Viewing Patient Details

Click on any patient in the list to view their complete profile.

> **📸 Screenshot needed:** Patient detail page showing patient info card and associated records
>
> *File: `screenshots/patient-detail.png`*

#### Patient Detail Page Layout

**Header Section**:
- Back button (returns to patient list)
- Patient's full name as title
- Action buttons:
  - **New Visit**: Create a visit for this patient
  - **Edit**: Modify patient information
  - **Reactivate** (if inactive): Restore an inactive patient
  - **Delete** (Admin only): Remove patient record

**Patient Information Card**:

The PatientDetail component displays all patient information organized in sections:

1. **Demographics**: Name, DOB, age, gender, fiscal code, MRN
2. **Contact Information**: Phone numbers, email, preferred contact method
3. **Address**: Full address details
4. **Emergency Contact**: Emergency contact information
5. **Medical Information**: Blood type, allergies, chronic conditions, health card

**Associated Records**:

Below the patient information, you'll find:

- **Visit History**: Recent visits with status, type, date, and chief complaint
  - "View All" button to see complete history
  - Eye icon to view individual visit

- **Prescriptions**: Active and past prescriptions
  - "New Prescription" button
  - View all prescriptions link

- **Documents**: Generated documents for this patient
  - "Generate Document" button
  - Download/email options for existing documents

- **Notifications**: History of notifications sent to this patient

### 4.6 Editing Patient Information

1. Open the patient's detail page
2. Click the **"Edit"** button in the header
3. The Patient Form opens with pre-filled data
4. Make your changes
5. Click **"Save"**
6. Changes are logged in the audit trail

### 4.7 Deactivating a Patient

To deactivate a patient (rather than delete):

1. This is handled through patient status management
2. Deactivated patients:
   - Remain in the database for historical records
   - Are hidden from default patient searches
   - Can be reactivated later

### 4.8 Reactivating a Patient

If a patient was previously deactivated:

1. Search for the patient (include inactive in filters)
2. Open their detail page
3. Click **"Reactivate"** button
4. Confirm the reactivation in the dialog
5. Patient becomes active again

### 4.9 Deleting a Patient (Admin Only)

**Warning**: Deletion should be rare. Consider deactivation instead.

1. Open the patient's detail page
2. Click the **"Delete"** button (trash icon)
3. A confirmation dialog appears:
   - Title: "Confirm Deletion"
   - Message: "Are you sure you want to delete [Patient Name]?"
4. Click **"Delete"** to confirm or **"Cancel"** to abort
5. Deleted patients cannot be recovered

**Note**: Patients with associated visits or prescriptions may have restrictions on deletion to maintain data integrity.

### 4.10 Patient Medical History

The patient's medical history is maintained through:

- **Allergies**: Listed in patient profile, visible to all providers
- **Chronic Conditions**: Listed in patient profile
- **Visit History**: Complete record of all clinical encounters
- **Prescription History**: All medications prescribed
- **Document History**: All generated documents

### 4.11 Best Practices for Patient Management

1. **Complete Demographics**: Fill in all available patient information for better records
2. **Verify Contact Information**: Confirm phone/email for appointment reminders
3. **Update Regularly**: Review and update patient information at each visit
4. **Document Allergies**: Always record allergies prominently for safety
5. **Use Fiscal Code**: For Italian patients, the fiscal code aids in identification
6. **Emergency Contacts**: Always request emergency contact information

---

## 5. Appointments

### 5.1 Overview

The Appointments module provides a full-featured calendar interface for scheduling, managing, and tracking patient appointments. It supports multiple calendar views, recurring appointments, conflict detection, and status workflow management.

### 5.2 Accessing the Appointments Module

Navigate to **Appointments** from the sidebar. You will see:

- **Header**: Calendar icon, "Appointments" title, appointment count
- **Action Buttons**: Print Schedule, New Appointment
- **Statistics Cards**: Four cards showing appointment metrics
- **Calendar View**: Interactive calendar component

### 5.3 Appointment Statistics

The top section displays four statistics cards:

| Card | Description |
|------|-------------|
| **Upcoming Today** | Number of appointments scheduled for today |
| **Upcoming This Week** | Total appointments for the current week |
| **No-Show Rate** | Percentage of patients who didn't attend (historical) |
| **Cancellation Rate** | Percentage of cancelled appointments (historical) |

### 5.4 Calendar Views

The calendar supports three view modes:

> **📸 Screenshot needed:** Week view of the appointment calendar showing scheduled appointments
>
> *File: `screenshots/calendar-week-view.png`*

#### Day View

- Shows a single day with hourly time slots
- Best for detailed daily scheduling
- Each hour displays appointments in that slot
- Color-coded by appointment type
- Click on empty slot to create appointment
- Click on appointment to view/edit

#### Week View (Default)

- Shows 7 days (Monday through Sunday)
- Provides weekly overview
- Time slots shown vertically
- Compact appointment display
- Ideal for planning the week ahead

#### Month View

- Shows entire calendar month
- Best for long-term planning
- Days with appointments show indicators
- Click on a day to see that day's appointments
- Quick navigation between months

#### Calendar Navigation

- **Previous/Next Arrows**: Move backward/forward by view period
- **Today Button**: Jump to current date
- **View Selector**: Switch between Day/Week/Month
- **Date Picker**: Jump to specific date

### 5.5 Creating an Appointment

#### Method 1: New Appointment Button

1. Click **"New Appointment"** button in the header
2. The appointment form opens

#### Method 2: Click on Calendar

1. Click on an empty time slot in the calendar
2. The appointment form opens with date/time pre-filled

#### Appointment Form Fields

> **📸 Screenshot needed:** New appointment form with patient selection, date/time picker, and type dropdown
>
> *File: `screenshots/appointment-form.png`*

**Patient Selection**:
- Type patient name to search
- Select from dropdown results
- Patient info displays after selection

**Provider** (auto-filled):
- Shows current logged-in provider
- Admins can select different provider

**Date Selection**:
- Calendar picker opens on click
- Disabled dates: non-working days, holidays
- Past dates are not selectable

**Time Selection**:
- Dropdown of available time slots
- Based on working hours configuration
- Unavailable slots are marked
- Shows availability indicator

**Appointment Type** (Required):

| Type | Typical Duration |
|------|-----------------|
| NEW_PATIENT | 45-60 minutes |
| FOLLOW_UP | 20-30 minutes |
| URGENT | 15-20 minutes |
| CONSULTATION | 30-45 minutes |
| ROUTINE_CHECKUP | 20-30 minutes |
| ACUPUNCTURE | 45-60 minutes |

**Duration** (minutes):
- Auto-filled based on appointment type
- Can be manually adjusted
- Minimum: 15 minutes
- Maximum: 480 minutes (8 hours)

**Reason for Visit** (Optional):
- Text field for appointment reason
- Maximum 2000 characters

**Notes** (Optional):
- Additional notes for the appointment
- Maximum 5000 characters
- Visible to clinical staff

#### Recurring Appointments

To create repeating appointments:

1. Check **"Make this a recurring appointment"**
2. Select **Frequency**:
   - Daily
   - Weekly
   - Bi-Weekly
   - Monthly
   - Yearly
3. Set **Interval**: How many frequency units between appointments (1-52)
4. Choose **End Condition**:
   - End Date: Appointments stop after this date
   - Max Occurrences: Stop after X appointments (1-100)

Example: Weekly on Tuesdays for 8 weeks

#### Notification Options

Configure appointment reminders:
- Check **"Send appointment notification"**
- Select reminder timing (e.g., 24 hours before, 1 hour before)
- Email notification will be sent to patient

#### Saving the Appointment

1. Complete all required fields
2. Click **"Save"**
3. If conflicts detected, a warning dialog appears
4. Confirm or adjust the appointment
5. On success, the calendar updates and appointment appears

### 5.6 Conflict Detection

DocPat automatically detects scheduling conflicts:

**Types of Conflicts**:
- Double-booking the same provider
- Overlapping appointment times
- Appointments outside working hours
- Appointments on holidays

**When Conflict Detected**:
1. A **Conflict Warning Dialog** appears
2. Shows the conflicting appointment(s)
3. Options:
   - **Cancel**: Go back and change time
   - **Save Anyway**: Override and create (if permitted)

### 5.7 Appointment Status Workflow

Appointments follow a defined status progression:

> **📸 Screenshot needed:** Appointment detail panel showing status badges and action buttons
>
> *File: `screenshots/appointment-status-actions.png`*

```
SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED
                ↓               ↓
            CANCELLED       NO_SHOW
```

#### Status Descriptions

| Status | Description | Next Actions |
|--------|-------------|--------------|
| **SCHEDULED** | Initial state after creation | Confirm, Cancel |
| **CONFIRMED** | Patient has confirmed attendance | Start, Cancel |
| **IN_PROGRESS** | Patient is currently being seen | Complete |
| **COMPLETED** | Appointment finished successfully | Create Visit |
| **CANCELLED** | Appointment was cancelled | Reschedule |
| **NO_SHOW** | Patient didn't attend | Reschedule |

#### Changing Appointment Status

1. Click on the appointment in the calendar
2. View appointment details in the side panel or modal
3. Click the appropriate status button:
   - **Confirm**: Changes to CONFIRMED
   - **Start**: Changes to IN_PROGRESS
   - **Complete**: Changes to COMPLETED
   - **Mark No-Show**: Changes to NO_SHOW
   - **Cancel**: Opens cancellation dialog

### 5.8 Cancelling an Appointment

1. Click on the appointment to view details
2. Click **"Cancel"** button
3. The **Cancellation Dialog** appears:
   - Title: "Confirm Cancellation"
   - **Cancellation Reason** field (required)
   - Placeholder: "Reason for cancellation..."
4. Enter the reason
5. Click **"Confirm"** to cancel or **"Cancel"** to abort
6. The appointment status changes to CANCELLED
7. If notifications enabled, patient is notified

### 5.9 Rescheduling an Appointment

To reschedule (change date/time):

1. Click on the appointment
2. Click **"Edit"** or drag the appointment to a new time slot
3. Modify the date and/or time
4. Save changes
5. If notifications enabled, patient receives update

### 5.10 Viewing Appointment Details

Click any appointment to view:

- Patient name and contact info
- Appointment type and status
- Date, time, and duration
- Provider name
- Reason for visit
- Notes
- Status history
- Associated visit (if created)

### 5.11 Print Schedule

To print your daily schedule:

1. Click **"Print Schedule"** button in the header
2. Print dialog opens showing today's appointments
3. Use browser print function (Ctrl+P / Cmd+P)
4. Select printer and options
5. Print the schedule

### 5.12 Appointment Best Practices

1. **Confirm Appointments**: Contact patients to confirm 24-48 hours ahead
2. **Buffer Time**: Leave gaps between appointments for documentation
3. **Track No-Shows**: Monitor no-show rates and follow up with patients
4. **Use Recurring**: For regular follow-ups, use recurring appointments
5. **Document Cancellations**: Always record cancellation reasons
6. **Check Conflicts**: Review warnings before double-booking

---

## 6. Clinical Visits

### 6.1 Overview

The Clinical Visits module is the core clinical documentation system in DocPat. It allows healthcare providers to record patient encounters using the industry-standard SOAP (Subjective, Objective, Assessment, Plan) format, capture vital signs, document diagnoses, and digitally sign clinical records.

### 6.2 Accessing the Visits Module

Navigate to **Visits** from the sidebar. You will see:

- **Header**: "Visits" title with action buttons
- **Statistics Cards**: Three cards showing visit counts
- **Filters Card**: Search and filter options
- **Visits List**: All visits with status, patient, and date

### 6.3 Visit Statistics

Three statistics cards display:

| Card | Description |
|------|-------------|
| **Total Visits** | Complete count of all visits |
| **Draft Visits** | Visits not yet signed |
| **Signed/Locked Visits** | Completed clinical documentation |

### 6.4 Filtering Visits

The filter card provides several options:

| Filter | Description |
|--------|-------------|
| **Patient** | Search and select specific patient |
| **Status** | All, DRAFT, SIGNED, or LOCKED |
| **From Date** | Start of date range |
| **To Date** | End of date range |

Click **"Clear All"** to reset all filters.

### 6.5 Creating a New Visit

#### Step 1: Select Patient

1. Click **"New Visit"** button
2. A **Patient Selection Dialog** appears
3. Search for and select the patient
4. Click **"Continue"**
5. You are navigated to the visit form

#### Alternative: From Patient Detail

1. Open a patient's detail page
2. Click **"New Visit"** button in the header
3. Visit form opens with patient pre-selected

#### Alternative: From Appointment

1. Complete an appointment
2. Click **"Create Visit"** from the appointment
3. Visit form opens linked to that appointment

### 6.6 Visit Form Structure

The visit form is organized into sections following the SOAP format:

> **📸 Screenshot needed:** Visit form showing SOAP sections (Subjective, Objective, Assessment, Plan)
>
> *File: `screenshots/visit-form-soap.png`*

#### Visit Information Section

| Field | Requirements | Description |
|-------|--------------|-------------|
| **Visit Type*** | Required dropdown | Type of clinical encounter |
| **Visit Date*** | Required, auto-filled | Date and time of visit |
| **Template** | Optional | Pre-fill from template |

**Visit Types**:
- Initial Visit
- Follow-Up
- Annual Physical
- Urgent Care
- Consultation
- Acupuncture Session
- Wellness Check
- Pre-operative
- Post-operative

#### Subjective Section

Document the patient's reported symptoms and history:

| Field | Description |
|-------|-------------|
| **Chief Complaint*** | Primary reason for visit (required) |
| **History of Present Illness** | Detailed description of current symptoms |
| **Review of Systems** | Systematic review of body systems |
| **Past Medical History** | Relevant prior conditions |
| **Family History** | Relevant family medical history |
| **Social History** | Lifestyle factors, occupation, habits |

**Tips for Subjective Documentation**:
- Use patient's own words when possible
- Note duration, severity, and quality of symptoms
- Document what makes symptoms better or worse
- Include relevant negatives (denies fever, denies chest pain)

#### Objective Section

Document clinical findings from examination:

**Vital Signs** (with automatic validation):

> **📸 Screenshot needed:** Vital signs input section showing BP, HR, temperature, weight, height fields
>
> *File: `screenshots/visit-vitals-section.png`*

| Vital Sign | Valid Range | Unit |
|------------|-------------|------|
| Blood Pressure Systolic | 70-250 | mmHg |
| Blood Pressure Diastolic | 40-150 | mmHg |
| Heart Rate | 30-250 | bpm |
| Respiratory Rate | 8-60 | breaths/min |
| Temperature | 35.0-42.0 | °C |
| Weight | 0.5-500 | kg |
| Height | 20-300 | cm |
| Oxygen Saturation | 70-100 | % |

**BMI**: Automatically calculated from height and weight.

**Physical Examination**:
- Text area for detailed examination findings
- Organize by body system
- Document normal and abnormal findings

#### Assessment Section

Document your clinical assessment and diagnoses:

**Adding Diagnoses**:

> **📸 Screenshot needed:** Diagnosis search dialog with ICD-10 code search results
>
> *File: `screenshots/visit-diagnosis-search.png`*

1. Click **"Add Diagnosis"** button
2. Search by ICD-10 code or description
3. Select diagnosis from search results
4. Choose diagnosis type:
   - **Provisional**: Suspected, pending confirmation
   - **Confirmed**: Verified diagnosis
   - **Differential**: Possible alternative diagnosis
   - **Rule Out**: To be excluded through testing
5. Add notes specific to this diagnosis
6. Click **"Add"**

**Managing Diagnoses**:
- View all added diagnoses in a list
- Edit diagnosis type or notes
- Remove diagnosis
- Reorder diagnoses by importance

**Clinical Reasoning**:
- Text area for assessment summary
- Explain your diagnostic reasoning
- Note differential diagnosis considerations

#### Plan Section

Document the treatment plan:

| Field | Description |
|-------|-------------|
| **Treatment Plan** | Detailed treatment approach |
| **Medications** | Link to prescriptions or medication notes |
| **Follow-Up** | When to return, conditions for earlier return |
| **Patient Education** | Instructions given to patient |
| **Referrals** | Specialist referrals needed |

### 6.7 Using Visit Templates

Templates pre-fill common visit patterns:

1. When creating a visit, click **"Select Template"** dropdown
2. Choose from available templates (e.g., "Annual Physical", "Diabetes Follow-Up")
3. Template content fills the form
4. Modify as needed for the specific patient
5. Continue with documentation

**Note**: Templates are managed by administrators in the Template management section.

### 6.8 Saving a Visit

#### Save as Draft

1. Complete documentation (partial or full)
2. Click **"Save"** button
3. Visit is saved with DRAFT status
4. Can be edited and saved again
5. Appears in your draft visits list

#### Auto-Save

DocPat automatically saves drafts periodically to prevent data loss.

### 6.9 Signing a Visit

Once documentation is complete:

1. Review all sections for completeness
2. Click **"Sign Visit"** button
3. A confirmation dialog appears:
   - Shows visit summary
   - Lists diagnoses
   - Displays vital signs summary
4. Review the information
5. Click **"Confirm Sign"**

**Signed Visit Characteristics**:
- Digital signature with timestamp is recorded
- Shows "Signed by [Provider Name] on [Date/Time]"
- Status changes to SIGNED
- Content becomes read-only (cannot edit)
- Only amendments can be added

### 6.10 Amending a Signed Visit

If you need to add information after signing:

1. Open the signed visit
2. Click **"Add Amendment"**
3. Enter the amendment text
4. Amendment is timestamped and attached
5. Original content remains unchanged
6. Amendments are visible in the audit trail

### 6.11 Locking a Visit

For permanent archival:

1. Open a SIGNED visit
2. Click **"Lock Visit"** button
3. Confirmation dialog appears with warning
4. Click **"Confirm Lock"**

**Locked Visit Characteristics**:
- Status changes to LOCKED
- Completely immutable (no amendments)
- Cannot be unlocked
- Preserved for legal/compliance purposes

### 6.12 Viewing Visit Details

Click any visit in the list to view:

- **Header**: Patient name, visit date, status badge
- **SOAP Sections**: All documentation displayed
- **Vital Signs**: Formatted vital signs with values
- **Diagnoses**: List with ICD-10 codes and types
- **Signature Information**: Who signed and when
- **Actions**: Based on current status

### 6.13 Visit Actions by Status

| Status | Available Actions |
|--------|-------------------|
| **DRAFT** | Edit, Save, Sign, Delete |
| **SIGNED** | View, Add Amendment, Lock, Print |
| **LOCKED** | View, Print |

### 6.14 Printing a Visit

To print visit documentation:

1. Open the visit detail
2. Click **"Print"** button
3. Print preview opens
4. Use browser print (Ctrl+P / Cmd+P)
5. Select printer and print

### 6.15 Visit Templates Management

Administrators can manage visit templates:

1. Click **"Manage Templates"** on the Visits page
2. View existing templates
3. Create new templates with pre-filled content
4. Edit template name, type, and content
5. Delete unused templates

### 6.16 Best Practices for Clinical Documentation

1. **Complete Documentation**: Fill all relevant sections thoroughly
2. **Real-Time Entry**: Document during or immediately after the visit
3. **Be Specific**: Use precise terminology and measurements
4. **Document Objectively**: Record findings without bias
5. **Include Pertinent Negatives**: Note relevant absent findings
6. **Sign Promptly**: Sign visits same day when possible
7. **Review Before Signing**: Once signed, changes require amendments
8. **Use Templates**: Leverage templates for efficiency
9. **Follow SOAP Order**: Maintain logical documentation flow
10. **Link to Appointments**: Connect visits to their appointments

---

## 7. Prescriptions

### 7.1 Overview

The Prescriptions module enables healthcare providers to create, manage, and track medication prescriptions. It includes drug database search, automatic drug interaction checking, refill management, and prescription templates for efficiency.

### 7.2 Accessing Prescriptions

Navigate to **Prescriptions** from the sidebar. You will see:

- **Header**: Pill icon, "Prescriptions" title
- **New Prescription Button**: Create new prescription
- **Filters**: Search and filter options
- **Prescription List**: Cards showing all prescriptions

### 7.3 Prescription List Features

#### Filters

| Filter | Options |
|--------|---------|
| **Patient** | Search and select patient |
| **Status** | All, Active, On Hold, Discontinued, Completed, Cancelled |
| **Expired** | Show/hide expired prescriptions |
| **Date Range** | Filter by prescription date |

#### Prescription Cards

Each prescription card displays:
- Medication name (generic and brand)
- Dosage and frequency
- Patient name
- Start/end dates
- Refill information
- Status badge (color-coded)
- Interaction warning badge (if applicable)

**Status Color Coding**:

| Status | Color | Description |
|--------|-------|-------------|
| **ACTIVE** | Green | Currently valid prescription |
| **ON_HOLD** | Yellow | Temporarily paused |
| **DISCONTINUED** | Orange | Stopped by provider |
| **COMPLETED** | Gray | Prescription course finished |
| **CANCELLED** | Red | Never started/cancelled |

### 7.4 Creating a Prescription

1. Click **"New Prescription"** button
2. The prescription form opens

> **📸 Screenshot needed:** Prescription form with medication search, dosage fields, and instructions
>
> *File: `screenshots/prescription-form.png`*

#### Prescription Form Fields

**Patient Selection** (Required):
- Search patient by name or MRN
- Select from results
- If coming from patient detail, pre-filled

**Medication Search**:
- Type medication name to search database
- Results show generic name, brand names, forms
- Select desired medication
- OR click **"Custom Medication"** for unlisted drugs

**Custom Medication Dialog**:
- Medication Name (required)
- Generic Name
- Strength/Dosage
- Form (tablet, capsule, liquid, etc.)
- Click "Add" to create custom entry

**Medication Details** (after selection):

| Field | Requirements | Description |
|-------|--------------|-------------|
| **Generic Name*** | Required | Generic medication name |
| **Brand Name** | Optional | Brand name if applicable |
| **Strength*** | Required | Dosage strength (e.g., "500mg") |
| **Form*** | Required dropdown | Tablet, Capsule, Liquid, Injection, Topical, etc. |

**Dosage Instructions**:

| Field | Requirements | Description |
|-------|--------------|-------------|
| **Quantity*** | Required number | Amount per dose (e.g., 1, 2) |
| **Unit*** | Required | tablet, capsule, ml, etc. |
| **Frequency*** | Required dropdown | Once daily, Twice daily, Every 8 hours, As needed, etc. |
| **Route*** | Required dropdown | Oral, Topical, Injection, Inhalation, etc. |
| **Start Date*** | Required | When to begin medication |
| **End Date** | Optional | When to stop (if known) |

**Refill Information**:

| Field | Requirements | Description |
|-------|--------------|-------------|
| **Refills Allowed** | Number | How many refills permitted (0 for none) |
| **Refill Frequency** | Dropdown | How often refills can be obtained |

**Special Instructions**:
- Text area for patient instructions
- Include:
  - Take with food/on empty stomach
  - Avoid certain activities
  - Warning signs to watch for
  - Storage instructions

### 7.5 Drug Interaction Checking

DocPat automatically checks for drug interactions:

**How It Works**:
1. When you add a medication, the system checks against:
   - Patient's other active prescriptions
   - Known drug-drug interactions database
2. Warnings appear immediately
3. Must acknowledge warnings before saving

**Interaction Severity Levels**:

| Level | Color | Description | Action Required |
|-------|-------|-------------|-----------------|
| **Contraindicated** | Red | Avoid this combination | Must not prescribe together |
| **Major** | Orange | Serious risk of interaction | Use alternative if possible |
| **Moderate** | Yellow | May cause problems | Use with caution |
| **Minor** | Blue | Low risk | Monitor patient |

**Interaction Warning Display**:
- Warning badge appears on prescription
- Click to see interaction details
- Shows: severity, description, clinical effects, recommendations

> **📸 Screenshot needed:** Drug interaction warning dialog showing severity level and clinical details
>
> *File: `screenshots/drug-interaction-warning.png`*

**Important**: Always review interaction warnings before finalizing prescriptions. Document clinical justification if overriding warnings.

### 7.6 Prescription Actions

#### View Prescription
- Click prescription card to see full details
- Shows all medication info, dosage, instructions
- Displays interaction information
- Lists refill history

#### Edit Prescription
- Open prescription detail
- Click **"Edit"** button
- Modify fields
- Save changes
- Only available for ACTIVE or ON_HOLD prescriptions

#### Renew Prescription
1. Open an ACTIVE prescription
2. Click **"Renew"** button
3. A new prescription is created with same details
4. New start date applied
5. Original prescription marked as COMPLETED

#### Discontinue Prescription
1. Open an ACTIVE prescription
2. Click **"Discontinue"** button
3. **Discontinue Dialog** appears:
   - Reason for discontinuation (required)
   - Effective date
4. Enter reason (e.g., "Side effects", "No longer needed")
5. Click **"Confirm"**
6. Status changes to DISCONTINUED

#### Resume Prescription
For ON_HOLD prescriptions:
1. Open the prescription
2. Click **"Resume"** button
3. Confirm in dialog
4. Status changes to ACTIVE

#### Print Prescription
1. Open prescription detail
2. Click **"Print"** button
3. Print dialog shows formatted prescription
4. Includes: patient info, medication, dosage, provider signature line
5. Print using browser print function

#### Delete Prescription (Admin Only)
1. Open prescription detail
2. Click **"Delete"** button
3. Confirm deletion
4. Prescription is removed (audit logged)

### 7.7 Prescription Templates

For frequently prescribed medications:

#### Using Templates
1. In prescription form, click **"Use Template"**
2. Select from available templates
3. Form pre-fills with template values
4. Adjust as needed for patient
5. Complete and save

#### Managing Templates (Admin)
1. Navigate to prescription templates section
2. View existing templates
3. Create new template:
   - Template name
   - Medication information
   - Default dosage and instructions
4. Edit or delete existing templates

### 7.8 Viewing Patient's Prescriptions

From a patient's detail page:
1. Scroll to **Prescriptions** section
2. See all prescriptions for that patient
3. View active, historical, and discontinued
4. Click **"New Prescription"** to add

### 7.9 Prescription Best Practices

1. **Check Interactions**: Always review interaction warnings
2. **Clear Instructions**: Provide specific, understandable instructions
3. **Document Rationale**: Note why medication was chosen
4. **Review Allergies**: Check patient allergies before prescribing
5. **Appropriate Duration**: Set proper treatment duration
6. **Monitor Refills**: Track refill requests
7. **Discontinue Properly**: Always document discontinuation reasons
8. **Use Templates**: Create templates for common prescriptions
9. **Follow Up**: Schedule follow-up for medication review
10. **Patient Education**: Ensure patient understands the prescription

---

## 8. Documents

### 8.1 Overview

The Documents module enables generation of professional medical documents including certificates, referral letters, lab requests, and visit summaries. It features a template system with variable substitution for customization.

### 8.2 Accessing Documents

Navigate to **Documents** from the sidebar. You will see:

- **Header**: File icon, "Documents" title
- **Manage Templates Button**: (Admin only) Access template management
- **Document List**: All generated documents with filters

### 8.3 Document List Features

#### Filters

| Filter | Description |
|--------|-------------|
| **Patient** | Search and select patient |
| **Document Type** | Filter by template type |
| **Date Range** | Generated date range |
| **Status** | Draft, Final, Sent |

#### Document List Display

Each document shows:
- Document title/type
- Patient name
- Generated date
- Status
- Action buttons: Download, Email, Delete

### 8.4 Document Types

DocPat supports various document templates:

| Type | Purpose |
|------|---------|
| **Medical Certificate** | Proof of consultation/visit |
| **Referral Letter** | Referring patient to specialist |
| **Lab Request** | Ordering laboratory tests |
| **Visit Summary** | Summary of clinical encounter |
| **Prescription Report** | Formal prescription document |
| **Custom** | Practice-specific documents |

### 8.5 Generating a Document

1. Click **"Generate Document"** (from Documents page or Patient detail)
2. The **Document Generation Dialog** opens

> **📸 Screenshot needed:** Document generation dialog with template selection and variable fields
>
> *File: `screenshots/document-generation-dialog.png`*

#### Step 1: Select Template
- Browse available templates
- Select the appropriate template type
- Preview shows template structure

#### Step 2: Select Patient
- If not pre-selected, choose patient
- Patient information auto-populates

#### Step 3: Select Related Records (Optional)
- Link to specific visit
- Link to specific appointment
- Link to prescriptions

#### Step 4: Review Variables
Template variables are automatically filled:
- Patient information (name, DOB, etc.)
- Practice information (name, address, etc.)
- Visit information (if linked)
- Provider information

**Manual Variables**:
Some templates require manual input:
- Custom text fields
- Specific dates
- Additional notes

#### Step 5: Preview
- See how document will appear
- Check all information is correct
- Verify formatting

#### Step 6: Generate
1. Click **"Generate"** button
2. Document is created
3. Option to:
   - **Download**: Save PDF to device
   - **Email**: Send to patient
   - **Both**: Download and email

### 8.6 Template Variables

Templates use variables that auto-populate. Common variables include:

**Patient Variables**:
- `{{patient.first_name}}` - Patient's first name
- `{{patient.last_name}}` - Patient's last name
- `{{patient.full_name}}` - Full name
- `{{patient.date_of_birth}}` - Date of birth
- `{{patient.age}}` - Calculated age
- `{{patient.gender}}` - Gender
- `{{patient.fiscal_code}}` - Fiscal code
- `{{patient.phone}}` - Phone number
- `{{patient.email}}` - Email address
- `{{patient.address}}` - Full address

**Practice Variables**:
- `{{practice.name}}` - Practice name
- `{{practice.address}}` - Practice address
- `{{practice.phone}}` - Practice phone
- `{{practice.email}}` - Practice email

**Provider Variables**:
- `{{provider.name}}` - Provider full name
- `{{provider.title}}` - Professional title

**Visit Variables** (if linked):
- `{{visit.date}}` - Visit date
- `{{visit.type}}` - Visit type
- `{{visit.diagnosis}}` - Primary diagnosis
- `{{visit.notes}}` - Visit notes

**Date Variables**:
- `{{current_date}}` - Today's date
- `{{current_time}}` - Current time

### 8.7 Downloading Documents

1. Find document in list
2. Click **Download icon** (or open and click Download)
3. PDF downloads to your device
4. Open with PDF viewer

### 8.8 Emailing Documents

1. Click **Email icon** on document
2. **Email Document Dialog** opens:
   - **Recipient Email**: Pre-filled with patient email (editable)
   - **Additional Recipients**: Add more email addresses
   - **Subject**: Pre-filled, can be modified
   - **Body**: Email message text
3. Review and edit as needed
4. Click **"Send"**
5. Notification is created and tracked

### 8.9 Document Templates (Admin Only)

Administrators can manage templates:

#### Accessing Template Management
1. Click **"Manage Templates"** on Documents page
2. Or navigate to **Document Templates** in Admin section

#### Viewing Templates
- List shows all templates
- Template name, type, last modified
- Actions: Edit, Delete, Duplicate

#### Creating a New Template

1. Click **"New Template"**
2. Fill template details:

**Basic Information**:
- **Template Name**: Descriptive name
- **Template Type**: Select from dropdown
- **Description**: Purpose of template

**Template Content**:
- Rich text editor for content
- Variable insertion toolbar
- Formatting options (bold, italic, lists, etc.)

**Variable Reference**:
- Sidebar shows available variables
- Click to insert variable
- Variables highlighted in content

3. **Preview**: See template with sample data
4. Click **"Save Template"**

#### Editing Templates
1. Click **Edit** on template
2. Modify content
3. Preview changes
4. Save

#### Deleting Templates
1. Click **Delete** on template
2. Confirm deletion
3. Template removed (cannot be undone)

### 8.10 Document Best Practices

1. **Verify Information**: Always check auto-populated data
2. **Professional Language**: Maintain professional tone
3. **Complete Templates**: Ensure all required fields are filled
4. **Preview Before Generating**: Catch errors before finalizing
5. **Prompt Delivery**: Email documents promptly
6. **Track Delivery**: Monitor notification status
7. **Template Maintenance**: Regularly review and update templates
8. **Consistent Formatting**: Use standard templates for consistency

---

## 9. Reports

### 9.1 Overview

The Reports module provides analytics and statistics to help you understand your practice performance. It includes four report types with interactive charts, filtering capabilities, and multi-format export options.

### 9.2 Accessing Reports

Navigate to **Reports** from the sidebar. You will see:

- **Header**: Trending icon, "Reports" title
- **Date Range Picker**: Select analysis period
- **Refresh Button**: Reload report data
- **Export Menu**: Download reports
- **Report Tabs**: Four report categories

### 9.3 Date Range Selection

All reports can be filtered by date range:

1. Click the date picker in the header
2. Select **From Date** and **To Date**
3. Click **Apply**
4. Reports update to show selected period

**Preset Ranges**:
- Today
- Last 7 Days
- Last 30 Days
- This Month
- Last Month
- This Year
- Custom Range

### 9.4 Appointments Report

Shows appointment-related statistics:

> **📸 Screenshot needed:** Appointments report with statistics cards and trend charts
>
> *File: `screenshots/report-appointments.png`*

#### Metrics Displayed

| Metric | Description |
|--------|-------------|
| **Total Appointments** | Count of all appointments |
| **Completed** | Successfully completed |
| **Scheduled** | Upcoming appointments |
| **No-Show Rate** | Percentage of no-shows |
| **Cancellation Rate** | Percentage cancelled |

#### Charts

- **Appointment Trends**: Line chart showing appointments over time
- **By Type**: Pie chart of appointment types
- **Daily Distribution**: Bar chart of appointments by day of week
- **No-Show/Cancellation Trends**: Line chart of missed appointments

### 9.5 Patients Report

Shows patient-related statistics:

> **📸 Screenshot needed:** Patients report showing growth chart and demographic distribution
>
> *File: `screenshots/report-patients.png`*

#### Metrics Displayed

| Metric | Description |
|--------|-------------|
| **Total Patients** | All registered patients |
| **New Patients** | Patients added in period |
| **Active Patients** | Currently active |
| **Inactive Patients** | Deactivated patients |

#### Charts

- **Patient Growth**: Line chart showing new registrations
- **Gender Distribution**: Pie chart of patient genders
- **Age Distribution**: Bar chart of patient ages
- **Status Breakdown**: Active vs inactive

### 9.6 Diagnoses Report

Shows diagnosis-related statistics:

> **📸 Screenshot needed:** Diagnoses report with top diagnoses bar chart
>
> *File: `screenshots/report-diagnoses.png`*

#### Metrics Displayed

| Metric | Description |
|--------|-------------|
| **Total Diagnoses** | All recorded diagnoses |
| **Unique Conditions** | Number of different diagnoses |
| **Most Common** | Top diagnosis |

#### Charts

- **Top 20 Diagnoses**: Bar chart of most frequent
- **Diagnosis Frequency**: Table with counts
- **ICD-10 Distribution**: Category breakdown

#### Additional Options

- **Limit**: Show top 10, 20, 50, or 100 diagnoses
- **Sort By**: Frequency, alphabetical, ICD code

### 9.7 Productivity Report

Shows provider productivity metrics:

> **📸 Screenshot needed:** Productivity report showing provider workload and visit trends
>
> *File: `screenshots/report-productivity.png`*

#### Metrics Displayed

| Metric | Description |
|--------|-------------|
| **Total Visits** | Visits completed |
| **Avg Visit Duration** | Average time per visit |
| **Appointments Fulfilled** | Completion rate |
| **Prescriptions Written** | Number of prescriptions |

#### Charts

- **Provider Workload**: Bar chart of visits per provider
- **Visit Trends**: Line chart over time
- **Appointment Fulfillment**: Rate of completed appointments
- **Documentation Time**: Average documentation duration

### 9.8 Exporting Reports

To export report data:

1. Click **"Export"** dropdown in header
2. Select format:
   - **JSON**: Raw data format
   - **CSV**: Spreadsheet compatible
   - **PDF**: Printable document
   - **Excel**: Microsoft Excel format
3. File downloads automatically
4. Current filters are applied to export

### 9.9 Refreshing Reports

If you make changes and want to update reports:

1. Click **"Refresh"** button in header
2. Reports reload with current data
3. Maintains your selected filters and date range

### 9.10 Report Best Practices

1. **Regular Review**: Check reports weekly/monthly
2. **Identify Trends**: Look for patterns over time
3. **Address No-Shows**: Investigate high no-show rates
4. **Monitor Productivity**: Track provider workload
5. **Use Date Ranges**: Compare different periods
6. **Export for Meetings**: Download reports for team discussions
7. **Track Growth**: Monitor patient acquisition trends

---

## 10. Notifications

### 10.1 Overview

The Notifications module manages all system notifications including appointment reminders, document deliveries, and system alerts. It provides tracking, retry functionality, and status monitoring.

### 10.2 Accessing Notifications

Navigate to **Notifications** from the sidebar. You will see:

- **Header**: Bell icon, "Notifications" title, Refresh button
- **Statistics Cards**: Four status cards
- **Filters**: Search and filter options
- **Notification List**: All notifications with status

> **📸 Screenshot needed:** Notifications page showing statistics cards and notification list with status badges
>
> *File: `screenshots/notifications-list.png`*

### 10.3 Notification Statistics

Four cards display notification metrics:

| Card | Icon | Description |
|------|------|-------------|
| **Total** | Mail | All notifications ever |
| **Pending** | Clock (yellow) | Awaiting delivery |
| **Sent Today** | Checkmark (green) | Successfully sent today |
| **Failed** | X (red) | Require attention |

### 10.4 Notification Types

| Type | Description |
|------|-------------|
| **EMAIL** | Email notifications |
| **SMS** | Text message notifications (if configured) |
| **IN_APP** | Internal application notifications |

### 10.5 Notification Status

| Status | Description |
|--------|-------------|
| **PENDING** | Scheduled for delivery |
| **SENT** | Successfully delivered |
| **FAILED** | Delivery failed |
| **CANCELLED** | Cancelled before delivery |

### 10.6 Filtering Notifications

| Filter | Options |
|--------|---------|
| **Type** | EMAIL, SMS, IN_APP, All |
| **Status** | PENDING, SENT, FAILED, All |
| **Date Range** | Filter by date |
| **Recipient** | Search by recipient |

### 10.7 Notification List Display

Each notification shows:
- Recipient email/phone
- Type badge (EMAIL, SMS, IN_APP)
- Status badge (color-coded)
- Timestamp
- Subject/message preview
- Action buttons

### 10.8 Notification Actions

#### Retry Failed Notifications

1. Find notification with FAILED status
2. Click **"Retry"** button
3. Confirm in dialog
4. System attempts to resend
5. Status updates based on result

#### Cancel Pending Notifications

1. Find notification with PENDING status
2. Click **"Cancel"** button
3. Confirm cancellation
4. Status changes to CANCELLED

#### View Notification Details

1. Click on notification
2. View full details:
   - Recipient information
   - Full message content
   - Delivery attempts
   - Error messages (if failed)
   - Timestamps

### 10.9 Header Notification Bell

In the application header:
- Bell icon shows unread count
- Click to see quick view of recent notifications
- Click "View All" to go to Notifications page

### 10.10 Notification Best Practices

1. **Monitor Failed**: Regularly check for failed notifications
2. **Retry Promptly**: Retry failed notifications quickly
3. **Check Recipients**: Verify email/phone accuracy
4. **Track Delivery**: Confirm important notifications were sent
5. **Clean Up**: Cancel unnecessary pending notifications

---

## 11. Administration

*This section is for Admin users only.*

### 11.1 Overview

The Administration section provides system configuration, user management, audit logging, and health monitoring. Only users with the Admin role can access these features.

### 11.2 User Management

Navigate to **Users** from the sidebar.

> **📸 Screenshot needed:** User management page showing user list with roles and status
>
> *File: `screenshots/admin-user-management.png`*

#### Viewing Users

- List displays all system users
- Search by name, username, or email
- Filter by role (ADMIN, DOCTOR)
- Filter by status (ACTIVE, INACTIVE)

#### User Information Displayed

| Field | Description |
|-------|-------------|
| Name | Full name |
| Username | Login username |
| Email | Contact email |
| Role | ADMIN or DOCTOR |
| Status | ACTIVE or INACTIVE |
| Last Login | Most recent login date |

#### Creating a New User

1. Click **"New User"** button
2. Fill the user form:

**Personal Information**:
- First Name* (required)
- Last Name* (required)
- Middle Name (optional)
- Email* (required, unique, valid format)
- Phone (optional)

**Account Information**:
- Username* (required, unique, min 3 characters)
- Password* (required for new users):
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- Confirm Password* (must match)

**Role Assignment**:
- Role* (required): ADMIN or DOCTOR

3. Click **"Create User"**
4. User receives credentials via email

#### Editing a User

1. Click user in list
2. Click **"Edit"** button
3. Modify information
4. Save changes

#### Activating/Deactivating Users

- **Deactivate**: Prevents login, preserves records
- **Activate**: Restores login access

1. Click user in list
2. Click **"Deactivate"** or **"Activate"**
3. Confirm action

#### Resetting User Password

1. Click user in list
2. Click **"Reset Password"**
3. New password is generated
4. User receives email with new credentials

#### Resetting User MFA

If a user loses their MFA device:

1. Click user in list
2. Click **"Reset MFA"**
3. Confirm action
4. User can set up MFA again on next login

### 11.3 System Settings

Navigate to **Settings** from the sidebar.

> **📸 Screenshot needed:** System settings page showing Practice Settings tab
>
> *File: `screenshots/admin-system-settings.png`*

Settings are organized into tabs:

#### Practice Settings

| Setting | Description |
|---------|-------------|
| Practice Name | Display name for your practice |
| Address | Practice location |
| Phone | Contact number |
| Email | Practice email |
| Website | Website URL (optional) |
| Logo | Upload practice logo |
| License Info | Professional license details |

#### Appointment Settings

| Setting | Description |
|---------|-------------|
| Default Duration | Standard appointment length (minutes) |
| Advance Booking | How far ahead appointments can be booked |
| Cancellation Notice | Required notice for cancellation |
| Reminder Time | When to send reminders |
| Buffer Time | Time between appointments |

#### Localization Settings

| Setting | Description |
|---------|-------------|
| Default Language | System default (English/Italian) |
| Time Zone | Local time zone |
| Date Format | Date display format |
| Currency | Currency for financial displays |

#### Security Settings

| Setting | Description |
|---------|-------------|
| MFA Required | Force MFA for all users |
| Session Timeout | Inactivity timeout (minutes) |
| Password Expiration | Days until password must change |
| IP Whitelist | Allowed IP addresses (optional) |
| Minimum Password Length | Required password length |

#### Working Hours

Configure daily schedule:
- For each day (Monday-Sunday):
  - Start time
  - End time
  - Breaks
  - Open/Closed status

#### Holidays

Manage practice closures:
- Add holiday dates
- Holiday name
- Recurring options
- Delete past holidays

#### Email Settings

| Setting | Description |
|---------|-------------|
| SMTP Server | Mail server address |
| SMTP Port | Mail server port |
| Username | SMTP authentication |
| Password | SMTP password |
| Sender Name | "From" name |
| Sender Email | "From" email address |

#### Scheduler Settings

| Setting | Description |
|---------|-------------|
| Backup Time | When daily backup runs |
| Notification Queue | Notification processing schedule |
| Report Generation | Scheduled report timing |

#### Backup Settings

| Setting | Description |
|---------|-------------|
| Backup Frequency | How often to backup |
| Retention Period | How long to keep backups |
| Storage Location | Backup destination |
| Manual Backup | Trigger immediate backup |

### 11.4 Audit Logs

Navigate to **Audit Logs** from the sidebar.

> **📸 Screenshot needed:** Audit logs page showing log entries with filters and detail view
>
> *File: `screenshots/admin-audit-logs.png`*

#### Purpose

Audit logs track all significant actions in the system for security and compliance.

#### Log Information

| Field | Description |
|-------|-------------|
| Timestamp | When action occurred |
| User | Who performed action |
| Action | What was done (CREATE, UPDATE, DELETE) |
| Entity Type | What was affected (patient, appointment, etc.) |
| Entity ID | Identifier of affected record |
| Result | SUCCESS or FAILURE |
| Changes | Before/after values |

#### Filtering Logs

| Filter | Options |
|--------|---------|
| Date Range | From/to dates |
| User | Select specific user |
| Entity Type | Patient, Appointment, Visit, etc. |
| Action | CREATE, UPDATE, DELETE, LOGIN, etc. |
| Result | SUCCESS, FAILURE |

#### Viewing Log Details

1. Click on log entry
2. View full details:
   - Complete timestamp
   - User information
   - IP address
   - User agent (browser)
   - Full change details
   - Before/after JSON comparison

#### Exporting Logs

1. Click **"Export"** button
2. Select format (PDF or CSV)
3. Choose date range
4. Select fields to include
5. Download file

#### Statistics Tab

View audit analytics:
- Actions over time (chart)
- Most active users
- Most modified entities
- Action distribution (pie chart)
- Success/failure rates

### 11.5 System Health

Navigate to **System Health** from the sidebar.

> **📸 Screenshot needed:** System health dashboard showing component status indicators
>
> *File: `screenshots/admin-system-health.png`*

#### Monitored Components

| Component | Checks |
|-----------|--------|
| Database | Connection, query performance |
| API | Response times, error rates |
| Storage | Disk usage, backup status |
| Email | SMTP connectivity |
| Cache | Redis status (if enabled) |

#### Status Indicators

- **Green**: Healthy, operating normally
- **Yellow**: Warning, may need attention
- **Red**: Critical, requires immediate action

#### Metrics Displayed

- Server uptime
- Database response time
- API latency (p50, p95, p99)
- Active sessions
- Disk space usage
- Memory usage
- Recent errors

### 11.6 Document Templates

Navigate to **Document Templates** from the sidebar.

See Section 8.9 for detailed template management instructions.

---

## 12. Troubleshooting

### 12.1 Login Issues

#### Cannot Log In

**Problem**: Unable to access the system with your credentials.

**Solutions**:
1. Verify your username is correct (check for typos)
2. Verify your password is correct (check Caps Lock)
3. If forgotten, use "Forgot Password" link
4. Clear browser cache and cookies
5. Try a different browser
6. Check if account is locked (contact admin after 5 failed attempts)
7. Verify the server URL is correct

#### MFA Code Not Working

**Problem**: 6-digit verification code is rejected.

**Solutions**:
1. Check your device's time is synchronized:
   - Go to device settings
   - Enable automatic date/time
   - Codes are time-sensitive
2. Wait for a new code (codes change every 30 seconds)
3. Ensure you're using the correct authenticator app entry
4. If using multiple DocPat accounts, select the right one
5. Contact administrator to reset MFA

#### Session Expired

**Problem**: You're logged out unexpectedly.

**Explanation**: Sessions expire after 30 minutes of inactivity for security.

**Solution**: Log in again. To prevent:
- Stay active in the application
- Save work frequently
- Use "Remember Me" on trusted devices

### 12.2 Performance Issues

#### Pages Loading Slowly

**Problem**: Application feels sluggish.

**Solutions**:
1. Check your internet connection speed
2. Clear browser cache:
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Options → Privacy → Clear Data
3. Close unnecessary browser tabs
4. Disable browser extensions temporarily
5. Try a different browser
6. Try incognito/private mode
7. Contact administrator if problem persists

#### Search Not Returning Results

**Problem**: Search returns nothing when you expect results.

**Solutions**:
1. Check spelling of search terms
2. Try partial name searches
3. Use fewer search terms
4. Check active filters (may be hiding results)
5. Verify patient/record exists
6. Try clearing all filters

### 12.3 Data Issues

#### Changes Not Saving

**Problem**: Form submissions fail or changes don't persist.

**Solutions**:
1. Check for validation errors (red text below fields)
2. Ensure required fields are filled (marked with *)
3. Verify internet connection
4. Refresh the page and try again
5. Check for special characters that may cause issues
6. Contact administrator if problem continues

#### Data Appears Missing

**Problem**: Expected records not showing.

**Solutions**:
1. Check current filters (may be hiding data)
2. Check date range filters
3. Check status filters (Active/Inactive)
4. Verify you have permission to view the data
5. Check if record was deleted
6. Contact administrator to check audit logs

### 12.4 Appointment Issues

#### Cannot Find Available Slots

**Problem**: No time slots available when scheduling.

**Solutions**:
1. Check selected date is not a holiday
2. Check selected date is not a non-working day
3. Try different dates
4. Check working hours configuration (admin)
5. Existing appointments may fill all slots

#### Double-Booking Warning

**Problem**: Conflict warning when creating appointment.

**Solutions**:
1. Choose a different time slot
2. Modify appointment duration
3. If intentional, confirm to override
4. Check calendar for existing appointments

### 12.5 Document Issues

#### PDF Not Generating

**Problem**: Document generation fails or times out.

**Solutions**:
1. Wait a moment and retry
2. Check document status for error messages
3. Verify template is correctly configured
4. Check required fields are filled
5. Try a smaller document
6. Contact administrator if issue persists

#### Email Not Sending

**Problem**: Document email fails to deliver.

**Solutions**:
1. Verify recipient email address is valid
2. Check notification status for errors
3. Ask recipient to check spam folder
4. Retry the notification
5. Contact administrator to check email configuration

### 12.6 Print Issues

#### Print Format Incorrect

**Problem**: Printed output doesn't match screen.

**Solutions**:
1. Use print preview to check format
2. Adjust browser print settings
3. Select correct paper size (A4/Letter)
4. Disable headers/footers in print settings
5. Use "Fit to page" option
6. Try downloading PDF and printing from PDF viewer

### 12.7 Browser-Specific Issues

#### Features Not Working in Specific Browser

**Problem**: Certain functionality missing or broken.

**Solutions**:
1. Update browser to latest version
2. Try a different supported browser
3. Clear browser cache
4. Disable browser extensions
5. Check browser console for errors (F12 → Console)

### 12.8 Mobile/Tablet Issues

#### Display Problems on Mobile

**Problem**: Layout issues on smaller screens.

**Solutions**:
1. Use landscape orientation for complex tasks
2. Zoom out for better overview
3. Consider using desktop for clinical documentation
4. Clear mobile browser cache
5. Try different mobile browser

### 12.9 Getting Help

If you cannot resolve an issue:

1. **Document the Problem**:
   - What you were trying to do
   - What happened instead
   - Any error messages (screenshot if possible)
   - Steps to reproduce

2. **Contact Administrator**:
   - Provide documented information
   - Include your username
   - Note the date/time of the issue

3. **System Information**:
   - Browser name and version
   - Operating system
   - Device type (desktop/mobile)

---

## 13. Appendix

### 13.1 Keyboard Shortcuts

DocPat supports keyboard shortcuts for efficient navigation:

#### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` (⌘K on Mac) | Open global search |
| `Escape` | Close dialog/modal |

#### Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + D` | Go to Dashboard |
| `Alt + P` | Go to Patients |
| `Alt + A` | Go to Appointments |
| `Alt + V` | Go to Visits |
| `Alt + R` | Go to Reports |
| `Alt + N` | Go to Notifications |
| `Alt + H` | Go to Help |

#### Form Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` (⌘S on Mac) | Save current form |
| `Tab` | Move to next field |
| `Shift + Tab` | Move to previous field |
| `Enter` | Submit form (when on button) |

**Note**: On macOS, use `Cmd` (⌘) instead of `Ctrl`.

### 13.2 Glossary of Terms

| Term | Definition |
|------|------------|
| **Admin** | Administrator user with full system access |
| **Assessment** | Clinical evaluation and diagnosis in SOAP note |
| **Audit Log** | Record of all system actions for security |
| **BMI** | Body Mass Index, calculated from height/weight |
| **Chief Complaint** | Primary reason patient seeks care |
| **CRUD** | Create, Read, Update, Delete operations |
| **Doctor** | Clinical user role with patient care access |
| **Draft** | Unsaved or unsigned document/visit |
| **Fiscal Code** | Italian tax identification number |
| **HIPAA** | Health Insurance Portability and Accountability Act |
| **ICD-10** | International Classification of Diseases, 10th Revision |
| **Locked** | Permanently immutable record |
| **MFA** | Multi-Factor Authentication, requires two verification methods |
| **MRN** | Medical Record Number, unique patient identifier |
| **No-Show** | Patient who missed appointment without notice |
| **Objective** | Clinical findings from examination in SOAP note |
| **Plan** | Treatment plan in SOAP note |
| **RBAC** | Role-Based Access Control |
| **Signed** | Clinically approved and authenticated document |
| **SOAP** | Subjective, Objective, Assessment, Plan note format |
| **Subjective** | Patient-reported symptoms in SOAP note |
| **Template** | Pre-defined format for documents or visits |
| **TOTP** | Time-based One-Time Password (MFA codes) |
| **Variable** | Placeholder in templates for dynamic data |
| **Vital Signs** | Basic physiological measurements |

### 13.3 Status Reference

#### Appointment Statuses

| Status | Color | Description |
|--------|-------|-------------|
| SCHEDULED | Blue | Initial booking |
| CONFIRMED | Green | Patient confirmed |
| IN_PROGRESS | Yellow | Currently being seen |
| COMPLETED | Gray | Finished successfully |
| CANCELLED | Red | Appointment cancelled |
| NO_SHOW | Orange | Patient didn't attend |

#### Visit Statuses

| Status | Color | Description |
|--------|-------|-------------|
| DRAFT | Yellow | Work in progress |
| SIGNED | Green | Clinically approved |
| LOCKED | Gray | Permanently archived |

#### Prescription Statuses

| Status | Color | Description |
|--------|-------|-------------|
| ACTIVE | Green | Currently valid |
| ON_HOLD | Yellow | Temporarily paused |
| DISCONTINUED | Orange | Stopped by provider |
| COMPLETED | Gray | Course finished |
| CANCELLED | Red | Never started |

#### Notification Statuses

| Status | Color | Description |
|--------|-------|-------------|
| PENDING | Yellow | Awaiting delivery |
| SENT | Green | Successfully delivered |
| FAILED | Red | Delivery failed |
| CANCELLED | Gray | Cancelled before delivery |

### 13.4 Vital Signs Reference

| Measurement | Normal Adult Range | Unit |
|-------------|-------------------|------|
| Blood Pressure (Systolic) | 90-120 | mmHg |
| Blood Pressure (Diastolic) | 60-80 | mmHg |
| Heart Rate | 60-100 | bpm |
| Respiratory Rate | 12-20 | breaths/min |
| Temperature | 36.1-37.2 | °C |
| Oxygen Saturation | 95-100 | % |

### 13.5 Support Information

For technical support:
- Contact your system administrator
- Review this documentation
- Check the in-app Help section

### 13.6 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2026 | Initial release |

---

## Document Information

**DocPat User Manual**
**Version**: 1.0
**Last Updated**: January 2026
**Language**: English

*This document is intended for users of the DocPat Medical Practice Management System. For technical documentation, please consult the system administrator.*

---

*© 2026 DocPat. All rights reserved.*
