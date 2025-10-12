
# Contributing to Car Crash Lawyer AI

Thank you for your interest in contributing to Car Crash Lawyer AI! This document provides guidelines and information for contributors.

## 🏗️ Project Architecture

This project uses a modular Node.js architecture with the following structure:

```
src/
├── app.js                 # Express app configuration
├── config/                # Configuration management
├── controllers/           # Route controllers (business logic)
├── routes/                # Express routes
├── middleware/            # Custom middleware
├── services/              # Business logic services
├── models/                # Data models
├── utils/                 # Utility functions
└── websocket/             # WebSocket handling
```

## 🔧 Development Setup

### Prerequisites
- Node.js 18+ (see `.nvmrc` for exact version)
- Access to Supabase database
- OpenAI API key
- what3words API key (optional)

### Getting Started

1. **Clone and setup:**
   ```bash
   git clone [repository-url]
   cd car-crash-lawyer-ai
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env
   # Fill in your actual environment variables
   ```

3. **Run development server:**
   ```bash
   npm run dev
   # or
   npm start
   ```

4. **Verify setup:**
   ```bash
   curl http://localhost:5000/healthz
   ```

## 📝 Coding Standards

### Code Style
- Use 2 spaces for indentation
- Follow ESLint configuration (run `npm run lint`)
- Use Prettier for formatting (run `npm run format`)
- Maximum line length: 100 characters
- Use semicolons and trailing commas

### File Organization
- One feature per file
- Controllers handle HTTP requests/responses only
- Services contain business logic
- Utilities are pure functions
- Keep files under 200 lines when possible

### Naming Conventions
- Files: `kebab-case.js`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Classes: `PascalCase`
- Database tables: `snake_case`

## 🧪 Testing

### Running Tests
```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
npm run health        # Health check
```

### Writing Tests
- Place test files in `__tests__/` directories
- Use descriptive test names
- Mock external services
- Test both success and error scenarios
- Maintain >80% code coverage

### Test Structure
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should handle normal case', () => {
    // Test implementation
  });

  it('should handle error case', () => {
    // Error test implementation
  });
});
```

## 🔒 Security Guidelines

### Authentication & Authorization
- Always validate user authentication
- Use UUIDs, never incremental IDs
- Implement proper RBAC where needed
- Log all authentication events

### Data Handling
- Sanitize all user inputs
- Use parameterized queries
- Never log sensitive data
- Follow GDPR compliance requirements
- Implement proper audit trails

### API Security
- Use rate limiting on all endpoints
- Validate Content-Type headers
- Implement CORS properly
- Use HTTPS in production
- Validate all request parameters

## 📊 Database Guidelines

### Schema Changes
- Use Supabase migrations for schema changes
- Never modify schema directly in production
- Include rollback migrations
- Update RLS policies as needed

### Queries
- Use Row Level Security (RLS) policies
- Always use `create_user_id` for user data filtering
- Index frequently queried columns
- Use connection pooling
- Handle database errors gracefully

### Data Privacy
- All user data must be owned by `create_user_id`
- Implement data retention policies
- Support GDPR deletion requests
- Audit all data access

## 🌐 API Development

### REST Endpoints
- Use consistent URL patterns: `/api/resource` or `/api/resource/:id`
- Implement proper HTTP status codes
- Include request/response examples in documentation
- Use consistent error response format

### Request/Response Format
```javascript
// Success Response
{
  "success": true,
  "data": { ... },
  "requestId": "req_123"
}

// Error Response
{
  "success": false,
  "error": "Human readable message",
  "code": "ERROR_CODE",
  "requestId": "req_123"
}
```

### WebSocket Implementation
- Handle connection failures gracefully
- Implement reconnection logic
- Validate all incoming messages
- Use proper event naming

## 🔍 Debugging & Logging

### Logging Standards
- Use structured logging with context
- Include request IDs in all logs
- Log at appropriate levels (error, warn, info, debug)
- Never log sensitive information
- Use correlation IDs for tracing

### Debugging Tools
- Use the `/api/debug` endpoints for troubleshooting
- Check health endpoints for service status
- Use browser dev tools for frontend issues
- Monitor real-time logs in production

## 📋 Pull Request Process

### Before Submitting
1. Run all tests: `npm test`
2. Check code quality: `npm run lint`
3. Format code: `npm run format`
4. Update documentation if needed
5. Test manually in development environment

### PR Requirements
- Clear, descriptive title
- Description explaining what and why
- Reference related issues
- Include testing instructions
- Update CHANGELOG.md if applicable
- Screenshots for UI changes

### Review Process
- PRs require at least one approval
- All CI checks must pass
- Manual testing may be required
- Security review for sensitive changes

## 🚀 Deployment

### Environment Management
- Development: Local development environment
- Staging: Replit staging environment  
- Production: Replit production environment

### Deployment Process
1. Merge to main branch
2. Automatic deployment to staging
3. Manual promotion to production
4. Monitor deployment health

## 📚 Documentation

### Code Documentation
- Document all public functions
- Include parameter types and descriptions
- Explain complex business logic
- Update README for major changes

### API Documentation
- Keep endpoint documentation current
- Include request/response examples
- Document error scenarios
- Update WEBHOOK_ENDPOINTS.md

## 🐛 Issue Reporting

### Bug Reports
- Use the bug report template
- Include reproduction steps
- Provide environment details
- Include logs and screenshots
- Label with appropriate priority

### Feature Requests
- Use the feature request template
- Explain the business case
- Provide implementation suggestions
- Consider security implications
- Discuss with team before implementation

## ⚡ Performance Guidelines

### Backend Performance
- Use appropriate database indexes
- Implement caching where beneficial
- Monitor memory usage
- Use connection pooling
- Optimize query performance

### Frontend Performance
- Minimize bundle sizes
- Use lazy loading
- Optimize images
- Implement proper caching
- Monitor Core Web Vitals

## 🔄 Maintenance

### Regular Tasks
- Update dependencies monthly
- Review security advisories
- Clean up logs and temporary files
- Monitor database performance
- Review and update documentation

### Monitoring
- Check health endpoints regularly
- Monitor error rates
- Track performance metrics
- Review security logs
- Monitor resource usage

## 📞 Getting Help

### Resources
- Internal documentation in `/docs`
- API documentation in README.md
- Architecture overview in MIGRATION_LOG.md
- Security guidelines in this document

### Communication
- Create GitHub issues for bugs
- Use discussions for questions
- Tag appropriate team members
- Include relevant context

## 🎯 Best Practices Summary

1. **Security First**: Always consider security implications
2. **Test Everything**: Write and run tests consistently
3. **Document Changes**: Keep documentation current
4. **Monitor Performance**: Watch for performance regressions
5. **Follow Standards**: Adhere to coding and API standards
6. **Be Consistent**: Follow established patterns
7. **Think GDPR**: Consider privacy implications
8. **Error Handling**: Gracefully handle all error scenarios

---

Thank you for contributing to Car Crash Lawyer AI! 🚗✨
