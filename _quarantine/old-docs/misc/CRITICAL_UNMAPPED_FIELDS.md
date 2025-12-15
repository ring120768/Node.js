# Critical Unmapped Fields Analysis

Generated: 02/11/2025, 21:40

## Executive Summary

**Overall Database Coverage: 49% (126/258 fields mapped)**

### Critical Coverage Gaps

| Table | Coverage | Critical Gaps |
|-------|----------|--------------|
| **incident_witnesses** | 13% (2/16) | ❌❌❌ ALL witness data unmapped |
| **incident_other_vehicles** | 31% (12/39) | ❌❌ Driver contact info, damage description |
| **user_signup** | 46% (30/65) | ⚠️ Date of birth, emergency contacts |
| **incident_reports** | 59% (82/138) | ✅ Best coverage, check details below |

---

## 🚨 CRITICAL PRIORITY: incident_witnesses (13% coverage)

**Status**: Only 2 of 16 fields mapped (id, created_at)

### Missing Essential Legal Data

| Field | Importance | Notes |
|-------|-----------|-------|
| `witness_name` | ❌ CRITICAL | Primary witness identity |
| `witness_phone` | ❌ CRITICAL | Contact for verification |
| `witness_email` | ❌ CRITICAL | Alternative contact |
| `witness_address` | ❌ CRITICAL | For legal correspondence |
| `witness_statement` | ❌ CRITICAL | Core legal evidence |
| `witness_2_name` | ❌ CRITICAL | Second witness identity |
| `witness_2_mobile` | ❌ CRITICAL | Second witness contact |
| `witness_2_email` | ❌ CRITICAL | Second witness email |
| `witness_2_statement` | ❌ CRITICAL | Second witness statement |

**Action Required**: Map all 9 witness fields to PDF immediately.

---

## ⚠️ HIGH PRIORITY: incident_other_vehicles (31% coverage)

**Status**: 12 of 39 fields mapped

### Missing Critical Data

| Field | Importance | Notes |
|-------|-----------|-------|
| `driver_name` | ❌ CRITICAL | Other driver's name |
| `driver_phone` | ❌ CRITICAL | Other driver's contact |
| `driver_address` | ❌ CRITICAL | Other driver's address |
| `driver_email` | ⚠️ HIGH | Other driver's email |
| `vehicle_color` | ⚠️ HIGH | Vehicle identification |
| `vehicle_year_of_manufacture` | ⚠️ HIGH | Vehicle details |
| `damage_description` | ❌ CRITICAL | Damage to other vehicle |
| `policy_cover` | ⚠️ HIGH | Insurance coverage type |

### System/Metadata Fields (Lower Priority)

- `incident_id` (FK reference)
- `create_user_id` (FK reference)
- `dvla_lookup_successful` (system flag)
- `dvla_lookup_timestamp` (system timestamp)
- `dvla_error_message` (system error)
- `updated_at` (audit timestamp)
- `deleted_at` (soft delete flag)
- `gdpr_consent` (legal compliance)

**Action Required**: Map 8 critical driver/vehicle fields.

---

## ⚠️ MEDIUM PRIORITY: user_signup (46% coverage)

**Status**: 30 of 65 fields mapped

### Missing Important User Data

| Field | Importance | Notes |
|-------|-----------|-------|
| `date_of_birth` | ⚠️ HIGH | Legal age verification |
| `emergency_contact_name` | ⚠️ HIGH | Emergency contact person |
| `emergency_contact_number` | ⚠️ HIGH | Emergency contact phone |
| `gdpr_consent` | 🔒 LEGAL | GDPR compliance flag |
| `company_name` | 💼 BUSINESS | For commercial policies |

### System/Metadata Fields (Lower Priority)

