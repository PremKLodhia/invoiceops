package com.invoiceops;

import com.invoiceops.config.DataSeeder;
import com.invoiceops.extraction.InvoiceValidationEngine;
import com.invoiceops.identity.Organisation;
import com.invoiceops.identity.OrganisationRepository;
import com.invoiceops.invoice.Invoice;
import com.invoiceops.invoice.InvoiceRepository;
import com.invoiceops.invoice.ValidationResult;
import com.invoiceops.purchaseorder.PurchaseOrder;
import com.invoiceops.purchaseorder.PurchaseOrderRepository;
import com.invoiceops.supplier.Supplier;
import com.invoiceops.supplier.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FinancialValidationTest {

    @Autowired
    private InvoiceValidationEngine validationEngine;

    @Autowired
    private DataSeeder dataSeeder;

    @Autowired
    private OrganisationRepository organisationRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    private Organisation acme;
    private Supplier supplier;
    private PurchaseOrder po;

    @BeforeEach
    void setUp() {
        dataSeeder.seedDemoData();
        acme = organisationRepository.findByNameIgnoreCase("Acme Industrial Holdings").orElseThrow();
        supplier = supplierRepository.findByOrganisationId(acme.getId()).get(0);
        po = purchaseOrderRepository.findByOrganisationId(acme.getId()).get(0);
    }

    @Test
    @DisplayName("Math inconsistency triggers validation error")
    void mathInconsistencyFails() {
        Invoice invoice = new Invoice();
        invoice.setOrganisationId(acme.getId());
        invoice.setSupplier(supplier);
        invoice.setInvoiceNumber("INV-MATH-TEST");
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setNetAmount(new BigDecimal("100.00"));
        invoice.setTaxAmount(new BigDecimal("20.00"));
        invoice.setGrossAmount(new BigDecimal("150.00")); // Math error: 100 + 20 != 150

        validationEngine.validate(invoice);

        assertTrue(invoice.isHasValidationErrors(), "Invoice should flag validation errors");
        boolean hasMathError = invoice.getValidationResults().stream()
                .anyMatch(v -> "MATH_CHECK".equals(v.getRuleName()));
        assertTrue(hasMathError, "Should include MATH_CHECK rule failure");
    }

    @Test
    @DisplayName("Valid mathematical amounts pass check")
    void validMathPasses() {
        Invoice invoice = new Invoice();
        invoice.setOrganisationId(acme.getId());
        invoice.setSupplier(supplier);
        invoice.setInvoiceNumber("INV-VALID-MATH");
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setNetAmount(new BigDecimal("100.00"));
        invoice.setTaxAmount(new BigDecimal("20.00"));
        invoice.setGrossAmount(new BigDecimal("120.00")); // Correct math: 100 + 20 == 120

        validationEngine.validate(invoice);

        assertFalse(invoice.isHasValidationErrors(), "Valid math should have no validation errors");
    }

    @Test
    @DisplayName("Duplicate invoice number for same supplier triggers duplicate warning")
    void duplicateInvoiceNumberFails() {
        // Save first invoice
        Invoice existing = new Invoice();
        existing.setOrganisationId(acme.getId());
        existing.setSupplier(supplier);
        existing.setInvoiceNumber("INV-DUP-TEST-123");
        existing.setInvoiceDate(LocalDate.now());
        existing.setNetAmount(new BigDecimal("200.00"));
        existing.setTaxAmount(new BigDecimal("40.00"));
        existing.setGrossAmount(new BigDecimal("240.00"));
        invoiceRepository.save(existing);

        // Second invoice with same number and supplier
        Invoice newInvoice = new Invoice();
        newInvoice.setOrganisationId(acme.getId());
        newInvoice.setSupplier(supplier);
        newInvoice.setInvoiceNumber("INV-DUP-TEST-123");
        newInvoice.setInvoiceDate(LocalDate.now());
        newInvoice.setNetAmount(new BigDecimal("200.00"));
        newInvoice.setTaxAmount(new BigDecimal("40.00"));
        newInvoice.setGrossAmount(new BigDecimal("240.00"));

        validationEngine.validate(newInvoice);

        assertTrue(newInvoice.isHasDuplicateWarning(), "Invoice should flag duplicate warning");
        boolean hasDupRule = newInvoice.getValidationResults().stream()
                .anyMatch(v -> "DUPLICATE_INVOICE_NUMBER".equals(v.getRuleName()));
        assertTrue(hasDupRule, "Should include DUPLICATE_INVOICE_NUMBER warning");
    }

    @Test
    @DisplayName("Purchase order amount discrepancy flags PO mismatch warning")
    void poAmountDiscrepancyFlagsMismatch() {
        Invoice invoice = new Invoice();
        invoice.setOrganisationId(acme.getId());
        invoice.setSupplier(po.getSupplier());
        invoice.setInvoiceNumber("INV-PO-TEST-456");
        invoice.setPoReferenceExtracted(po.getPoNumber());
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setNetAmount(new BigDecimal("3000.00"));
        invoice.setTaxAmount(new BigDecimal("600.00"));
        invoice.setGrossAmount(new BigDecimal("3600.00")); // PO total is £1200

        validationEngine.validate(invoice);

        assertTrue(invoice.isHasPoMismatch(), "Invoice should flag PO mismatch");
        boolean hasPoVariance = invoice.getValidationResults().stream()
                .anyMatch(v -> "PO_AMOUNT_VARIANCE".equals(v.getRuleName()));
        assertTrue(hasPoVariance, "Should include PO_AMOUNT_VARIANCE warning");
    }
}
