package com.invoiceops.supplier;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    List<Supplier> findByOrganisationIdAndActiveTrue(UUID organisationId);

    List<Supplier> findByOrganisationId(UUID organisationId);

    Optional<Supplier> findByIdAndOrganisationId(UUID id, UUID organisationId);

    Optional<Supplier> findByOrganisationIdAndNameIgnoreCase(UUID organisationId, String name);

    @Query("SELECT s FROM Supplier s WHERE s.organisationId = :orgId AND " +
            "(:search IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(s.contactEmail) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(s.taxId) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(:activeOnly IS FALSE OR s.active IS TRUE) " +
            "ORDER BY s.name ASC")
    List<Supplier> searchSuppliers(
            @Param("orgId") UUID orgId,
            @Param("search") String search,
            @Param("activeOnly") boolean activeOnly
    );
}
