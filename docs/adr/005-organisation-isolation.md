# ADR-005: Multi-Tenant Organisation Data Isolation

## Status
Accepted

## Context
InvoiceOps manages sensitive financial documents for organizations. One organization must never be able to access, view, search, modify, or download documents belonging to another organization.

Options considered:
1. Separate database per tenant (multi-database)
2. Separate schema per tenant (multi-schema)
3. Shared database, shared schema with discriminant column (`organisation_id`) enforced at the service and repository layer

## Decision
Use **shared schema with tenant discriminator column (`organisation_id`)**:
- Every business entity (`User`, `Supplier`, `PurchaseOrder`, `Invoice`, `AuditEvent`) contains a mandatory foreign key reference to `organisations.id`.
- The current user's `organisation_id` is derived strictly from the verified server-side security context (authenticated `User`), never from client-provided request parameters or headers.
- Every repository query filtering by ID or performing a search includes `WHERE organisation_id = :orgId`.
- Document download endpoints verify that the invoice associated with the document belongs to the authenticated user's organization before streaming bytes.
- Automated integration test `OrganisationIsolationTest` validates that cross-tenant access attempts return HTTP 403 Forbidden or 404 Not Found.

## Consequences
- **Zero operational cost**: works with a single PostgreSQL database instance.
- **Low latency**: no dynamic database connection routing.
- **High testability**: multi-tenant isolation easily validated within standard Spring Boot test slices.
- **Requirement**: developers must never write unscoped queries for tenant entities.
