-- Optimistic locking for invoices (JPA @Version). Existing rows start at version 0.
ALTER TABLE invoices ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
