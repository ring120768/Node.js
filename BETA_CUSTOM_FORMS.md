# Beta Custom Forms Project

**Status:** Planning Phase
**Branch:** `beta/custom-forms`
**Target Launch:** 4-6 weeks from start
**Goal:** Replace Typeform with custom-built multi-step forms

---

## Project Overview

Building a custom incident report form to replace Typeform, giving us:

✅ **Full control** - No monthly fees, no feature limits
✅ **Better UX** - Tailored to our exact use case
✅ **Offline support** - Users can fill forms without internet
✅ **Custom branding** - 100% on-brand experience
✅ **No data limits** - Unlimited responses

---

## Development Strategy

### **Phase 1: Foundation (Week 1-2)**
**Deliverables:**
- [ ] Multi-step form framework (React Hook Form + Zod)
- [ ] Progress bar component
- [ ] Mobile-first responsive layout
- [ ] SessionStorage persistence (auto-save)
- [ ] First 5 sections built:
  - [ ] Section 1: Safety Check
  - [ ] Section 2: Medical Information
  - [ ] Section 3: Medical Symptoms (11 checkboxes)
  - [ ] Section 4: Accident Date/Time/Location
  - [ ] Section 5: Weather Conditions (12 checkboxes)

**Testing:** 5-10 Beta users complete first 5 sections

---

### **Phase 2: Core Content (Week 3-4)**
**Deliverables:**
- [ ] Sections 6-20 built (bulk of questions)
- [ ] Image upload handling
- [ ] Conditional logic implementation
- [ ] Error handling & validation
- [ ] Integration with existing `/api/incident-reports` endpoint

**Testing:** Full flow test with 10+ users

---

### **Phase 3: Advanced Features (Week 5-6)**
**Deliverables:**
- [ ] Offline support (Service Worker)
- [ ] Auto-save every 30 seconds
- [ ] "Resume later" functionality
- [ ] Final 20 sections (sections 21-40)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Security audit (XSS, CSRF, input validation)

**Testing:** Accessibility testing, security testing

---

### **Phase 4: Migration & Launch (Week 7)**
**Deliverables:**
- [ ] A/B test: 50% Typeform, 50% Custom
- [ ] Analytics comparison (completion rates, time-to-complete)
- [ ] Bug fixes based on A/B test data
- [ ] Full cutover if custom performs better

**Success Metrics:**
- Completion rate ≥ Typeform's current rate
- Mobile completion rate improved by 10%+
- User feedback score ≥ 4/5

---

## Technical Stack

**Frontend:**
- React Hook Form (form state management)
- Zod (validation)
- TailwindCSS (styling)
- Framer Motion (animations)

**Backend:**
- Existing Node.js API (`/api/incident-reports`)
- Supabase PostgreSQL (same tables)
- ImageProcessorV2 (image handling)

**Features:**
- Progressive Web App (PWA) for offline support
- Service Worker for caching
- IndexedDB for offline data storage
- WebSocket for real-time sync

---

## File Structure

```
/public/
  beta-incident-report.html          # Main form page (Beta)
  /components/
    multi-step-form.js               # Form framework
    progress-bar.js                  # Progress indicator
    form-sections/
      section-01-safety.js           # Safety check
      section-02-medical.js          # Medical info
      section-03-symptoms.js         # Symptoms checkboxes
      ... (40 sections total)

/src/
  /controllers/
    incident-beta.controller.js      # Beta form submission handler
  /services/
    form-validator.service.js        # Validation logic
    offline-sync.service.js          # Offline support

/tests/
  /e2e/
    beta-form-flow.test.js           # End-to-end tests
  /accessibility/
    wcag-audit.test.js               # Accessibility tests
```

---

## Current Production Setup (Baseline)

**What's live in production:**
- Typeform embedded at `/typeform-incident-report.html`
- Webhook processing at `/webhooks/typeform`
- Data flows: Typeform → Webhook → Supabase → PDF generation
- Scroll-back issue fixed with `disableScroll: true`

**This stays untouched until Beta is proven better.**

---

## Key Decisions

### **Why Custom Forms?**
1. **Cost:** £708/year Typeform vs £0/year custom (after dev costs)
2. **Control:** Full feature control, no vendor lock-in
3. **UX:** Tailored to UK legal incident reporting
4. **Branding:** 100% Car Crash Lawyer AI branded
5. **Offline:** Critical for users in poor signal areas

### **Why NOT Custom Forms (Risks)?**
1. **Dev time:** 4-6 weeks vs Typeform "just works"
2. **Maintenance:** We own all bugs and features
3. **Testing:** Requires extensive cross-device testing
4. **Compliance:** Must ensure WCAG 2.1 AA / GDPR ourselves

---

## Development Workflow

### **Branch Strategy:**
```
main                     (Production - Typeform)
  ├── feat/audit-prep    (Latest stable features)
  └── beta/custom-forms  (Custom forms development) ⬅ We are here
```

### **Testing Strategy:**
1. **Local testing:** Developer tests on desktop + mobile browsers
2. **Beta user testing:** 10-20 real users test each phase
3. **A/B testing:** 50/50 split between Typeform and Custom
4. **Gradual rollout:** 10% → 25% → 50% → 100% if metrics improve

### **Deployment:**
- Beta form accessible at `/beta-incident-report.html`
- Flag in database: `use_beta_forms = true/false` per user
- Production Typeform remains default until proven

---

## Success Criteria

**Beta is ready for production when:**
- ✅ Completion rate ≥ Typeform's baseline
- ✅ Mobile completion rate improved
- ✅ Zero critical bugs in 2-week Beta period
- ✅ WCAG 2.1 AA compliant
- ✅ GDPR compliant
- ✅ User feedback score ≥ 4/5

**If Beta underperforms:**
- Keep Typeform as primary
- Use custom forms for edge cases only
- Reassess after 6 months

---

## Timeline

| Week | Focus | Hours (Your Time) |
|------|-------|-------------------|
| 1-2  | Foundation + First 5 sections | 20 hours (10/week) |
| 3-4  | Sections 6-20 + Integration | 20 hours (10/week) |
| 5-6  | Final sections + Polish | 20 hours (10/week) |
| 7    | A/B testing + Migration | 10 hours |

**Total:** 70 hours over 7 weeks (10 hours/week sustainable pace)

---

## Open Questions

- [ ] Do we need multi-language support? (English only for now)
- [ ] Should Beta users get early access discount?
- [ ] What's the minimum completion rate to consider success?
- [ ] How do we handle users who start on Typeform but switch to Beta mid-flow?

---

## Next Steps

1. **Fix Supabase data saving issue** (blocking production Typeform launch)
2. **Launch production with Typeform** (revenue first!)
3. **Start Beta Phase 1** (after first 10 production users)
4. **Iterate based on real user feedback**

---

**Last Updated:** 2025-10-25
**Maintainer:** Claude Code + Ringo
**Status:** Ready to start Phase 1 after production launch
