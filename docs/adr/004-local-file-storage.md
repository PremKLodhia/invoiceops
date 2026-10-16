# ADR-004: Local File Storage for Uploaded Documents

## Status
Accepted

## Context
Uploaded invoices (PDFs, images) need to be stored securely. Options:
1. Store files in the database as BLOBs
2. Store files on the local filesystem
3. Use cloud object storage (S3, GCS)

## Decision
Use **local filesystem storage**:
- Files stored in a configurable directory (`APP_UPLOAD_DIR`, default: `./uploads`)
- Files renamed to UUID-based names to prevent path traversal and name collisions
- Original filename stored in the database only
- File integrity verified via SHA-256 hash
- Files served via a controlled API endpoint with authentication checks
- Directory excluded from source control

## Consequences
- **Zero cost**: no cloud storage fees.
- **Simple**: no SDK dependencies.
- **Secure**: UUID filenames prevent traversal; API-controlled access prevents direct file serving.
- **Trade-off**: files are tied to the local machine. Backup is the user's responsibility.

## Alternatives Rejected
- **Database BLOBs**: increases DB size, backup complexity, and query overhead.
- **Cloud storage**: violates zero-cost requirement and adds external dependency.
