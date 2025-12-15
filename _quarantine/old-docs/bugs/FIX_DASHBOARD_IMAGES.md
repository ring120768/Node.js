# 🔧 Fix Dashboard Image Viewing Issue

## Problem Identified

The dashboard shows "5 images in Supabase" but you can't view them because:
1. **The Node.js server is not running** - The API endpoints needed to fetch images are not available
2. **Environment variables are not configured** - The server needs Supabase credentials to connect to the database

## Quick Fix Steps

### Step 1: Configure Environment Variables

1. **Copy the template file to create your .env:**
```bash
cp .env.template .env
```

2. **Edit the .env file and add your Supabase credentials:**
```bash
nano .env
# or open in your preferred editor
```

3. **Get your Supabase credentials from:**
   - Go to: https://supabase.com/dashboard/project/[your-project]/settings/api
   - Copy the following values:
     - `Project URL` → paste as `SUPABASE_URL`
     - `service_role key` (secret) → paste as `SUPABASE_SERVICE_ROLE_KEY`
     - `anon/public key` → paste as `SUPABASE_ANON_KEY`

Your .env should look like:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...full-key-here
SUPABASE_ANON_KEY=eyJhbGc...full-key-here
OPENAI_API_KEY=sk-...your-key
TYPEFORM_WEBHOOK_SECRET=your-secret
```

### Step 2: Test the Configuration

Run the diagnostic tool to verify everything is set up correctly:

```bash
node test-dashboard-images.js
```

This will:
- ✅ Check your environment variables
- ✅ Test Supabase connection
- ✅ Find users with images
- ✅ Verify image URLs are accessible

### Step 3: Start the Server

In a terminal, start the Node.js server:

```bash
npm start
```

You should see:
```
🚀 Server running at http://localhost:5000
✅ Supabase connected successfully
```

Keep this terminal open - the server needs to stay running.

### Step 4: Access the Dashboard

1. Open your browser and go to: http://localhost:5000/dashboard.html

2. If prompted for a user ID, use one from the diagnostic tool output

3. Click on the "Images" section to view your images

## Troubleshooting

### If images still don't appear:

1. **Check browser console for errors:**
   - Open DevTools (F12)
   - Look for red error messages
   - Common issues:
     - CORS errors → Server needs to be running
     - 404 errors → Wrong user ID or no data
     - 401 errors → Authentication issue

2. **Verify data exists in Supabase:**
```bash
node test-dashboard-images.js [your-user-id]
```

3. **Check image URLs are valid:**
   - The diagnostic tool will show if URLs can be generated
   - If URLs fail, check Supabase Storage bucket permissions

4. **Enable CORS in Supabase (if needed):**
   - Go to Storage settings in Supabase dashboard
   - Add `http://localhost:5000` to allowed origins

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Cannot connect to server" | Start server with `npm start` |
| "Missing SUPABASE_URL" | Configure .env file |
| "No images found" | Check user ID has documents in database |
| "CORS blocked" | Server must be running on port 5000 |
| "Images show as broken" | Check Supabase Storage bucket exists |

## Working Example

Once everything is set up correctly, you should see:

1. **Dashboard Landing Page:**
   - Shows count of images (e.g., "5 images")
   - Click on Images card to view

2. **Images Section:**
   - Grid of image thumbnails
   - Each image shows:
     - Preview thumbnail
     - Document type (e.g., "Driving License")
     - Upload date
     - View/Download/Delete buttons

3. **Image Modal:**
   - Click "View" to see full-size image
   - Shows metadata and status
   - Download option available

## Testing the Fix

After setup, test with:

```bash
# Test API directly
curl http://localhost:5000/api/user-documents?user_id=YOUR_USER_ID

# Should return JSON with documents array
```

## Need More Help?

If issues persist after following these steps:

1. **Check server logs** - Look for error messages in the terminal running `npm start`

2. **Verify Supabase setup:**
   - Tables exist: `user_documents`, `user_signup`
   - Storage bucket: `user-documents`
   - RLS policies allow service role access

3. **Run full diagnostic:**
```bash
node scripts/test-dashboard-api.js [user-id]
```

## Success Checklist

- [ ] .env file created with Supabase credentials
- [ ] Diagnostic tool shows "✅ Connected to Supabase"
- [ ] Server running on http://localhost:5000
- [ ] Dashboard loads without errors
- [ ] Images section shows image count
- [ ] Clicking Images shows the image grid
- [ ] Clicking View on an image shows it in modal

---

**Last Updated:** 21 October 2025
**Issue:** Dashboard shows image count but can't display them
**Solution:** Configure environment and start server