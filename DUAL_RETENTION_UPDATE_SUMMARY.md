# Dual Retention Model - Update Summary

**Date**: October 17, 2025
**Status**: ✅ PRE_LAUNCH_CHECKLIST.md Updated

---

## What Changed

Based on your clarification: "user has a 12 month subscription so user_signup data stays on file for the duration and subscription with auto renew on expiry", I've updated the implementation plan to properly handle **two different retention policies**:

### 1. User Account Data: 12-Month Retention (Subscription-Based)
- **Tables**: `user_signup`, `user_documents` (account-related)
- **Duration**: 12 months from subscription start
- **Renewal**: Auto-renews unless cancelled
- **Deletion**: Only when subscription expires + no auto-renewal

### 2. Incident Report Data: 90-Day Retention (Temporary)
- **Tables**: `incident_reports`, `user_documents` (incident-related)
- **Duration**: 90 days from submission
- **Renewal**: None - always deleted after 90 days
- **Deletion**: Automatic at 90 days

---

## Key Updates Made to PRE_LAUNCH_CHECKLIST.md

### 1. Title & Introduction
- Changed from "90-Day Data Collection Service" to "Dual Retention Data Collection Service"
- Added clear retention model explanation upfront

### 2. Database Schema Updates (Section 3)
**Increased from 2 hours → 4 hours**

Added three new components:
- **A. Incident Reports** (90-day retention) - unchanged
- **B. User Signup** (12-month subscription-based retention) - NEW
  - `subscription_start_date`, `subscription_end_date`
  - `subscription_status`, `auto_renewal`
  - Trigger for subscription date management
- **C. User Documents Association Tracking** - NEW
  - `associated_with` (incident_report or user_signup)
  - `associated_id` (links to specific record)
  - Automatic retention based on association type

### 3. User Communication (Section 4)
**Increased from 4 hours → 5 hours**

Split into three parts:
- **A. Account Signup** (12-month subscription terms)
- **B. First Incident Submission** (90-day temporary policy)
- **C. Terms of Service Updates** (dual retention sections)

### 4. Backup Strategy (Section 5)
**Increased from 8 hours → 10 hours**

Changed to "Differential Backup Strategy":
- Separate S3 paths for accounts vs incidents
- Different retention periods for backups
- Three separate scripts:
  - `backup-accounts-to-s3.js` (12-month backups)
  - `backup-incidents-to-s3.js` (90-day backups)
  - `cleanup-old-backups.js` (differential cleanup)

### 5. Deletion Warning Emails (Section 7)
**Increased from 6 hours → 8 hours**

Split into two systems:
- **A. Incident Deletion Warnings** (60, 75, 85, 89 days)
- **B. Subscription Expiry Warnings** (30, 14, 7, 1 days - only if auto-renewal disabled)

### 6. Auto-Delete Job (Section 8)
**Increased from 4 hours → 6 hours**

Changed to "Differential Auto-Delete Job" with three components:
- **A. Incident Deletion** (90 days) - deletes expired incidents
- **B. Account Deletion** (12 months) - deletes expired subscriptions (no auto-renewal)
- **C. Subscription Renewal Handler** - NEW
  - Processes auto-renewals daily
  - Extends retention by 12 months
  - Updates document retention dates

### 7. Implementation Checklist (Week 1-3)
Added subscription-related tasks:
- Week 1: Subscription tracking schema, triggers
- Week 2: Subscription UI, differential backup, renewal scripts
- Week 3: Subscription renewal testing

### 8. Partner Communication
Updated templates to explain dual retention:
- Insurance partners now understand account stays active but incidents expire
- Beta users understand distinction between account data and incident data

### 9. Launch Decision Criteria
Updated readiness checklist:
- Dual retention tracking (not just 90-day)
- Subscription management working
- Differential backup tested
- Support team trained on both policies

### 10. Success Metrics
Added subscription-related KPIs:
- Subscription renewal rate (target >85%)
- Subscription cancellation timing
- Subscription reactivation rate
- Differential backup coverage

