---
description: View project architecture documentation
---

# Project Architecture

📚 **Comprehensive architecture documentation is located at:**

**[docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)**

This is the single source of truth for:

- System overview and data flow diagrams
- PDF generation pipeline (pdf-lib + Puppeteer hybrid)
- Email delivery with Resend API
- Queue systems (PDF retry, Email retry)
- Database schema and key tables
- Railway deployment configuration
- Legacy code to ignore
- Security and GDPR compliance

## Quick Reference

### Key Files
| File | Purpose |
|------|---------|
| `src/controllers/pdf.controller.js` | PDF generation & email delivery |
| `src/services/adobePdfFormFillerService.js` | Form filling (uses pdf-lib, NOT Adobe) |
| `lib/dataFetcher.js` | Aggregates data from 8+ tables |
| `lib/emailService.js` | Resend email API integration |

### Legacy Code (IGNORE)
- Anything referencing Typeform
- Anything referencing Zapier
- `incident_images` table (deprecated)
- `webhook.controller.js` patterns

---

**Last Updated:** January 2026
**See:** [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) for full details
