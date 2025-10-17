# Pull Request

## Description

**What does this PR do?**
A clear and concise description of the changes.

**Why is this change needed?**
Explain the motivation for this PR.

**Related Issue:**
Closes #[issue-number]

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (no functional changes, code improvements)
- [ ] Documentation update
- [ ] Dependency update
- [ ] Configuration change
- [ ] Database migration

## Changes Made

**Summary of changes:**
- Added: [list additions]
- Modified: [list modifications]
- Removed: [list removals]
- Fixed: [list fixes]

## Testing

**How has this been tested?**
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] Test suite (scripts/test-dual-retention.js)

**Test scenarios covered:**
1. [Scenario 1]
2. [Scenario 2]
3. [Scenario 3]

**Test results:**
```
Paste test output here
```

## Database Changes

**Does this PR include database migrations?**
- [ ] Yes - Migration file: `scripts/migrations/[filename]`
- [ ] No

**If yes:**
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Migration tested locally
- [ ] Migration tested on staging/dev
- [ ] Rollback procedure documented

## GDPR/Legal Compliance

**Does this PR affect:**
- [ ] Data retention policies
- [ ] User privacy
- [ ] Data export functionality
- [ ] Email notifications to users
- [ ] Audit trails
- [ ] None of the above

**If yes, explain:**
[Describe the legal implications and how they're addressed]

## Impact Assessment

**Affected components:**
- [ ] Frontend (public pages)
- [ ] Backend API
- [ ] Database schema
- [ ] Email system
- [ ] Cron jobs
- [ ] Webhooks (Typeform/GitHub)
- [ ] Image processing
- [ ] Export functionality
- [ ] Authentication/authorization

**Breaking changes:**
- [ ] This PR includes breaking changes
- [ ] API endpoints changed
- [ ] Environment variables changed
- [ ] Configuration format changed

**If breaking changes, explain:**
[Describe what will break and how to migrate]

## Deployment Checklist

**Pre-deployment:**
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables documented (if new ones added)
- [ ] Database migrations ready (if applicable)
- [ ] Documentation updated

**Post-deployment:**
- [ ] Monitor error logs
- [ ] Verify health checks pass
- [ ] Test critical user flows
- [ ] Monitor cron jobs (if affected)

## Environment Variables

**New environment variables added:**
```env
VARIABLE_NAME=description_of_value
```

**Modified environment variables:**
```env
VARIABLE_NAME=new_format_or_usage
```

## Documentation

**Documentation updates included:**
- [ ] README.md updated
- [ ] API documentation updated
- [ ] Code comments added/updated
- [ ] Migration guide provided (if needed)
- [ ] User-facing documentation updated

## Code Quality

**Code review checklist:**
- [ ] Code follows project style guidelines
- [ ] No console.log statements in production code
- [ ] Error handling implemented appropriately
- [ ] Security considerations addressed
- [ ] Performance implications considered
- [ ] No hardcoded sensitive data
- [ ] Proper logging implemented

## Security

**Security considerations:**
- [ ] No sensitive data exposed in logs
- [ ] Authentication/authorization properly implemented
- [ ] Input validation added
- [ ] SQL injection prevention verified
- [ ] XSS protection verified
- [ ] CORS configured correctly
- [ ] Rate limiting considered

## Rollback Plan

**If this deployment fails, how do we rollback?**
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Screenshots/Videos

**If applicable, add screenshots or videos:**
[Add screenshots here]

## Additional Notes

**Anything else reviewers should know:**
[Add any additional context]

## Reviewer Checklist

**For reviewers:**
- [ ] Code changes reviewed
- [ ] Tests reviewed and passing
- [ ] Documentation adequate
- [ ] GDPR/legal considerations addressed
- [ ] Security implications reviewed
- [ ] Performance implications considered
- [ ] Deployment plan clear

---

**@claude** - Please review this PR for security issues and GDPR compliance.
