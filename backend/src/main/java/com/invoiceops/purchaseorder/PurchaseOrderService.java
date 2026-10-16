package com.invoiceops.purchaseorder;

import com.invoiceops.config.ResourceNotFoundException;
import com.invoiceops.supplier.Supplier;
import com.invoiceops.supplier.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;

    public PurchaseOrderService(PurchaseOrderRepository purchaseOrderRepository, SupplierRepository supplierRepository) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.supplierRepository = supplierRepository;
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrderDto> listPurchaseOrders(UUID orgId) {
        return purchaseOrderRepository.findByOrganisationId(orgId)
                .stream()
                .map(PurchaseOrderDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public PurchaseOrderDto getPurchaseOrder(UUID id, UUID orgId) {
        PurchaseOrder po = purchaseOrderRepository.findByIdAndOrganisationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", id));
        return PurchaseOrderDto.fromEntity(po);
    }

    @Transactional(readOnly = true)
    public Optional<PurchaseOrder> findByPoNumber(String poNumber, UUID orgId) {
        if (poNumber == null || poNumber.isBlank()) {
            return Optional.empty();
        }
        return purchaseOrderRepository.findByOrganisationIdAndPoNumberIgnoreCase(orgId, poNumber.trim());
    }

    @Transactional
    public PurchaseOrderDto createPurchaseOrder(CreatePurchaseOrderRequest request, UUID orgId) {
        purchaseOrderRepository.findByOrganisationIdAndPoNumberIgnoreCase(orgId, request.poNumber().trim())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Purchase order with number '" + request.poNumber() + "' already exists");
                });

        Supplier supplier = null;
        if (request.supplierId() != null) {
            supplier = supplierRepository.findByIdAndOrganisationId(request.supplierId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Supplier", "id", request.supplierId()));
        }

        PurchaseOrder po = new PurchaseOrder(
                orgId,
                supplier,
                request.poNumber().trim(),
                request.description(),
                request.totalAmount(),
                request.currency() != null ? request.currency().trim().toUpperCase() : "GBP",
                PurchaseOrderStatus.OPEN,
                request.issuedDate()
        );

        BigDecimal calculatedTotal = BigDecimal.ZERO;
        if (request.lineItems() != null && !request.lineItems().isEmpty()) {
            for (CreatePurchaseOrderItemRequest itemReq : request.lineItems()) {
                BigDecimal qty = itemReq.quantity() != null ? itemReq.quantity() : BigDecimal.ONE;
                BigDecimal unitPrice = itemReq.unitPrice() != null ? itemReq.unitPrice() : BigDecimal.ZERO;
                BigDecimal lineTotal = qty.multiply(unitPrice);
                calculatedTotal = calculatedTotal.add(lineTotal);

                PurchaseOrderItem item = new PurchaseOrderItem(
                        itemReq.description().trim(),
                        qty,
                        unitPrice,
                        lineTotal
                );
                po.addLineItem(item);
            }
        }

        if (po.getTotalAmount() == null && !calculatedTotal.equals(BigDecimal.ZERO)) {
            po.setTotalAmount(calculatedTotal);
        }

        PurchaseOrder saved = purchaseOrderRepository.save(po);
        return PurchaseOrderDto.fromEntity(saved);
    }
}
