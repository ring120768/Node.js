# Insurance Verification Setup Guide

## 🎉 Implementation Complete!

The automatic insurance verification system has been fully implemented and is ready to use once you obtain your API key from UK Vehicle Data.

---

## 📋 What's Been Implemented

### Backend Infrastructure ✅
- **Insurance Service** (`src/services/insuranceService.js`)
  - UK Vehicle Data API integration
  - ABI code & insurance group lookup
  - Graceful error handling
  - Automatic retry logic

- **API Endpoint** (`/api/other-vehicles/insurance-lookup`)
  - POST endpoint for insurance verification
  - Returns ABI code and insurance group data
  - Integrated with existing vehicle controllers

- **Configuration** (`src/config/index.js`)
  - Insurance API settings added
  - Environment variable support
  - Enable/disable flag

### Frontend Features ✅
- **Automatic Lookup Integration**
  - Triggers automatically after DVLA lookup
  - Non-blocking (doesn't break if API fails)
  - Visual loading indicators

- **Insurance Display Section**
  - Shows ABI code
  - Shows insurance group
  - Green color-coded design

- **Comprehensive Disclaimer**
  - Explains manual verification requirement
  - Shows askMID.com costs (£10/search)
  - Notes future plan (£774/year at 100 users)

- **Alert System Integration**
  - Warns if no insurance data found
  - Recommends manual askMID.com check
  - Included in compliance alerts

- **Manual Verification Button**
  - "Check Insurance" button (already implemented)
  - Opens askMID.com in new tab

---

## 🚀 How to Complete Setup

### Step 1: Sign Up for UK Vehicle Data API

1. **Visit:** https://ukvehicledata.co.uk/signup.aspx
2. **Create account** (free trial available)
3. **Get your API key** from the control panel

### Step 2: Add API Key to Environment

Add to your `.env` file:

```bash
# UK Vehicle Data - Insurance Verification API
INSURANCE_API_KEY=your-api-key-here
```

### Step 3: Restart Server

```bash
npm start
```

### Step 4: Test the Feature

1. Open report-complete page
2. Click "Add Other Vehicle"
3. Enter a UK registration (e.g., "AB12 CDE")
4. Click "🔍 Lookup Vehicle"
5. DVLA data loads first
6. Insurance data loads automatically
7. Both sections display with disclaimer

---

## 💰 Cost Information

### Current Solution: UK Vehicle Data API
- **Model:** Pay-as-you-go
- **Estimated Cost:** £0.05-0.15 per lookup
- **Monthly Estimate (50 lookups):** ~£2.50-7.50
- **Provider:** https://ukvehicledata.co.uk

### Future Plan: askMID Direct Access
- **When:** At 100 users milestone
- **Cost:** £774/year unlimited searches
- **Savings:** Breaks even at ~150-200 lookups/month
- **Provider:** https://www.askmid.com

### Manual Verification (Current Backup)
- **askMID.com one-off searches:** £10 per lookup
- **Always available as fallback**

---

## 🎯 User Experience Flow

```
User clicks "Lookup Vehicle"
        ↓
DVLA API called (MOT/Tax data)
        ↓
Insurance API called (ABI code)
        ↓
Both results displayed
        ↓
Alert system checks compliance
        ↓
User sees comprehensive report
        ↓
Manual askMID.com button available
```

---

## 🛡️ Data Returned

### DVLA API Provides:
- Make, Model, Color
- Year of manufacture
- Fuel type, Engine capacity
- MOT status & expiry
- Tax status & due date
- V5C last issued date

### Insurance API Provides:
- **ABI Code** (Insurance identifier)
- **Insurance Group** (1-50 rating)

### What Insurance Data Means:
- **ABI Code Present** = Vehicle has insurance records in system
- **No ABI Code** = No insurance data found (manual check required)
- **Insurance Group** = Risk rating (lower = cheaper insurance)

---

## ⚠️ Important Notes

### Disclaimer to Users:
The insurance data shown is **indicative only** and based on historical records. **Current insurance status must be verified manually** via askMID.com (UK's official Motor Insurance Database).

### Why Manual Verification is Required:
1. **UK Vehicle Data** provides ABI code (historical/vehicle record)
2. **askMID.com** provides current live insurance status
3. **Legal compliance** requires checking live MID data

### Cost Transparency:
Users see in the UI:
- askMID one-off searches cost £10
- At 100 users, we'll get unlimited access (£774/year)
- This encourages users to understand the value

---

## 🔧 Troubleshooting

### Insurance Section Doesn't Show
**Cause:** API key not configured
**Solution:** Add `INSURANCE_API_KEY` to `.env` and restart server

### Insurance Shows "Unable to Verify"
**Cause:** API quota exceeded or network error
**Solution:** Check API account balance, verify network connectivity

### No Insurance Data Found
**Normal:** Not all vehicles have insurance records in UK Vehicle Data
**Action:** Alert system prompts user to check askMID.com manually

---

## 📊 Monitoring Usage

### Check API Usage:
1. Login to UK Vehicle Data control panel
2. View usage statistics
3. Monitor remaining credits
4. Top up when needed

### Estimate Monthly Cost:
- Track number of "Lookup Vehicle" clicks
- Multiply by ~£0.10 (average per lookup)
- Plan for askMID direct access at 100 users

---

## 🎓 Technical Details

### Service Architecture:
```javascript
insuranceService.lookupInsurance(registration)
  ↓
UK Vehicle Data API call
  ↓
{
  abi_code: "12345678",
  insurance_group: "15E",
  has_insurance_data: true
}
```

### Frontend Integration:
```javascript
// Automatic call after DVLA lookup
const insuranceResult = await fetch('/api/other-vehicles/insurance-lookup', {
  method: 'POST',
  body: JSON.stringify({ vehicle_license_plate: registration })
});
```

### Error Handling:
- API failures don't break DVLA lookup
- Graceful degradation to manual check
- User-friendly error messages

---

## 📈 Future Enhancements

### When You Reach 100 Users:
1. Contact askMID.com to set up direct access (£774/year)
2. Switch from UK Vehicle Data to direct MID API
3. Get unlimited live insurance checks
4. Update `insuranceService.js` to use MID API
5. Remove UK Vehicle Data costs

### Code Change Required:
Replace UK Vehicle Data API call with MID API call in `insuranceService.js` - minimal code change, same data structure.

---

## ✅ Checklist

Before going live:
- [ ] Signed up for UK Vehicle Data account
- [ ] API key added to `.env` file
- [ ] Server restarted
- [ ] Test lookup with real UK registration
- [ ] Verify insurance section displays
- [ ] Check disclaimer shows correctly
- [ ] Test manual askMID.com button
- [ ] Confirm alerts trigger properly

---

## 📞 Support

**UK Vehicle Data Support:**
- Website: https://ukvehicledata.co.uk
- Documentation: https://panel.ukvehicledata.co.uk/api-documentation

**askMID.com (Manual Checks):**
- Website: https://ownvehicle.askmid.com
- Cost: £10 per search
- Official Motor Insurance Database

---

**Implementation Date:** 2025-10-25
**Status:** ✅ Ready for API key
**Git Commit:** 590c3ee

🎉 All infrastructure complete - just add your API key to activate!
