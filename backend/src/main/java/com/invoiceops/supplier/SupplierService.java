package com.invoiceops.supplier;

import com.invoiceops.config.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @Transactional(readOnly = true)
    public List<SupplierDto> getSuppliers(UUID orgId, String search, Boolean activeOnly) {
        boolean filterActive = activeOnly != null && activeOnly;
        String searchTerm = (search != null && !search.isBlank()) ? search.trim() : null;
        return supplierRepository.searchSuppliers(orgId, searchTerm, filterActive)
                .stream()
                .map(SupplierDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public SupplierDto getSupplierById(UUID id, UUID orgId) {
        Supplier supplier = supplierRepository.findByIdAndOrganisationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", "id", id));
        return SupplierDto.fromEntity(supplier);
    }

    @Transactional
    public SupplierDto createSupplier(CreateSupplierRequest request, UUID orgId) {
        supplierRepository.findByOrganisationIdAndNameIgnoreCase(orgId, request.name().trim())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Supplier with name '" + request.name() + "' already exists");
                });

        Supplier supplier = new Supplier(
                orgId,
                request.name().trim(),
                request.contactEmail() != null ? request.contactEmail().trim() : null,
                request.address(),
                request.taxId() != null ? request.taxId().trim() : null,
                request.notes()
        );

        Supplier saved = supplierRepository.save(supplier);
        return SupplierDto.fromEntity(saved);
    }

    @Transactional
    public SupplierDto updateSupplier(UUID id, CreateSupplierRequest request, UUID orgId) {
        Supplier supplier = supplierRepository.findByIdAndOrganisationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", "id", id));

        supplierRepository.findByOrganisationIdAndNameIgnoreCase(orgId, request.name().trim())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Supplier with name '" + request.name() + "' already exists");
                });

        supplier.setName(request.name().trim());
        supplier.setContactEmail(request.contactEmail() != null ? request.contactEmail().trim() : null);
        supplier.setAddress(request.address());
        supplier.setTaxId(request.taxId() != null ? request.taxId().trim() : null);
        supplier.setNotes(request.notes());

        Supplier saved = supplierRepository.save(supplier);
        return SupplierDto.fromEntity(saved);
    }

    @Transactional
    public void deleteSupplier(UUID id, UUID orgId) {
        Supplier supplier = supplierRepository.findByIdAndOrganisationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", "id", id));
        supplier.setActive(false);
        supplierRepository.save(supplier);
    }
}
