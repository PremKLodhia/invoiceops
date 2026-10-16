package com.invoiceops.invoice;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    @Query("SELECT i FROM Invoice i LEFT JOIN FETCH i.supplier LEFT JOIN FETCH i.purchaseOrder WHERE i.id = :id AND i.organisationId = :orgId")
    Optional<Invoice> findByIdAndOrganisationId(@Param("id") UUID id, @Param("orgId") UUID orgId);

    Page<Invoice> findByOrganisationId(UUID organisationId, Pageable pageable);

    Page<Invoice> findByOrganisationIdAndStatus(UUID organisationId, InvoiceStatus status, Pageable pageable);

    List<Invoice> findByOrganisationIdAndInvoiceNumber(UUID organisationId, String invoiceNumber);

    List<Invoice> findByOrganisationIdAndFileHash(UUID organisationId, String fileHash);

    List<Invoice> findByOrganisationIdAndSupplierIdAndInvoiceNumberIgnoreCase(
            UUID organisationId, UUID supplierId, String invoiceNumber);

    @Query("SELECT i FROM Invoice i LEFT JOIN i.supplier s WHERE i.organisationId = :orgId AND " +
            "(:status IS NULL OR i.status = :status) AND " +
            "(:search IS NULL OR LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(i.supplierNameExtracted) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(i.poReferenceExtracted) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Invoice> searchInvoices(
            @Param("orgId") UUID orgId,
            @Param("status") InvoiceStatus status,
            @Param("search") String search,
            Pageable pageable
    );

    long countByOrganisationId(UUID organisationId);

    long countByOrganisationIdAndStatus(UUID organisationId, InvoiceStatus status);

    long countByOrganisationIdAndHasDuplicateWarningTrue(UUID organisationId);

    long countByOrganisationIdAndHasPoMismatchTrue(UUID organisationId);

    @Query("SELECT i.currency, SUM(i.grossAmount) FROM Invoice i WHERE i.organisationId = :orgId AND i.grossAmount IS NOT NULL GROUP BY i.currency")
    List<Object[]> sumGrossAmountByCurrency(@Param("orgId") UUID orgId);

    List<Invoice> findByOrganisationIdOrderByCreatedAtDesc(UUID organisationId);
}
