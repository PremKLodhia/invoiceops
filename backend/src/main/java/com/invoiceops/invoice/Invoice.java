package com.invoiceops.invoice;

import com.invoiceops.extraction.ExtractionMethod;
import com.invoiceops.identity.User;
import com.invoiceops.purchaseorder.PurchaseOrder;
import com.invoiceops.supplier.Supplier;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "invoices")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organisation_id", nullable = false)
    private UUID organisationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id")
    private PurchaseOrder purchaseOrder;

    // Document metadata
    @Column(name = "original_filename", length = 500)
    private String originalFilename;

    @Column(name = "stored_filename", length = 500)
    private String storedFilename;

    @Column(name = "file_hash", length = 128)
    private String fileHash;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type", length = 100)
    private String contentType;

    // Extracted / corrected financial fields
    @Column(name = "invoice_number")
    private String invoiceNumber;

    @Column(name = "invoice_date")
    private LocalDate invoiceDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(length = 3)
    private String currency = "GBP";

    @Column(name = "net_amount", precision = 15, scale = 2)
    private BigDecimal netAmount;

    @Column(name = "tax_amount", precision = 15, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "tax_rate", precision = 5, scale = 2)
    private BigDecimal taxRate;

    @Column(name = "gross_amount", precision = 15, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "supplier_name_extracted")
    private String supplierNameExtracted;

    @Column(name = "po_reference_extracted")
    private String poReferenceExtracted;

    // Processing & state
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private InvoiceStatus status = InvoiceStatus.UPLOADED;

    @Enumerated(EnumType.STRING)
    @Column(name = "extraction_method", length = 50)
    private ExtractionMethod extractionMethod;

    @Column(name = "extraction_completed_at")
    private Instant extractionCompletedAt;

    // Workflow & Approval
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by")
    private User submittedBy;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // Validation flags
    @Column(name = "has_validation_errors", nullable = false)
    private boolean hasValidationErrors = false;

    @Column(name = "has_duplicate_warning", nullable = false)
    private boolean hasDuplicateWarning = false;

    @Column(name = "has_po_mismatch", nullable = false)
    private boolean hasPoMismatch = false;

    // Audit metadata
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Optimistic lock: a stale concurrent update (e.g. two approvers) fails instead of overwriting. */
    @Version
    @Column(name = "version", nullable = false)
    private long version;

    // Collections
    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceLineItem> lineItems = new ArrayList<>();

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExtractionField> extractionFields = new ArrayList<>();

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ValidationResult> validationResults = new ArrayList<>();

    public Invoice() {
    }

    public Invoice(UUID organisationId, String originalFilename, String storedFilename,
                   String fileHash, Long fileSize, String contentType, User uploadedBy) {
        this.organisationId = organisationId;
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.fileHash = fileHash;
        this.fileSize = fileSize;
        this.contentType = contentType;
        this.uploadedBy = uploadedBy;
        this.status = InvoiceStatus.UPLOADED;
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void addLineItem(InvoiceLineItem item) {
        lineItems.add(item);
        item.setInvoice(this);
    }

    public void clearLineItems() {
        for (InvoiceLineItem item : lineItems) {
            item.setInvoice(null);
        }
        lineItems.clear();
    }

    public void addExtractionField(ExtractionField field) {
        extractionFields.add(field);
        field.setInvoice(this);
    }

    public void clearExtractionFields() {
        for (ExtractionField field : extractionFields) {
            field.setInvoice(null);
        }
        extractionFields.clear();
    }

    public void addValidationResult(ValidationResult result) {
        validationResults.add(result);
        result.setInvoice(this);
    }

    public void clearValidationResults() {
        for (ValidationResult result : validationResults) {
            result.setInvoice(null);
        }
        validationResults.clear();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getOrganisationId() {
        return organisationId;
    }

    public void setOrganisationId(UUID organisationId) {
        this.organisationId = organisationId;
    }

    public Supplier getSupplier() {
        return supplier;
    }

    public void setSupplier(Supplier supplier) {
        this.supplier = supplier;
    }

    public PurchaseOrder getPurchaseOrder() {
        return purchaseOrder;
    }

    public void setPurchaseOrder(PurchaseOrder purchaseOrder) {
        this.purchaseOrder = purchaseOrder;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getStoredFilename() {
        return storedFilename;
    }

    public void setStoredFilename(String storedFilename) {
        this.storedFilename = storedFilename;
    }

    public String getFileHash() {
        return fileHash;
    }

    public void setFileHash(String fileHash) {
        this.fileHash = fileHash;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public LocalDate getInvoiceDate() {
        return invoiceDate;
    }

    public void setInvoiceDate(LocalDate invoiceDate) {
        this.invoiceDate = invoiceDate;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public BigDecimal getNetAmount() {
        return netAmount;
    }

    public void setNetAmount(BigDecimal netAmount) {
        this.netAmount = netAmount;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(BigDecimal taxAmount) {
        this.taxAmount = taxAmount;
    }

    public BigDecimal getTaxRate() {
        return taxRate;
    }

    public void setTaxRate(BigDecimal taxRate) {
        this.taxRate = taxRate;
    }

    public BigDecimal getGrossAmount() {
        return grossAmount;
    }

    public void setGrossAmount(BigDecimal grossAmount) {
        this.grossAmount = grossAmount;
    }

    public String getSupplierNameExtracted() {
        return supplierNameExtracted;
    }

    public void setSupplierNameExtracted(String supplierNameExtracted) {
        this.supplierNameExtracted = supplierNameExtracted;
    }

    public String getPoReferenceExtracted() {
        return poReferenceExtracted;
    }

    public void setPoReferenceExtracted(String poReferenceExtracted) {
        this.poReferenceExtracted = poReferenceExtracted;
    }

    public InvoiceStatus getStatus() {
        return status;
    }

    public void setStatus(InvoiceStatus status) {
        this.status = status;
    }

    public ExtractionMethod getExtractionMethod() {
        return extractionMethod;
    }

    public void setExtractionMethod(ExtractionMethod extractionMethod) {
        this.extractionMethod = extractionMethod;
    }

    public Instant getExtractionCompletedAt() {
        return extractionCompletedAt;
    }

    public void setExtractionCompletedAt(Instant extractionCompletedAt) {
        this.extractionCompletedAt = extractionCompletedAt;
    }

    public User getSubmittedBy() {
        return submittedBy;
    }

    public void setSubmittedBy(User submittedBy) {
        this.submittedBy = submittedBy;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public User getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(User reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public boolean isHasValidationErrors() {
        return hasValidationErrors;
    }

    public void setHasValidationErrors(boolean hasValidationErrors) {
        this.hasValidationErrors = hasValidationErrors;
    }

    public boolean isHasDuplicateWarning() {
        return hasDuplicateWarning;
    }

    public void setHasDuplicateWarning(boolean hasDuplicateWarning) {
        this.hasDuplicateWarning = hasDuplicateWarning;
    }

    public boolean isHasPoMismatch() {
        return hasPoMismatch;
    }

    public void setHasPoMismatch(boolean hasPoMismatch) {
        this.hasPoMismatch = hasPoMismatch;
    }

    public User getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(User uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public long getVersion() {
        return version;
    }

    public List<InvoiceLineItem> getLineItems() {
        return lineItems;
    }

    public void setLineItems(List<InvoiceLineItem> lineItems) {
        this.lineItems = lineItems;
    }

    public List<ExtractionField> getExtractionFields() {
        return extractionFields;
    }

    public void setExtractionFields(List<ExtractionField> extractionFields) {
        this.extractionFields = extractionFields;
    }

    public List<ValidationResult> getValidationResults() {
        return validationResults;
    }

    public void setValidationResults(List<ValidationResult> validationResults) {
        this.validationResults = validationResults;
    }
}
