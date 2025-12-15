# Quick Dashboard Test Guide

**5-Minute Audit Checklist**

## Prerequisites
1. Start the server: `npm start`
2. Get a test user ID from database or use existing account
3. Open browser to http://localhost:5000/dashboard.html

---

## ✅ Quick Test (5 minutes)

### 1. Login & Landing (30 seconds)
- [ ] Login with test account
- [ ] Dashboard loads without console errors
- [ ] User avatar shows correct initial
- [ ] All 5 cards visible with correct counts

### 2. Images Section (60 seconds)
- [ ] Click "Images" card
- [ ] Images grid displays (or empty state)
- [ ] Click an image → modal opens
- [ ] Click "Download" → file downloads
- [ ] Click "Delete" → confirms → removes from list
- [ ] Click "Back to Dashboard"

### 3. Videos Section (30 seconds)
- [ ] Click "Dashcam Footage" card
- [ ] Videos display (or empty state)
- [ ] Download works
- [ ] Back to dashboard works

### 4. Transcriptions Section (30 seconds)
- [ ] Click "Audio Transcriptions" card
- [ ] Transcriptions display (or empty state)
- [ ] "View" shows transcript text
- [ ] Back to dashboard works

### 5. Reports Sections (60 seconds)
- [ ] Click "Generated Reports" card
- [ ] PDFs display (or empty state)
- [ ] Download PDF works
- [ ] Back to dashboard
- [ ] Click "Incident Reports" card
- [ ] Reports display (or empty state)
- [ ] Back to dashboard works

### 6. Responsive Test (30 seconds)
- [ ] Resize browser to mobile width (< 768px)
- [ ] Layout switches to single column
- [ ] All features still work

### 7. Logout (30 seconds)
- [ ] Click "Logout"
- [ ] Redirects to home/login
- [ ] Can't access dashboard without login

---

## ⚡ Automated Test (2 minutes)

```bash
# Get test user ID
node scripts/find-test-user.js

# Run API tests
node scripts/test-dashboard-api.js [user-id-from-above]
```

**Expected output:** All tests PASS

---

## 🚨 Red Flags to Watch For

### During Testing
- ❌ Console errors
- ❌ Blank screens
- ❌ "Cannot read property of undefined"
- ❌ Failed API requests (check Network tab)
- ❌ Images not loading
- ❌ Buttons not working
- ❌ Counts showing "0" when data exists

### Common Issues & Fixes

**Issue:** Dashboard shows 0 items but data exists
- **Fix:** Check `create_user_id` matches logged-in user

**Issue:** Images not loading (broken thumbnails)
- **Fix:** Check `public_url` field in `user_documents` table
- **Fix:** Run image processor: `node scripts/retry-failed-images.js`

**Issue:** 403 Forbidden on API calls
- **Fix:** Check authentication middleware
- **Fix:** Verify `user_id` parameter in URL

**Issue:** Modal doesn't close
- **Fix:** Click ESC key or outside modal
- **Fix:** Check JavaScript errors in console

---

## 📋 Data Validation

### Quick Database Check
```sql
-- Check user has data
SELECT
  (SELECT COUNT(*) FROM user_documents WHERE create_user_id = 'YOUR-USER-ID' AND deleted_at IS NULL) as images_count,
  (SELECT COUNT(*) FROM ai_transcription WHERE create_user_id = 'YOUR-USER-ID') as transcriptions_count,
  (SELECT COUNT(*) FROM completed_incident_forms WHERE create_user_id = 'YOUR-USER-ID') as pdfs_count,
  (SELECT COUNT(*) FROM incident_reports WHERE create_user_id = 'YOUR-USER-ID') as reports_count;
```

**Should match dashboard counts exactly.**

---

## 🎯 Audit Goals

### Must Have (Critical)
- ✅ All 5 sections load without errors
- ✅ Counts are accurate
- ✅ Download and delete work
- ✅ Responsive on mobile
- ✅ Authentication enforced

### Nice to Have (Optional)
- 🎨 Smooth animations
- 🔍 Search/filter functionality
- 📄 Pagination for large datasets
- ⚡ Loading skeletons
- 📱 Native mobile app feel

---

## 📸 Screenshot Checklist

**Capture for documentation:**
1. Dashboard landing (all 5 cards)
2. Images section populated
3. Image modal open
4. Empty state example
5. Mobile view

---

## ✅ Sign-Off

**After completing all tests:**

- [ ] All 5 sections work ✓
- [ ] No console errors ✓
- [ ] Responsive design works ✓
- [ ] Authentication works ✓
- [ ] Ready for production ✓

**Auditor:** _______________
**Date:** _______________
**Result:** ☐ PASS  ☐ FAIL

---

## 🚀 Next Steps After Audit

**If PASS:**
1. Merge to main branch
2. Deploy to production
3. Monitor for errors (24-48 hours)
4. Gather user feedback

**If FAIL:**
1. Document all issues found
2. Create GitHub issues for each bug
3. Prioritize fixes (critical vs. nice-to-have)
4. Re-test after fixes
5. Schedule follow-up audit

---

## 📞 Support

**Issues during audit?**
- Check `DASHBOARD_AUDIT.md` for detailed troubleshooting
- Run `node scripts/test-dashboard-api.js` for diagnostics
- Review browser console for JavaScript errors
- Check Network tab for failed API requests

**Technical contact:** _________________
