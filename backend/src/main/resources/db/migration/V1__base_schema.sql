-- Organisations
CREATE TABLE organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'REVIEWER', 'APPROVER')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_org ON users(organisation_id);
CREATE INDEX idx_users_email ON users(email);

-- Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    address TEXT,
    tax_id VARCHAR(100),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_org ON suppliers(organisation_id);
CREATE INDEX idx_suppliers_name ON suppliers(organisation_id, name);

-- Purchase Orders
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    supplier_id UUID REFERENCES suppliers(id),
    po_number VARCHAR(100) NOT NULL,
    description TEXT,
    total_amount NUMERIC(15, 2),
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIALLY_MATCHED', 'FULLY_MATCHED', 'CLOSED', 'CANCELLED')),
    issued_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(organisation_id, po_number)
);

CREATE INDEX idx_po_org ON purchase_orders(organisation_id);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);

-- Purchase Order Line Items
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    description VARCHAR(500) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    supplier_id UUID REFERENCES suppliers(id),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    
    -- Document metadata
    original_filename VARCHAR(500),
    stored_filename VARCHAR(500),
    file_hash VARCHAR(128),
    file_size BIGINT,
    content_type VARCHAR(100),
    
    -- Extracted/corrected fields
    invoice_number VARCHAR(255),
    invoice_date DATE,
    due_date DATE,
    currency VARCHAR(3) DEFAULT 'GBP',
    net_amount NUMERIC(15, 2),
    tax_amount NUMERIC(15, 2),
    tax_rate NUMERIC(5, 2),
    gross_amount NUMERIC(15, 2),
    supplier_name_extracted VARCHAR(255),
    po_reference_extracted VARCHAR(255),
    
    -- Processing
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'PROCESSING', 'EXTRACTION_FAILED', 'NEEDS_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
    extraction_method VARCHAR(50),
    extraction_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Approval
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Flags
    has_validation_errors BOOLEAN NOT NULL DEFAULT FALSE,
    has_duplicate_warning BOOLEAN NOT NULL DEFAULT FALSE,
    has_po_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamps
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_org ON invoices(organisation_id);
CREATE INDEX idx_invoices_status ON invoices(organisation_id, status);
CREATE INDEX idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX idx_invoices_number ON invoices(organisation_id, invoice_number);
CREATE INDEX idx_invoices_hash ON invoices(file_hash);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(500),
    quantity NUMERIC(10, 2),
    unit_price NUMERIC(15, 2),
    line_total NUMERIC(15, 2),
    sort_order INT NOT NULL DEFAULT 0,
    source VARCHAR(20) NOT NULL DEFAULT 'EXTRACTED' CHECK (source IN ('EXTRACTED', 'MANUAL')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_line_items_invoice ON invoice_line_items(invoice_id);

-- Extraction Field Results
CREATE TABLE extraction_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    extracted_value TEXT,
    corrected_value TEXT,
    confidence VARCHAR(20) DEFAULT 'UNVERIFIED' CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED', 'MANUAL')),
    source VARCHAR(20) NOT NULL DEFAULT 'EXTRACTED' CHECK (source IN ('EXTRACTED', 'OCR', 'AI', 'MANUAL')),
    corrected_by UUID REFERENCES users(id),
    corrected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_extraction_fields_invoice ON extraction_fields(invoice_id);

-- Validation Results
CREATE TABLE validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('ERROR', 'WARNING', 'INFO')),
    message TEXT NOT NULL,
    field_name VARCHAR(100),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_validation_invoice ON validation_results(invoice_id);

-- Audit Events
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    actor_id UUID REFERENCES users(id),
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_events(organisation_id);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_events(organisation_id, created_at DESC);
