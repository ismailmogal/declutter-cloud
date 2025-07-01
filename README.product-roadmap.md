# Declutter Cloud: Security & Production Roadmap

## Security & Production-Readiness Review

### Current State
- **Authentication:** JWT-based, OAuth for cloud providers. Basic user management in place.
- **API:** FastAPI backend, some endpoints protected, but input validation and error handling could be improved.
- **Frontend:** React/Material-UI, modern SPA, but no explicit XSS/CSRF protections.
- **Cloud Integration:** OneDrive/Google Drive support, tokens stored in DB.
- **Testing:** Unit and integration tests exist, but coverage can be expanded.
- **Deployment:** Scripts for deployment, but no CI/CD, monitoring, or scaling setup.

---

## Phased Plan for Security & Production Hardening

### **Phase 1: Immediate (High Priority)**
- [ ] **Enforce HTTPS** everywhere (use reverse proxy or cloud load balancer).
- [ ] **Restrict CORS** to production domains only.
- [ ] **Input Validation:** Use Pydantic models for all request bodies and query params.
- [ ] **Error Handling:** Remove stack traces and sensitive info from API responses.
- [ ] **Token Security:** Ensure OAuth tokens are encrypted at rest and never logged.
- [ ] **Environment Variables:** Move all secrets/configs out of code and into env vars or a secrets manager.
- [ ] **Dependency Audit:** Run `pip-audit` and `npm audit` and patch vulnerabilities.
- [ ] **Production Builds:** Ensure frontend is built with `vite build` and served with cache headers.

### **Phase 2: Short-term (Next Sprint)**
- [ ] **Role-Based Access Control:** Add roles (admin/user) and enforce on all endpoints.
- [ ] **Rate Limiting:** Add API rate limiting (e.g., FastAPI-limiter, Nginx, or API Gateway).
- [ ] **Audit Logging:** Log all destructive actions (deletes, updates) with user info and timestamps.
- [ ] **Health Checks:** Implement `/health` endpoints for readiness/liveness probes.
- [ ] **Monitoring & Alerts:** Integrate Sentry, Datadog, or similar for error and performance monitoring.
- [ ] **Automated Backups:** Set up regular DB backups and test restores.
- [ ] **CI/CD Pipeline:** Add automated tests, linting, and deploys on PR merge.

### **Phase 3: Medium-term (1-2 Months)**
- [ ] **OAuth Scope Minimization:** Use least-privilege scopes for cloud APIs.
- [ ] **User Privacy:** Add data export and account deletion features.
- [ ] **Soft Delete/Trash Bin:** Implement a trash bin for file deletions (with retention period).
- [ ] **File Upload Security:** If uploads are allowed, scan for malware and restrict file types/sizes.
- [ ] **Database Migrations:** Ensure all schema changes use Alembic and are version-controlled.
- [ ] **Frontend Security:** Add CSRF protection for any forms, and review for XSS vectors.
- [ ] **Documentation:** Update API and deployment docs for new security features.

### **Phase 4: Long-term (Ongoing)**
- [ ] **Scaling:** Add autoscaling and load balancing for backend/frontend.
- [ ] **Disaster Recovery:** Document and test full recovery procedures.
- [ ] **Penetration Testing:** Schedule regular security assessments.
- [ ] **User Education:** Add privacy and security tips to the UI.
- [ ] **Continuous Improvement:** Regularly review and update dependencies, policies, and practices.

---

## Notes
- This roadmap should be reviewed and updated after each phase.
- Each item should have an owner and a target date assigned during sprint planning.

---

*Prepared: [date will be filled in tomorrow]* 