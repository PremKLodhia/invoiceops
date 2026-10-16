# ADR-003: Session-Based Authentication

## Status
Accepted

## Context
InvoiceOps needs authentication. Options considered:
1. JWT tokens (stateless)
2. Session cookies (stateful)
3. OAuth2 / OIDC with external provider

## Decision
Use **session-based authentication** with Spring Security's default HTTP session mechanism:
- Login via POST /api/auth/login with credentials
- Session stored server-side, session ID in HttpOnly cookie
- CSRF token via cookie (CookieCsrfTokenRepository) for SPA compatibility
- CORS restricted to the frontend origin
- Logout invalidates the session

## Consequences
- **Simpler security**: no token refresh, no token storage in browser.
- **Better for monolith**: sessions are efficient with a single server.
- **CSRF protection**: natural with session cookies.
- **Standard Spring Security**: well-documented, fewer custom configurations.
- **Trade-off**: requires sticky sessions for horizontal scaling (not needed here).

## Alternatives Rejected
- **JWT**: more complex, requires secure storage in browser, needs refresh token logic, vulnerable to XSS if stored in localStorage. Overkill for a monolith.
- **OAuth2/OIDC**: requires external identity provider or adds significant complexity. Not needed for this scope.
