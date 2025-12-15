# Adobe Express MCP Setup & Integration Guide

## Executive Summary

**Goal**: Automate PDF generation for Car Crash Lawyer AI incident reports using Adobe Express + MCP + PDF Services API

**Current Status**:
- ✅ Adobe PDF Services API credentials configured
- ✅ Node.js environment ready
- ⏳ Adobe Express MCP Server needs setup
- ⏳ Template design needed

**Recommended Approach**: Hybrid solution combining available tools

---

## Understanding Adobe Express MCP Server

### What It Actually Does

The **Adobe Express Add-on Dev MCP Server** (currently in beta) is primarily designed for:

✅ **Add-on Development** - Building custom Adobe Express extensions
✅ **Documentation Access** - Querying Adobe Express SDK docs
✅ **Code Generation** - Scaffolding add-on projects
✅ **SDK Integration** - Working with Document APIs

### What It Doesn't Do (Yet)

❌ **Direct PDF Creation** - Not a PDF generation API
❌ **Template Management** - Can't directly create/manage Express projects via MCP
❌ **Asset Export** - No built-in `exportPDF()` function in current beta

**Source**: [Adobe Express Add-on MCP Server GitHub](https://github.com/EnventDigital/adobe-express-mcp-server)

---

## Recommended Hybrid Approach

Since the MCP server focuses on add-on development rather than direct PDF generation, here's the optimal workflow:

### Option A: Adobe Express + PDF Services API (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│ 1. DESIGN PHASE (Manual, One-Time)                     │
│    Adobe Express → Design 17-page template visually     │
│    → Export as layered PDF                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. FIELD ADDITION (Adobe Acrobat Pro)                  │
│    Open exported PDF → Add 99 form fields               │
│    → Use PDF_REDESIGN_SPECIFICATION.md as guide        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. AUTOMATION (Node.js + Adobe PDF Services)           │
│    Database → Node.js script                            │
│    → Adobe PDF Services API (fill fields)               │
│    → Generated PDF → Email                              │
└─────────────────────────────────────────────────────────┘
```

**Pros**:
- ✅ Uses existing Adobe PDF Services credentials
- ✅ Professional visual design in Express
- ✅ Proven, stable API
- ✅ Already implemented in your codebase

**Cons**:
- ❌ Manual template design (one-time effort)
- ❌ Form field addition needed (but guided by spec)

---

### Option B: Build Custom Adobe Express Add-on

Use the MCP server to build a custom add-on that automates PDF generation:

```
┌─────────────────────────────────────────────────────────┐
│ 1. DEVELOP ADD-ON (Using MCP Server)                   │
│    MCP Server → Generate add-on boilerplate             │
│    → Implement data binding logic                       │
│    → Add PDF export functionality                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. INTEGRATE WITH NODE.JS                              │
│    Node.js → Trigger add-on via API                     │
│    → Add-on fills template programmatically             │
│    → Export as PDF                                      │
└─────────────────────────────────────────────────────────┘
```

**Pros**:
- ✅ Fully automated end-to-end
- ✅ MCP-assisted development
- ✅ Future-proof solution

**Cons**:
- ❌ 2-3 weeks additional development time
- ❌ Add-on approval process (if publishing)
- ❌ Beta stability concerns

---

### Option C: Playwright + Adobe Express Web Automation

Automate Adobe Express web interface using Playwright MCP:

```
┌─────────────────────────────────────────────────────────┐
│ 1. TEMPLATE SETUP (One-time)                           │
│    Create template in Adobe Express web                 │
│    → Save with field placeholders                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. AUTOMATION (Playwright MCP)                         │
│    Node.js → Playwright MCP → Adobe Express web        │
│    → Fill placeholders → Export PDF                     │
└─────────────────────────────────────────────────────────┘
```

**Pros**:
- ✅ Playwright MCP already available
- ✅ No add-on development needed
- ✅ Can leverage Express's design tools

**Cons**:
- ❌ Fragile (UI changes break automation)
- ❌ Slower than API-based approaches
- ❌ Requires headless browser management

---

## Recommended Implementation: Option A (Hybrid)

Based on your current setup and timeline, I recommend **Option A**:

### Phase 1: Template Design (This Week)

**1.1 Open Adobe Express**
- Go to https://express.adobe.com
- Sign in with Adobe credentials
- Select "Custom size" → 8.5" x 11" (Letter size, UK compatible)

**1.2 Design Page 1 - Incident Overview**

Use your color scheme from CLAUDE.md:

```
Header:
- Background: Deep Teal (#0E7490)
- Logo: Import public/images/logo.png (50x50pt)
- Title: "CAR CRASH LAWYER AI" (white, 24pt, bold)
- Subtitle: "Incident Report" (white, 14pt)

Body:
- Background: Warm Beige (#E8DCC4)
- Section container: Cream Gray (#F5F1E8)
- Use text placeholders: {{accident_date}}, {{accident_time}}, etc.

Footer:
- Brand logo: public/images/car-crash-lawyer-ai-450.webp
- Text: "Confidential Legal Document" (Text Muted #666666, 8pt)
```

**1.3 Duplicate Pages**
- Right-click page → Duplicate
- Modify for Pages 2-17 using PDF_REDESIGN_SPECIFICATION.md layouts

**1.4 Export**
- File → Download → PDF (High Quality)
- Save as `Car-Crash-Lawyer-AI-Template-Express.pdf`

### Phase 2: Add Form Fields (Next Week)

**2.1 Open in Adobe Acrobat Pro**
```bash
# Mac
open -a "Adobe Acrobat" Car-Crash-Lawyer-AI-Template-Express.pdf

# Windows
start AcroRd32.exe Car-Crash-Lawyer-AI-Template-Express.pdf
```

**2.2 Add Form Fields**
- Tools → Prepare Form → Start
- Follow PDF_REDESIGN_SPECIFICATION.md field guide
- Add all 99 fields with exact names

**2.3 Save**
- File → Save As → `Car-Crash-Lawyer-AI-Form-Template.pdf`
- Move to `/pdf-templates/` directory

### Phase 3: Integration (Week After)

**3.1 Update PDF Service**

Edit `src/services/adobePdfService.js`:

```javascript
// Update template path
const INCIDENT_TEMPLATE = path.join(
  __dirname,
  '../../pdf-templates/Car-Crash-Lawyer-AI-Form-Template.pdf'
);

// Use existing fillForm() method - already implemented!
```

**3.2 Test with Sample Data**

```bash
node test-form-filling.js <user-uuid>
```

**3.3 Verify Output**
- Check all 99 fields populate correctly
- Verify colors and branding
- Test on mobile devices

---

## Setting Up Adobe Express MCP (For Future Add-on Development)

If you want to explore **Option B** later, here's the setup:

### Step 1: Install MCP Server

```bash
# Global installation
npm install -g community-express-dev-mcp
express-mcp-install

# OR Clone from GitHub
cd ~/Projects
git clone https://github.com/EnventDigital/community-express-dev-mcp.git
cd community-express-dev-mcp
npm install
npm run build
```

### Step 2: Configure GitHub Access

```bash
# Create .env file
cat > .env << 'EOF'
MCP_GITHUB_PAT=your_github_personal_access_token_here
EOF

# Get GitHub PAT:
# 1. Go to https://github.com/settings/tokens
# 2. Generate new token (classic)
# 3. Scopes: repo, read:org
# 4. Copy token to .env file
```

### Step 3: Configure for Claude Code

Edit `~/.claude/config.json` (or equivalent):

```json
{
  "mcpServers": {
    "adobe-express": {
      "command": "node",
      "args": ["/path/to/community-express-dev-mcp/dist/index.js"],
      "env": {
        "MCP_GITHUB_PAT": "your_token_here"
      }
    }
  }
}
```

### Step 4: Restart Claude Code

```bash
# Mac
killall "Claude Code"
open -a "Claude Code"

# Or restart your IDE
```

### Step 5: Test MCP Connection

In Claude Code, try:

```
"Help me scaffold a new Adobe Express add-on project"
```

You should see the MCP server respond with boilerplate code.

---

## Adobe Express Template Design Tips

### Color System Implementation

**CSS Variables (for web preview)**:
```css
:root {
  --brand-teal: #0E7490;
  --brand-teal-dark: #0c6179;
  --bg-beige: #E8DCC4;
  --bg-cream: #F5F1E8;
  --text-dark: #333333;
  --text-muted: #666666;
  --border-gray: #4B5563;
  --input-bg: #CFD2D7;
  --success: #10b981;
}
```

**Adobe Express Color Swatches**:
1. Create custom brand palette
2. Add each color from CLAUDE.md
3. Save as "Car Crash Lawyer AI Brand"
4. Apply consistently across all pages

### Typography

**Font Choices** (Express-compatible):
- Primary: **Open Sans** (similar to Arial)
- Headings: **Montserrat Bold**
- Monospace: **Roboto Mono**

**Size Guidelines**:
- Page titles: 24pt
- Section headings: 16pt
- Body text: 11pt
- Help text: 9pt

### Layout Grid

Express doesn't have form fields, so use visual placeholders:

```
┌────────────────────────────────────────┐
│ Field Label:                           │
│ [{{field_name}}________________]       │ ← Text placeholder
│                                        │
│ Checkbox Label:                        │
│ □ {{checkbox_value}}                   │ ← Shape placeholder
└────────────────────────────────────────┘
```

Use:
- Text elements for labels
- Text boxes with {{mustache}} syntax for data placeholders
- Rectangle shapes for checkbox placeholders

---

## Troubleshooting

### Issue: Adobe Express won't import logo

**Solution**:
```bash
# Convert PNG to compatible format
convert public/images/logo.png -resize 50x50 -background transparent logo-express.png

# Or use online converter: cloudconvert.com
```

### Issue: PDF exports with wrong dimensions

**Solution**:
- Use "Custom size" template
- Set to 8.5" x 11" (US Letter = UK A4 equivalent)
- Export at 300 DPI for print quality

### Issue: Colors don't match spec

**Solution**:
- Use hex codes exactly as specified in CLAUDE.md
- Create color swatches in Express first
- Apply from saved swatches, not eyedropper

### Issue: MCP server connection fails

**Solution**:
```bash
# Check if server is running
ps aux | grep mcp

# Check logs
tail -f ~/.claude/logs/mcp-adobe-express.log

# Restart server
npm run dev
```

---

## Comparison: Adobe Express vs Acrobat Pro

| Feature | Adobe Express | Acrobat Pro |
|---------|---------------|-------------|
| **Visual Design** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good |
| **Form Fields** | ❌ Not supported | ⭐⭐⭐⭐⭐ Full support |
| **Brand Colors** | ⭐⭐⭐⭐⭐ Easy swatches | ⭐⭐⭐ Manual RGB entry |
| **Templates** | ⭐⭐⭐⭐⭐ Thousands free | ⭐⭐ Limited |
| **Automation** | ⭐⭐ (via add-ons) | ⭐⭐⭐⭐⭐ (via API) |
| **PDF Quality** | ⭐⭐⭐⭐⭐ Print-ready | ⭐⭐⭐⭐⭐ Print-ready |
| **Learning Curve** | ⭐⭐⭐⭐⭐ Easy | ⭐⭐⭐ Moderate |
| **Cost** | Free tier available | £15.98/month |

**Verdict**: Use Express for design, Acrobat Pro for forms.

---

## Next Steps

### This Week (Template Design)

1. [ ] Sign in to Adobe Express (https://express.adobe.com)
2. [ ] Import logo and brand assets
3. [ ] Create color palette from CLAUDE.md
4. [ ] Design Page 1 using PDF_REDESIGN_SPECIFICATION.md
5. [ ] Duplicate and modify for Pages 2-17
6. [ ] Export as high-quality PDF

### Next Week (Form Fields)

1. [ ] Open exported PDF in Acrobat Pro
2. [ ] Add 99 form fields (use specification guide)
3. [ ] Test field population with sample data
4. [ ] Save as final template

### Week After (Integration)

1. [ ] Update Node.js PDF service to use new template
2. [ ] Test end-to-end workflow
3. [ ] Deploy to staging environment
4. [ ] User acceptance testing

### Optional (Future Enhancement)

1. [ ] Set up Adobe Express MCP Server
2. [ ] Develop custom add-on for automated updates
3. [ ] Integrate add-on with CI/CD pipeline

---

## Resources

**Official Documentation**:
- [Adobe Express](https://express.adobe.com)
- [Adobe Express Add-on MCP Server](https://github.com/EnventDigital/adobe-express-mcp-server)
- [Adobe PDF Services API Docs](https://developer.adobe.com/document-services/docs/)
- [Adobe Acrobat Pro User Guide](https://helpx.adobe.com/acrobat/user-guide.html)

**Internal Documentation**:
- `PDF_REDESIGN_SPECIFICATION.md` - Complete field layouts and styling
- `COMPREHENSIVE_FIELD_MAPPING_PLAN.md` - Database integration details
- `ADOBE_FORM_FILLING_GUIDE.md` - Existing PDF filling implementation

**Support**:
- Adobe Express Community: https://community.adobe.com/t5/adobe-express/ct-p/ct-express
- Adobe PDF Services Forum: https://community.adobe.com/t5/document-services-apis/bd-p/Document-Cloud-SDK

---

## Conclusion

**Recommended Path**:
- ✅ Use Adobe Express for beautiful, brand-consistent template design
- ✅ Use Adobe Acrobat Pro to add interactive form fields
- ✅ Use existing Adobe PDF Services API for automation
- ⏳ Explore Adobe Express MCP for future add-on development

**Timeline**: 2-3 weeks (1 week design + 1 week forms + 1 week testing)

**Outcome**: Professional, automated PDF generation fully integrated with existing Node.js infrastructure

---

**Document Version**: 1.0
**Last Updated**: 2025-10-31
**Status**: Ready for Implementation
