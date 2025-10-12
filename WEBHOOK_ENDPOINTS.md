### Confirmed Working Endpoints

1. **User Signup**
   - URL: `/webhooks/user_signup`
   - Method: `POST`
   - Authentication: Required (X-Api-Key header)
   - Status: ✅ Confirmed with Zapier/Typeform
   - Purpose: Processes user profile data from Typeform

2. **Incident Reports**
   - URL: `/webhooks/incident_reports`
   - Method: `POST`
   - Authentication: Required (X-Api-Key header)
   - Status: ✅ Confirmed with Zapier/Typeform
   - Purpose: Processes incident report data from Typeform

3. **Demo Submissions**
   - URL: `/webhooks/demo_submissions`
   - Method: `POST`
   - Authentication: Required (X-Api-Key header)
   - Status: ✅ Confirmed with Zapier/Typeform
   - Purpose: Processes demo submission data from Typeform

4. **Test Endpoint**
   - URL: `/webhooks/test`
   - Method: `GET`
   - Authentication: None
   - Status: ✅ Confirmed for basic testing
   - Purpose: A simple endpoint to verify webhook connectivity

5. **Health Check**
   - URL: `/health`
   - Method: `GET`
   - Authentication: None
   - Status: ✅ Confirmed for monitoring
   - Purpose: Reports the overall health status of the webhook service

### Integration Summary

All 5 webhook endpoints are now confirmed and working with Zapier/Typeform integration.