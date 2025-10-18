
# Adobe PDF Services Credentials Setup

## Required File
You need to replace the template values in `pdfservices-api-credentials.json` with your actual Adobe credentials.

## How to Get Your Adobe Credentials

1. **Visit Adobe Developer Console:**
   https://acrobatservices.adobe.com/dc-integration-creation-app-cdn/main.html

2. **Sign in** with your Adobe ID (your Acrobat Pro account)

3. **Create New Credentials:**
   - Click "Create New Credentials"
   - Select "PDF Services API"
   - Choose "Node.js" as your platform
   - Name your project: "Car Crash Lawyer AI"

4. **Download Credentials:**
   - Download the ZIP file containing your credentials
   - Extract `pdfservices-api-credentials.json`
   - Replace the template file with your actual credentials

## File Format
Your credentials file should look like this:
```json
{
  "client_credentials": {
    "client_id": "your-actual-client-id",
    "client_secret": "your-actual-client-secret"
  },
  "service_principal_credentials": {
    "organization_id": "your-actual-org-id@AdobeOrg"
  }
}
```

## Test Your Setup
After adding your credentials, test with:
```bash
node test-adobe-pdf.js
```

## Security
- Never commit real credentials to git
- The credentials directory is already in .gitignore
- Keep your Adobe credentials secure and private
