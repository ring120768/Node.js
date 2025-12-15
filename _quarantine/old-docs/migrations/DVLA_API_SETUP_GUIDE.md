# DVLA API Setup Guide

## 🚗 Official UK Government Vehicle Data API

The DVLA (Driver and Vehicle Licensing Agency) provides official UK vehicle data including MOT status, tax status, make, model, and more.

---

## 📋 What the DVLA API Provides

### Vehicle Information:
- ✅ **Registration Number** (formatted)
- ✅ **Make & Model** (e.g., "FORD FOCUS")
- ✅ **Color** (e.g., "BLUE")
- ✅ **Year of Manufacture**
- ✅ **Fuel Type** (Petrol, Diesel, Electric, Hybrid)
- ✅ **Engine Capacity** (cc)

### MOT & Tax Status:
- ✅ **MOT Status** (Valid, Expired, No details)
- ✅ **MOT Expiry Date**
- ✅ **Tax Status** (Taxed, SORN, Untaxed)
- ✅ **Tax Due Date**

### Additional Data:
- ✅ **V5C Last Issued Date** (logbook)
- ✅ **Marked for Export** (yes/no)
- ✅ **Vehicle Status** (e.g., Stolen)
- ✅ **CO2 Emissions**
- ✅ **Euro Status**
- ✅ **Type Approval**

---

## 🔑 How to Get Your DVLA API Key

### Step 1: Visit the DVLA Developer Portal

**URL:** https://developer-portal.driver-vehicle-licensing.api.gov.uk/

### Step 2: Create an Account

1. Click **"Sign Up"** or **"Register"**
2. Fill in your details:
   - Email address
   - Organization name: "Car Crash Lawyer AI" (or your business name)
   - Purpose: Legal/Insurance claim processing
3. Verify your email address

### Step 3: Subscribe to the Vehicle Enquiry API

1. Log in to the developer portal
2. Navigate to **"APIs"** section
3. Find **"Vehicle Enquiry Service"**
4. Click **"Subscribe"** or **"Get API Key"**
5. Accept the terms and conditions

### Step 4: Get Your API Key

