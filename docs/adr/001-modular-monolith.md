# ADR-001: Modular Monolith Architecture

## Status
Accepted

## Context
InvoiceOps needs a backend architecture. Options considered:
1. Microservices (separate services for invoices, extraction, approval, etc.)
2. Modular monolith (single deployable, logically separated packages)
3. Simple layered monolith (controller → service → repository)

## Decision
Use a **modular monolith** — a single Spring Boot application with clear package-level modules:
- `identity` — users, organisations, roles, authentication
- `invoice` — invoice entities, lifecycle, status machine
- `extraction` — PDF/OCR text extraction, field parsing
- `supplier` — supplier management
- `purchaseorder` — purchase order management and matching
- `approval` — approval workflow
- `audit` — audit event logging
- `reporting` — dashboard aggregations and CSV export
- `document` — file storage and retrieval
- `config` — cross-cutting configuration

## Consequences
- **Simpler deployment**: one JAR, one container, one database.
- **Easier testing**: integration tests share a single Spring context.
- **Clear boundaries**: packages enforce logical separation without network overhead.
- **Future-proof**: modules can be extracted into services later if needed.
- **No distributed transactions**: all operations are local.
- **Trade-off**: all modules scale together (acceptable for this use case).

## Alternatives Rejected
- **Microservices**: unnecessary complexity for a small-business tool. Would require service discovery, distributed tracing, message brokers, and multiple databases — none of which serve the user.
- **Simple layered**: insufficient separation for a system with distinct business domains.
