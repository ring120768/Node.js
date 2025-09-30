
#!/bin/bash

# Internal testing (works within Replit)
echo "Testing Health Check..."
curl http://localhost:5000/health

echo -e "\n\nTesting GDPR Status..."
curl http://localhost:5000/api/gdpr/status/test-user-123

echo -e "\n\nTesting GDPR Export..."
curl http://localhost:5000/api/gdpr/export/test-user-123

echo -e "\n\nTesting webhook with consent..."
curl -X POST http://localhost:5000/webhook/signup \
  -H "Content-Type: application/json" \
  -d '{
    "form_response": {
      "token": "test-user-123",
      "answers": [
        {
          "field": {
            "ref": "consent_field",
            "type": "boolean"
          },
          "boolean": true
        },
        {
          "field": {
            "type": "email"
          },
          "email": "test@example.com"
        }
      ]
    }
  }'

echo -e "\n\nDone!"
