# Security Policy

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

### How to Report

If you discover a security vulnerability in Lockstep, please email us at:

**[security@lockstep.app](mailto:security@lockstep.app)**

Include the following information:

1. **Description of the vulnerability**
   - What is the vulnerability?
   - What systems does it affect?

2. **Steps to reproduce**
   - How can the vulnerability be reproduced?
   - Any specific conditions or prerequisites?

3. **Potential impact**
   - What could an attacker accomplish?
   - How severe is the vulnerability?

4. **Suggested fix** (optional)
   - Do you have ideas on how to fix it?

### Response Timeline

- **Initial Response:** Within 24 hours of report
- **Assessment:** 48 hours to confirm and assess severity
- **Fix Development:** Severity-dependent timeline
- **Public Disclosure:** After patch is released and users have time to update

### Severity Levels

| Severity | Response Time | Definition |
| --- | --- | --- |
| **Critical** | ASAP (< 4 hours) | Remote code execution, data breach, authentication bypass |
| **High** | < 24 hours | Significant security flaw affecting functionality |
| **Medium** | < 48 hours | Security issue with limited impact or difficult exploitation |
| **Low** | < 1 week | Minor security concern, limited practical impact |

## Security Best Practices for Users

### Authentication

- Use a strong, unique password
- Never share your magic link or authentication token
- Log out after suspicious activity

### Data Privacy

- Review what data sources you connect (calendar, messaging, etc.)
- Understand that voice notes and journal entries are stored and analyzed
- Delete your account to remove all personal data

### Payment Security

- Only use Lockstep's secure forms for payment
- Never enter payment details in untrusted links
- Review your transaction history regularly

### Reporting Non-Security Issues

- Bug reports: Use GitHub Issues with [BUG] tag
- Feature requests: Use GitHub Issues with [FEATURE] tag
- Questions: Use GitHub Discussions or [support@lockstep.app](mailto:support@lockstep.app)

## Scope


This policy covers:

- ✅ Lockstep web application
- ✅ Lockstep mobile app (Capacitor)
- ✅ Supabase Edge Functions
- ✅ API endpoints

**Out of scope:**

- ❌ Dependent libraries or third-party services (report to them directly)
- ❌ Social engineering attacks
- ❌ Brute force attacks
- ❌ DDoS attacks

## Vulnerability Disclosure Timeline

1. **Day 0:** Vulnerability reported to [security@lockstep.app](mailto:security@lockstep.app)
2. **Day 1:** We confirm receipt and begin assessment
3. **Day 3-7:** Initial patch developed and tested
4. **Day 7-14:** Patch released to production
5. **Day 14+:** Public disclosure (after users have time to update)

For critical vulnerabilities, we may accelerate this timeline.

## Hall of Fame

We appreciate and publicly credit security researchers who responsibly disclose vulnerabilities (with permission).

## Building Securely

When contributing to Lockstep, follow these security practices:

### Code

- Never hardcode secrets, API keys, or credentials
- Validate and sanitize all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper error handling (don't leak sensitive data)
- Keep dependencies updated

### Data

- Use HTTPS for all communications
- Hash passwords and sensitive data
- Implement proper access controls
- Log security events
- Respect user privacy settings

### Deployment

- Use environment variables for secrets
- Enable security headers (CSP, X-Frame-Options, etc.)
- Implement rate limiting and request validation
- Monitor logs for suspicious activity
- Keep servers and dependencies patched

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

## Contact

- **Security Issues:** [security@lockstep.app](mailto:security@lockstep.app)
- **General Support:** [support@lockstep.app](mailto:support@lockstep.app)
- **Legal:** [legal@lockstep.app](mailto:legal@lockstep.app)
