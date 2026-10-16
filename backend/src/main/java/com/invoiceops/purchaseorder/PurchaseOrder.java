package com.invoiceops.purchaseorder;

import com.invoiceops.supplier.Supplier;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "purchase_orders", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"organisation_id", "po_number"})
})
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organisation_id", nullable = false)
    private UUID organisationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Column(name = "po_number", nullable = false, length = 100)
    private String poNumber;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 3)
    private String currency = "GBP";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PurchaseOrderStatus status = PurchaseOrderStatus.OPEN;

    @Column(name = "issued_date")
    private LocalDate issuedDate;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchaseOrderItem> lineItems = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public PurchaseOrder() {
    }

    public PurchaseOrder(UUID organisationId, Supplier supplier, String poNumber, String description,
                         BigDecimal totalAmount, String currency, PurchaseOrderStatus status, LocalDate issuedDate) {
        this.organisationId = organisationId;
        this.supplier = supplier;
        this.poNumber = poNumber;
        this.description = description;
        this.totalAmount = totalAmount;
        this.currency = (currency != null && !currency.isBlank()) ? currency : "GBP";
        this.status = status != null ? status : PurchaseOrderStatus.OPEN;
        this.issuedDate = issuedDate;
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

    public void addLineItem(PurchaseOrderItem item) {
        lineItems.add(item);
        item.setPurchaseOrder(this);
    }

    public void removeLineItem(PurchaseOrderItem item) {
        lineItems.remove(item);
        item.setPurchaseOrder(null);
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

    public String getPoNumber() {
        return poNumber;
    }

    public void setPoNumber(String poNumber) {
        this.poNumber = poNumber;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public PurchaseOrderStatus getStatus() {
        return status;
    }

    public void setStatus(PurchaseOrderStatus status) {
        this.status = status;
    }

    public LocalDate getIssuedDate() {
        return issuedDate;
    }

    public void setIssuedDate(LocalDate issuedDate) {
        this.issuedDate = issuedDate;
    }

    public List<PurchaseOrderItem> getLineItems() {
        return lineItems;
    }

    public void setLineItems(List<PurchaseOrderItem> lineItems) {
        this.lineItems = lineItems;
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
}