### 11. New Summary Section
Added comprehensive "DUAL RETENTION MODEL: Key Differences Summary" at end:
- Clear explanation of both retention policies
- Table-by-table breakdown
- User experience for each type
- Key architectural decisions
- Benefits of this approach
- Total implementation effort breakdown

---

## Updated Time & Cost Estimates

### Critical Features (Must Launch With)
**Before**: 40 hours ($4,000)
**After**: 45 hours ($4,500)
**Change**: +5 hours

Breakdown:
- Checksums: 8 hours (no change)
- Export package: 16 hours (no change)
- Retention tracking: 2 hours → 4 hours (+2 for subscription)
- User communication: 4 hours → 5 hours (+1 for dual messaging)
- Backup: 8 hours → 10 hours (+2 for differential backup)
- Export logging: 2 hours (no change)

### Important Features (Should Have)
**Before**: 18 hours ($1,800)
**After**: 22 hours ($2,200)
**Change**: +4 hours

Breakdown:
- Deletion warnings: 6 hours → 8 hours (+2 for subscription warnings)
- Auto-delete job: 4 hours → 6 hours (+2 for subscription renewal)
- Access logs: 8 hours (no change)

### Total Pre-Launch Investment
**Before**: 58 hours ($5,800)
**After**: 67 hours ($6,700)
**Change**: +9 hours (+$900)

---

## Why This Matters

### Original Assumption (Wrong)
The original PRE_LAUNCH_CHECKLIST.md assumed **all data** (including user accounts) would be deleted after 90 days. This would have resulted in:
- ❌ Users losing their account every 90 days
- ❌ Users having to re-register frequently
- ❌ Poor user experience
- ❌ No predictable revenue model

### Corrected Implementation (Right)
The updated checklist properly handles:
- ✅ User accounts persist for 12 months (subscription-based)
- ✅ Incidents expire individually after 90 days
- ✅ Users maintain access to their account while incidents expire
- ✅ Clear communication about what expires and when
- ✅ Subscription model provides predictable revenue
- ✅ Proper GDPR compliance for both data types

---

## What You Should Do Next

### Option 1: Review & Approve
Read through the updated PRE_LAUNCH_CHECKLIST.md and confirm this matches your business model.

### Option 2: Start Implementation
If approved, begin with Week 1 tasks:
1. Add subscription tracking to `user_signup` table
2. Add association tracking to `user_documents` table
3. Create triggers for both retention types
4. Update webhook handlers to populate new fields

### Option 3: Ask Questions
If anything is unclear or doesn't match your vision, let me know and I'll adjust.

---

## Files Updated

1. ✅ `/Users/ianring/Node.js/PRE_LAUNCH_CHECKLIST.md` - Comprehensive update for dual retention
2. ✅ `/Users/ianring/Node.js/DUAL_RETENTION_UPDATE_SUMMARY.md` - This summary document

## Files That Need Future Updates

When you're ready to implement, these will need code changes:
- `src/controllers/webhook.controller.js` - Populate `associated_with` and `associated_id`
- `src/services/imageProcessorV2.js` - Handle association tracking during upload
- New scripts needed:
  - `scripts/backup-accounts-to-s3.js`
  - `scripts/backup-incidents-to-s3.js`
  - `scripts/cleanup-old-backups.js`
  - `scripts/send-subscription-warnings.js`
  - `scripts/auto-delete-expired-accounts.js`
  - `scripts/process-subscription-renewals.js`

---

## Bottom Line

You're implementing a **subscription-based incident collection service** with:
- 12-month user accounts (auto-renewable)
- 90-day temporary incident storage
- Clear separation between permanent and temporary data
- Proper GDPR compliance for both types

**Total additional effort**: +9 hours (+$900) to get it right from day one.

**Worth it?** Absolutely. This provides a much better user experience and sustainable revenue model.

---

**Ready to launch when you are! 🚀**