- `uid` (Firebase ID - not needed in PDF)
- `create_user_id` (system UUID)
- `vehicle_registration` (duplicate of car_registration_number)
- `insurance_policy_number` (duplicate of policy_number)
- `product_id` (subscription reference)
- `typeform_completed` (legacy Typeform flag)
- `typeform_completion_date` (legacy timestamp)
- `auth_user_id` (Supabase Auth ID)
- `auth_code` (OTP code)
- `time_stamp` (duplicate of created_at)
- `form_id` (Typeform form ID)
- `form_responses` (raw Typeform JSON)
- `legal_support` (feature flag)
- `submit_date` (duplicate of created_at)
- `user_id` (legacy ID)
- `license_plate` (duplicate of car_registration_number)
- `phone_number` (duplicate of mobile)
- `signup_date` (duplicate of created_at)
- `i_agree_to_share_my_data` (signup consent)
- `subscription_start_date` (billing system)
- `subscription_end_date` (billing system)
- `subscription_status` (billing system)
- `auto_renewal` (billing system)
- `retention_until` (GDPR retention)
- `deleted_at` (soft delete flag)
- `images_status` (processing status)
- `missing_images` (validation flag)

**Action Required**: Map 5 high-priority user fields.

---

## ✅ GOOD COVERAGE: incident_reports (59% coverage)

**Status**: 82 of 138 fields mapped

### Already Well-Mapped Categories

- ✅ Basic incident details (date, time, location)
- ✅ Weather conditions (NEW: 51 fields added in migration 001)
- ✅ Traffic conditions
- ✅ Road markings
- ✅ Visibility
- ✅ Vehicle damage details
- ✅ Police information
- ✅ Medical treatment

### Remaining Unmapped Fields

Check `DATABASE_RECONCILIATION.md` lines 100+ for the full list of 56 unmapped incident_reports columns.

---

## Action Plan

### Phase 1: Critical Witness Data (URGENT)
Map 9 witness fields from `incident_witnesses` table:
1. witness_name
2. witness_phone
3. witness_email
4. witness_address
5. witness_statement
6. witness_2_name
7. witness_2_mobile
8. witness_2_email
9. witness_2_statement

### Phase 2: Other Vehicle Driver Data (HIGH)
Map 8 critical fields from `incident_other_vehicles` table:
1. driver_name
2. driver_phone
3. driver_address
4. driver_email
5. vehicle_color
6. vehicle_year_of_manufacture
7. damage_description
8. policy_cover

### Phase 3: User Signup Enhancements (MEDIUM)
Map 5 important fields from `user_signup` table:
1. date_of_birth
2. emergency_contact_name
3. emergency_contact_number
4. gdpr_consent (footer/declaration)
5. company_name (if commercial policy)

### Phase 4: Review Incident Reports Unmapped Fields
Review 56 unmapped incident_reports fields to determine which are needed.

---

## Summary Statistics

**Total Action Items**: 22 critical field mappings needed

| Priority | Fields | Tables |
|----------|--------|--------|
| 🚨 URGENT | 9 | incident_witnesses |
| ⚠️ HIGH | 8 | incident_other_vehicles |
| ⚠️ MEDIUM | 5 | user_signup |
| 📋 REVIEW | 56 | incident_reports |

**Estimated Impact**: Adding these 22 mappings would increase overall coverage from 49% to 57%.

---

## Notes

### System vs Legal Data

Many unmapped fields are **system metadata** that don't belong in a legal PDF:
- Timestamps (updated_at, deleted_at, typeform_completion_date)
- Foreign keys (incident_id, create_user_id, auth_user_id)
- Feature flags (typeform_completed, legal_support)
- Billing data (subscription_*, auto_renewal, product_id)
- Processing status (images_status, dvla_lookup_successful)

These fields should remain unmapped - they're for system operations, not legal documentation.

### Duplicate Fields

Several unmapped fields are duplicates with different names:
- `vehicle_registration` = `car_registration_number` (already mapped)
- `insurance_policy_number` = `policy_number` (already mapped)
- `license_plate` = `car_registration_number` (already mapped)
- `phone_number` = `mobile` (already mapped)
- `submit_date` = `created_at` (already mapped)

These don't need separate mappings.

