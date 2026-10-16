export type UserRole =
  | 'ADMIN'
  | 'REVIEWER'
  | 'APPROVER'
  | 'admin'
  | 'finance_manager'
  | 'operator'
  | 'auditor';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organisationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Organisation {
  id: string;
  name: string;
  slug?: string;
  taxId?: string;
  currency: string;
  createdAt: string;
}

export type InvoiceStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'EXTRACTION_FAILED'
  | 'NEEDS_REVIEW'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'DRAFT'
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'matched'
  | 'disputed'
  | 'paid'
  | 'rejected';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED' | 'CORRECTED' | 'MANUAL';

export interface ExtractionField {
  id?: string;
  fieldName: string;
  extractedValue: string | null;
  correctedValue: string | null;
  confidence: ConfidenceLevel;
  source: 'EXTRACTED' | 'OCR' | 'AI' | 'MANUAL';
  correctedBy?: string;
  correctedAt?: string;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder?: number;
  source?: 'EXTRACTED' | 'MANUAL';
}

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationResult {
  id: string;
  ruleName: string;
  severity: ValidationSeverity;
  message: string;
  fieldName?: string;
  resolved: boolean;
}

export interface AuditEvent {
  id: string;
  organisationId?: string;
  actorId?: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId?: string;
  supplierName: string;
  purchaseOrderId?: string;
  poNumber?: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  status: InvoiceStatus;
  notes?: string;
  lineItems?: InvoiceLineItem[];
  hasValidationErrors?: boolean;
  hasDuplicateWarning?: boolean;
  hasPoMismatch?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DuplicateInvoiceMatch {
  invoiceId?: string;
  invoiceNumber?: string;
  supplierName?: string;
  date?: string;
  grossAmount?: number;
  matchedInvoiceNumber?: string;
  matchedSupplierName?: string;
  matchedDate?: string;
  matchedGrossAmount?: number;
}

export interface PoMismatchDetails {
  poNumber: string;
  poAmount: number;
  invoiceAmount: number;
  variance: number;
}

export interface InvoiceDetail {
  id: string;
  organisationId?: string;
  supplierId?: string;
  supplierName: string;
  purchaseOrderId?: string;
  poNumber?: string;
  originalFilename?: string;
  storedFilename?: string;
  contentType?: string;
  fileSize?: number;

  invoiceNumber: string;
  invoiceDate?: string;
  issueDate?: string;
  dueDate?: string;
  currency: string;
  netAmount: number;
  taxAmount: number;
  taxRate?: number;
  grossAmount: number;
  supplierNameExtracted?: string;
  poReferenceExtracted?: string;

  status: InvoiceStatus;
  extractionMethod?: string;
  extractionCompletedAt?: string;

  submittedBy?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;

  hasValidationErrors?: boolean;
  hasDuplicateWarning?: boolean;
  hasPoMismatch?: boolean;
  duplicateDetails?: DuplicateInvoiceMatch;
  poMismatchDetails?: PoMismatchDetails;

  lineItems: InvoiceLineItem[];
  fields?: Record<string, ExtractionField>;
  validationResults?: ValidationResult[];
  auditEvents?: AuditEvent[];

  createdAt: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  organisationId?: string;
  name: string;
  contactEmail?: string;
  address?: string;
  taxId?: string;
  notes?: string;
  active: boolean;
  invoicesCount?: number;
  currency?: string;
  paymentTerms?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PurchaseOrderStatus =
  | 'OPEN'
  | 'PARTIALLY_MATCHED'
  | 'FULLY_MATCHED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'open'
  | 'partially_received'
  | 'closed'
  | 'cancelled';

export interface PurchaseOrderItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  id: string;
  organisationId?: string;
  poNumber: string;
  supplierId?: string;
  supplierName?: string;
  description?: string;
  totalAmount: number;
  currency: string;
  status: PurchaseOrderStatus;
  issuedDate?: string;
  items?: PurchaseOrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface DashboardMetrics {
  needsReviewCount: number;
  pendingApprovalCount: number;
  approvedCount: number;
  disputedCount: number;
  totalCount: number;
  currencyBreakdown: {
    currency: string;
    totalAmount: number;
    count: number;
  }[];
  recentInvoices: Invoice[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthSession {
  user: User;
  organisation: Organisation;
}
