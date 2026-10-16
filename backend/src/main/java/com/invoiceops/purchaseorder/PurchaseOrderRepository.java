package com.invoiceops.purchaseorder;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {

    @Query("SELECT DISTINCT p FROM PurchaseOrder p LEFT JOIN FETCH p.supplier LEFT JOIN FETCH p.lineItems WHERE p.organisationId = :orgId ORDER BY p.createdAt DESC")
    List<PurchaseOrder> findByOrganisationId(@Param("orgId") UUID orgId);

    @Query("SELECT p FROM PurchaseOrder p LEFT JOIN FETCH p.supplier LEFT JOIN FETCH p.lineItems WHERE p.id = :id AND p.organisationId = :orgId")
    Optional<PurchaseOrder> findByIdAndOrganisationId(@Param("id") UUID id, @Param("orgId") UUID orgId);

    @Query("SELECT p FROM PurchaseOrder p LEFT JOIN FETCH p.supplier LEFT JOIN FETCH p.lineItems WHERE p.organisationId = :orgId AND LOWER(p.poNumber) = LOWER(:poNumber)")
    Optional<PurchaseOrder> findByOrganisationIdAndPoNumberIgnoreCase(@Param("orgId") UUID orgId, @Param("poNumber") String poNumber);
}
