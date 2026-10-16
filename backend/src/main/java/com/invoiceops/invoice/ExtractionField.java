package com.invoiceops.invoice;

import com.invoiceops.extraction.ConfidenceLevel;
import com.invoiceops.extraction.FieldSource;
import com.invoiceops.identity.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "extraction_fields")
public class ExtractionField {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Column(name = "field_name", nullable = false, length = 100)
    private String fieldName;

    @Column(name = "extracted_value", columnDefinition = "TEXT")
    private String extractedValue;

    @Column(name = "corrected_value", columnDefinition = "TEXT")
    private String correctedValue;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ConfidenceLevel confidence = ConfidenceLevel.UNVERIFIED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FieldSource source = FieldSource.EXTRACTED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corrected_by")
    private User correctedBy;

    @Column(name = "corrected_at")
    private Instant correctedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ExtractionField() {
    }

    public ExtractionField(String fieldName, String extractedValue, ConfidenceLevel confidence, FieldSource source) {
        this.fieldName = fieldName;
        this.extractedValue = extractedValue;
        this.confidence = confidence != null ? confidence : ConfidenceLevel.UNVERIFIED;
        this.source = source != null ? source : FieldSource.EXTRACTED;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Invoice getInvoice() {
        return invoice;
    }

    public void setInvoice(Invoice invoice) {
        this.invoice = invoice;
    }

    public String getFieldName() {
        return fieldName;
    }

    public void setFieldName(String fieldName) {
        this.fieldName = fieldName;
    }

    public String getExtractedValue() {
        return extractedValue;
    }

    public void setExtractedValue(String extractedValue) {
        this.extractedValue = extractedValue;
    }

    public String getCorrectedValue() {
        return correctedValue;
    }

    public void setCorrectedValue(String correctedValue) {
        this.correctedValue = correctedValue;
    }

    public ConfidenceLevel getConfidence() {
        return confidence;
    }

    public void setConfidence(ConfidenceLevel confidence) {
        this.confidence = confidence;
    }

    public FieldSource getSource() {
        return source;
    }

    public void setSource(FieldSource source) {
        this.source = source;
    }

    public User getCorrectedBy() {
        return correctedBy;
    }

    public void setCorrectedBy(User correctedBy) {
        this.correctedBy = correctedBy;
    }

    public Instant getCorrectedAt() {
        return correctedAt;
    }

    public void setCorrectedAt(Instant correctedAt) {
        this.correctedAt = correctedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