1. Go to **"My Applications"** or **"API Keys"**
2. Your API key will be displayed (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
3. **Copy the API key** - you'll need it for the `.env` file

### Step 5: Understand Usage Limits

**Free Tier:**
- Typically **limited requests per day/month**
- Check your specific quota in the developer portal

**Paid Tier** (if needed):
- Contact DVLA for commercial licensing
- Higher rate limits
- SLA guarantees

---

## ⚙️ Configure Your Application

### Add to .env File

```bash
# DVLA Vehicle Information API
# Provider: https://developer-portal.driver-vehicle-licensing.api.gov.uk
# API Key obtained from DVLA Developer Portal
DVLA_API_KEY=your-dvla-api-key-here
```

### Restart Server

```bash
npm start
```

---

## 🧪 Test the API

### Option 1: Use the Frontend

1. Open `report-complete.html`
2. Click "Add Other Vehicle"
3. Enter a UK registration (e.g., "AB12 CDE")
4. Click "🔍 Lookup Vehicle"
5. DVLA data should populate automatically

### Option 2: Test with curl

```bash
curl -X POST https://localhost:5000/api/other-vehicles/dvla-lookup \
  -H "Content-Type: application/json" \
  -d '{"vehicle_license_plate": "AB12CDE"}'
```

### Option 3: Test Real UK Registrations

Try these example registrations (publicly available data):
- `AA19AAA` - Recent registration format
- `AB12ABC` - Standard format
- Any real UK registration you have permission to look up

---

## 📊 API Details

### Official Documentation:
https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/vehicle-enquiry-service-description.html

### API Endpoint Used:
```
POST https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles
```

### Request Format:
```json
{
  "registrationNumber": "AB12CDE"
}
```

### Response Format:
```json
{
  "registrationNumber": "AB12CDE",
  "make": "FORD",
  "model": "FOCUS",
  "colour": "BLUE",
  "yearOfManufacture": 2015,
  "fuelType": "PETROL",
  "engineCapacity": 1598,
  "motStatus": "Valid",
  "motExpiryDate": "2025-12-31",
  "taxStatus": "Taxed",
  "taxDueDate": "2025-06-01",
  "dateOfLastV5CIssued": "2020-03-15"
}
```

---

## 🛡️ Security & Best Practices

### Keep Your API Key Secret:
- ✅ **Never commit** `.env` to git (already in `.gitignore`)
- ✅ **Use environment variables** only
- ✅ **Rotate keys** if compromised
- ✅ **Limit access** to production keys

### Rate Limiting:
- The DVLA service has **built-in retry logic**
- **Exponential backoff** (1s, 2s, 4s delays)
- **Max 3 retries** for network errors
- **429 rate limit** automatically retried

### Error Handling:
- ✅ Graceful degradation (works without API)
- ✅ Clear error messages to users
- ✅ Categorized errors (TIMEOUT, AUTH_ERROR, VEHICLE_NOT_FOUND)

---

## 💰 Cost Information

### DVLA API Pricing:

**Free Tier:**
- Usually includes a **limited number of requests**
- Suitable for **development and testing**
- Check your specific allocation in the portal

**Commercial Tier:**
- **Contact DVLA** for pricing
- Based on **volume of requests**
- Typically **pay-per-request** or **monthly subscription**

**Estimated Costs** (varies by volume):
- Small volume (< 1,000/month): Often free or minimal
- Medium volume (1,000-10,000/month): £50-200/month (estimate)
- High volume (> 10,000/month): Custom pricing

### Alternative Free Options:

**For Development Only:**
- Some test registrations return mock data
- Use sandbox environment if available

**For Production:**
- **Must use official DVLA API** for accurate legal data
- **No free alternatives** for production use

---

## ⚠️ Important Legal Notes

### Data Protection:
- DVLA data is **governed by GDPR**
- Must have **legitimate interest** to lookup vehicles
- **Log all lookups** for compliance (already implemented via GDPR service)

### Acceptable Use:
- ✅ **Legal claims** (insurance, accident reports)
- ✅ **Vehicle history checks**
- ✅ **Compliance verification**
- ❌ **Mass scraping** or data harvesting
- ❌ **Selling data** to third parties

### Terms of Service:
- Read and comply with DVLA's **Terms & Conditions**
- Available at: https://developer-portal.driver-vehicle-licensing.api.gov.uk

---

## 🔧 Troubleshooting

### "DVLA API not configured" Error

**Cause:** Missing or invalid API key
**Solution:**
1. Check `.env` file has `DVLA_API_KEY=your-key`
2. Verify key is correct (copy-paste from portal)
3. Restart server after adding key

### "AUTH_ERROR" (403 Forbidden)

**Cause:** Invalid or expired API key
**Solution:**
1. Check API key is correct
2. Verify subscription is active in portal
3. Generate new API key if needed

### "VEHICLE_NOT_FOUND" (404)

**Cause:** Registration doesn't exist in DVLA database
**Solution:**
- Normal for invalid registrations
- User can still add vehicle manually
- No action needed - expected behavior

### "RATE_LIMIT" (429)

**Cause:** Too many requests in short time
**Solution:**
- Service automatically retries with delay
- Check your quota in developer portal
- Upgrade to higher tier if needed

### "TIMEOUT" Error

**Cause:** Network issues or DVLA API slow
**Solution:**
- Service automatically retries 3 times
- Usually resolves on retry
- Check DVLA service status if persistent

---

## 📈 Monitoring Usage

### Check API Usage:

1. **DVLA Developer Portal:**
   - Login to portal
   - View **Analytics** or **Usage** section
   - Monitor daily/monthly quota

2. **Application Logs:**
   - Check server logs for DVLA calls
   - Look for success/failure rates
   - Monitor response times

3. **Database (Optional):**
   - Log all DVLA lookups to database
   - Track usage trends
   - Identify patterns

---

## 🎯 Integration Status

### Current Implementation: ✅ Complete

**Backend:**
- ✅ DVLA Service (`src/services/dvlaService.js`)
- ✅ API endpoint (`/api/other-vehicles/dvla-lookup`)
- ✅ Error handling & retry logic
- ✅ Configuration in `.env`

**Frontend:**
- ✅ Automatic lookup on button click
- ✅ Visual display of all DVLA data
- ✅ Color-coded status indicators
- ✅ Alert system for compliance issues

**Features:**
- ✅ MOT & Tax compliance checking
- ✅ Exported/Stolen vehicle detection
- ✅ 30-day MOT expiry warnings
- ✅ Overdue tax detection

**Next Step:**
- ⏳ **Add DVLA API key** to activate

---

## 📚 Additional Resources

### Official Documentation:
- **Developer Portal:** https://developer-portal.driver-vehicle-licensing.api.gov.uk
- **API Reference:** https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/vehicle-enquiry-service-description.html
- **Support:** Available through developer portal

### UK Government Resources:
- **DVLA Main Site:** https://www.gov.uk/government/organisations/driver-and-vehicle-licensing-agency
- **Check MOT History:** https://www.gov.uk/check-mot-history
- **Check Tax Status:** https://www.gov.uk/check-vehicle-tax

### Related APIs:
- **MOT History API:** https://documentation.history.mot.api.gov.uk/
- **askMID (Insurance):** https://ownvehicle.askmid.com/

---

## ✅ Activation Checklist

Before going live with DVLA API:

- [ ] Created account on DVLA Developer Portal
- [ ] Subscribed to Vehicle Enquiry Service
- [ ] Obtained API key from portal
- [ ] Added `DVLA_API_KEY` to `.env` file
- [ ] Restarted server
- [ ] Tested with real UK registration
- [ ] Verified MOT/Tax data displays
- [ ] Checked alert system triggers correctly
- [ ] Reviewed usage quota in portal
- [ ] Read and accepted DVLA Terms of Service
- [ ] Confirmed GDPR logging is active

---

## 🚀 Quick Start Commands

```bash
# 1. Add API key to .env
echo "DVLA_API_KEY=your-key-here" >> .env

# 2. Restart server
npm start

# 3. Test the endpoint
curl -X POST http://localhost:5000/api/other-vehicles/dvla-lookup \
  -H "Content-Type: application/json" \
  -d '{"vehicle_license_plate": "AB12CDE"}'
```

---

**Implementation Date:** 2025-10-25 (already complete)
**Status:** ✅ Ready for API key
**Git Commits:** Feature already integrated

🎉 **Add your DVLA API key to activate official UK vehicle data!**
