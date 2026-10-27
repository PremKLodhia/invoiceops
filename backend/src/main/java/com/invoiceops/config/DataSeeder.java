package com.invoiceops.config;

import com.invoiceops.audit.AuditService;
import com.invoiceops.extraction.ConfidenceLevel;
import com.invoiceops.extraction.ExtractionMethod;
import com.invoiceops.extraction.FieldSource;
import com.invoiceops.identity.*;
import com.invoiceops.invoice.*;
import com.invoiceops.purchaseorder.*;
import com.invoiceops.supplier.Supplier;
import com.invoiceops.supplier.SupplierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final String ACME = "Acme Industrial Holdings";

    private final AppProperties appProperties;
    private final OrganisationRepository organisationRepository;
    private final UserRepository userRepository;
    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final InvoiceRepository invoiceRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(
            AppProperties appProperties,
            OrganisationRepository organisationRepository,
            UserRepository userRepository,
            SupplierRepository supplierRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            InvoiceRepository invoiceRepository,
            AuditService auditService,
            PasswordEncoder passwordEncoder) {
        this.appProperties = appProperties;
        this.organisationRepository = organisationRepository;
        this.userRepository = userRepository;
        this.supplierRepository = supplierRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.invoiceRepository = invoiceRepository;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (appProperties.isDemoMode()) {
            log.info("Demo mode is enabled. Seeding demo database...");
            seedDemoData();
        }
    }

    /**
     * Restores the demo suppliers, purchase orders and invoices. Organisations, users and the
     * audit trail are kept: audit events reference both, and audit history must never be erased.
     * The reset itself is recorded as a DEMO_RESET audit event.
     */
    @Transactional
    public void resetDemoData(UUID actorOrgId, UUID actorId, String actorEmail) {
        log.info("Resetting demo data...");
        long invoices = invoiceRepository.count();
        long purchaseOrders = purchaseOrderRepository.count();
        long suppliers = supplierRepository.count();
        invoiceRepository.deleteAll();
        purchaseOrderRepository.deleteAll();
        supplierRepository.deleteAll();
        // Hibernate orders inserts before deletes at flush; flush now so reseeding can reuse PO numbers.
        supplierRepository.flush();

        Organisation acme = organisationRepository.findByNameIgnoreCase(ACME)
                .orElseGet(() -> organisationRepository.save(new Organisation(ACME)));
        seedBusinessData(acme, demoUsers(acme));

        auditService.logEvent(actorOrgId, actorId, actorEmail, "DEMO_RESET", "ORGANISATION", actorOrgId,
                Map.of("deletedInvoices", invoices, "deletedPurchaseOrders", purchaseOrders, "deletedSuppliers", suppliers));
    }

    @Transactional
    public void seedDemoData() {
        if (organisationRepository.findByNameIgnoreCase(ACME).isPresent()) {
            log.info("Demo data already seeded.");
            return;
        }

        // 1. Organisations
        Organisation acme = organisationRepository.save(new Organisation(ACME));
        Organisation zenith = organisationRepository.save(new Organisation("Zenith Global Logistics"));

        // 2. Users for Acme
        DemoUsers users = demoUsers(acme);

        // Users for Zenith (cross-organisation isolation tests)
        demoUser(zenith, "zenith_user@zenith.local", "DemoZenith2026!", "Zach Zenith", UserRole.REVIEWER);

        auditService.logEvent(acme.getId(), users.admin().getId(), users.admin().getEmail(), "ORGANISATION_INITIALIZED", "ORGANISATION", acme.getId(), Map.of("seeded", true));
        seedBusinessData(acme, users);
        log.info("Demo data seeding completed successfully.");
    }

    private record DemoUsers(User admin, User reviewer, User approver) {
    }

    private DemoUsers demoUsers(Organisation acme) {
        return new DemoUsers(
                demoUser(acme, "admin@invoiceops.local", "DemoAdmin2026!", "Alice Administrator", UserRole.ADMIN),
                demoUser(acme, "reviewer@invoiceops.local", "DemoReviewer2026!", "Bob Reviewer", UserRole.REVIEWER),
                demoUser(acme, "approver@invoiceops.local", "DemoApprover2026!", "Carol Approver", UserRole.APPROVER));
    }

    /** Returns the existing demo user, or creates it if it is missing. */
    private User demoUser(Organisation org, String email, String password, String name, UserRole role) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> userRepository.save(new User(org, email, passwordEncoder.encode(password), name, role)));
    }

    private void seedBusinessData(Organisation acme, DemoUsers users) {
        User reviewer = users.reviewer();
        User approver = users.approver();

        // 3. Suppliers for Acme
        Supplier s1 = supplierRepository.save(new Supplier(
                acme.getId(),
                "Apex Cloud Technologies Ltd",
                "billing@apexcloud.co.uk",
                "100 Innovation Way, London, EC2A 4NE",
                "GB123456789",
                "Cloud infrastructure and SaaS provider"
        ));

        Supplier s2 = supplierRepository.save(new Supplier(
                acme.getId(),
                "Northwind Facilities Group",
                "accounts@northwind.co.uk",
                "45 Commercial Road, Manchester, M1 1AD",
                "GB987654321",
                "HVAC and facility maintenance"
        ));

        Supplier s3 = supplierRepository.save(new Supplier(
                acme.getId(),
                "Meridian Stationery Supplies",
                "orders@meridian.co.uk",
                "12 High Street, Birmingham, B2 4QA",
                "GB555666777",
                "Office supplies and consumables"
        ));

        // 4. Purchase Orders for Acme
        PurchaseOrder po1 = new PurchaseOrder(
                acme.getId(),
                s1,
                "PO-2026-001",
                "Annual Cloud Hosting Services",
                new BigDecimal("1200.00"),
                "GBP",
                PurchaseOrderStatus.OPEN,
                LocalDate.of(2026, 1, 10)
        );
        po1.addLineItem(new PurchaseOrderItem(
                "Cloud Compute & Database Instances",
                BigDecimal.ONE,
                new BigDecimal("1200.00"),
                new BigDecimal("1200.00")
        ));
        po1 = purchaseOrderRepository.save(po1);

        PurchaseOrder po2 = new PurchaseOrder(
                acme.getId(),
                s2,
                "PO-2026-002",
                "Quarterly HVAC Maintenance",
                new BigDecimal("500.00"),
                "GBP",
                PurchaseOrderStatus.OPEN,
                LocalDate.of(2026, 1, 15)
        );
        po2.addLineItem(new PurchaseOrderItem(
                "HVAC Inspection & Filter Replacement",
                BigDecimal.ONE,
                new BigDecimal("500.00"),
                new BigDecimal("500.00")
        ));
        po2 = purchaseOrderRepository.save(po2);

        PurchaseOrder po3 = new PurchaseOrder(
                acme.getId(),
                s3,
                "PO-2026-003",
                "Office Hardware & Stationery",
                new BigDecimal("600.00"),
                "GBP",
                PurchaseOrderStatus.OPEN,
                LocalDate.of(2026, 2, 1)
        );
        po3.addLineItem(new PurchaseOrderItem(
                "Ergonomic Accessories & Paper Stock",
                BigDecimal.ONE,
                new BigDecimal("600.00"),
                new BigDecimal("600.00")
        ));
        po3 = purchaseOrderRepository.save(po3);

        // 5. Invoices for Acme
        // Invoice 1: Clean matched invoice (APPROVED)
        Invoice inv1 = new Invoice(
                acme.getId(), "inv-apex-2026-001.pdf", "inv-apex-2026-001.pdf",
                "hash-inv-1-abc123", 245000L, "application/pdf", reviewer
        );
        inv1.setSupplier(s1);
        inv1.setPurchaseOrder(po1);
        inv1.setInvoiceNumber("INV-2026-001");
        inv1.setInvoiceDate(LocalDate.of(2026, 1, 15));
        inv1.setDueDate(LocalDate.of(2026, 2, 15));
        inv1.setCurrency("GBP");
        inv1.setNetAmount(new BigDecimal("1000.00"));
        inv1.setTaxAmount(new BigDecimal("200.00"));
        inv1.setTaxRate(new BigDecimal("20.00"));
        inv1.setGrossAmount(new BigDecimal("1200.00"));
        inv1.setSupplierNameExtracted(s1.getName());
        inv1.setPoReferenceExtracted(po1.getPoNumber());
        inv1.setStatus(InvoiceStatus.APPROVED);
        inv1.setExtractionMethod(ExtractionMethod.PDFBOX);
        inv1.setExtractionCompletedAt(Instant.now());
        inv1.setSubmittedBy(reviewer);
        inv1.setSubmittedAt(Instant.now().minusSeconds(86400));
        inv1.setReviewedBy(approver);
        inv1.setReviewedAt(Instant.now().minusSeconds(43200));
        inv1.addLineItem(new InvoiceLineItem("Cloud Hosting - January", BigDecimal.ONE, new BigDecimal("1000.00"), new BigDecimal("1000.00"), 0, FieldSource.EXTRACTED));
        inv1.addExtractionField(new ExtractionField("invoiceNumber", "INV-2026-001", ConfidenceLevel.HIGH, FieldSource.EXTRACTED));
        inv1.addExtractionField(new ExtractionField("grossAmount", "1200.00", ConfidenceLevel.HIGH, FieldSource.EXTRACTED));
        invoiceRepository.save(inv1);

        // Invoice 2: Missing fields (NEEDS_REVIEW)
        Invoice inv2 = new Invoice(
                acme.getId(), "scanned_receipt_feb.png", "scanned_receipt_feb.png",
                "hash-inv-2-def456", 185000L, "image/png", reviewer
        );
        inv2.setSupplierNameExtracted("Northwind Facilities Group");
        inv2.setSupplier(s2);
        inv2.setInvoiceDate(LocalDate.of(2026, 2, 10));
        inv2.setCurrency("GBP");
        inv2.setNetAmount(new BigDecimal("400.00"));
        inv2.setTaxAmount(new BigDecimal("80.00"));
        inv2.setGrossAmount(new BigDecimal("480.00"));
        inv2.setStatus(InvoiceStatus.NEEDS_REVIEW);
        inv2.setExtractionMethod(ExtractionMethod.TESSERACT_OCR);
        inv2.setExtractionCompletedAt(Instant.now());
        inv2.setHasValidationErrors(true);
        inv2.addValidationResult(new ValidationResult("MISSING_INVOICE_NUMBER", ValidationSeverity.ERROR, "Invoice number could not be extracted", "invoiceNumber"));
        invoiceRepository.save(inv2);

        // Invoice 3: Duplicate warning invoice (NEEDS_REVIEW)
        Invoice inv3 = new Invoice(
                acme.getId(), "inv-apex-duplicate.pdf", "inv-apex-duplicate.pdf",
                "hash-inv-3-ghi789", 246000L, "application/pdf", reviewer
        );
        inv3.setSupplier(s1);
        inv3.setInvoiceNumber("INV-2026-001");
        inv3.setInvoiceDate(LocalDate.of(2026, 2, 15));
        inv3.setDueDate(LocalDate.of(2026, 3, 15));
        inv3.setCurrency("GBP");
        inv3.setNetAmount(new BigDecimal("1000.00"));
        inv3.setTaxAmount(new BigDecimal("200.00"));
        inv3.setGrossAmount(new BigDecimal("1200.00"));
        inv3.setStatus(InvoiceStatus.NEEDS_REVIEW);
        inv3.setExtractionMethod(ExtractionMethod.PDFBOX);
        inv3.setExtractionCompletedAt(Instant.now());
        inv3.setHasDuplicateWarning(true);
        inv3.addValidationResult(new ValidationResult("DUPLICATE_INVOICE_NUMBER", ValidationSeverity.WARNING, "Suspected duplicate: An invoice with number 'INV-2026-001' already exists for supplier 'Apex Cloud Technologies Ltd'", "invoiceNumber"));
        invoiceRepository.save(inv3);

        // Invoice 4: PO mismatch invoice (NEEDS_REVIEW)
        Invoice inv4 = new Invoice(
                acme.getId(), "inv-meridian-pomismatch.pdf", "inv-meridian-pomismatch.pdf",
                "hash-inv-4-jkl012", 310000L, "application/pdf", reviewer
        );
        inv4.setSupplier(s3);
        inv4.setPurchaseOrder(po3);
        inv4.setInvoiceNumber("INV-2026-004");
        inv4.setPoReferenceExtracted(po3.getPoNumber());
        inv4.setInvoiceDate(LocalDate.of(2026, 2, 18));
        inv4.setCurrency("GBP");
        inv4.setNetAmount(new BigDecimal("750.00"));
        inv4.setTaxAmount(new BigDecimal("150.00"));
        inv4.setGrossAmount(new BigDecimal("900.00"));
        inv4.setStatus(InvoiceStatus.NEEDS_REVIEW);
        inv4.setExtractionMethod(ExtractionMethod.PDFBOX);
        inv4.setExtractionCompletedAt(Instant.now());
        inv4.setHasPoMismatch(true);
        inv4.addValidationResult(new ValidationResult("PO_AMOUNT_VARIANCE", ValidationSeverity.WARNING, "Invoice gross amount (900.00) differs from purchase order amount (600.00)", "grossAmount"));
        invoiceRepository.save(inv4);

        // Invoice 5: Math discrepancy invoice (NEEDS_REVIEW)
        Invoice inv5 = new Invoice(
                acme.getId(), "inv-math-error.pdf", "inv-math-error.pdf",
                "hash-inv-5-mno345", 215000L, "application/pdf", reviewer
        );
        inv5.setSupplier(s2);
        inv5.setInvoiceNumber("INV-2026-005");
        inv5.setInvoiceDate(LocalDate.of(2026, 2, 20));
        inv5.setCurrency("GBP");
        inv5.setNetAmount(new BigDecimal("500.00"));
        inv5.setTaxAmount(new BigDecimal("100.00"));
        inv5.setGrossAmount(new BigDecimal("650.00"));
        inv5.setStatus(InvoiceStatus.NEEDS_REVIEW);
        inv5.setExtractionMethod(ExtractionMethod.PDFBOX);
        inv5.setExtractionCompletedAt(Instant.now());
        inv5.setHasValidationErrors(true);
        inv5.addValidationResult(new ValidationResult("MATH_CHECK", ValidationSeverity.ERROR, "Net (500.00) + Tax (100.00) != Gross (650.00)", "grossAmount"));
        invoiceRepository.save(inv5);

        // Invoice 6: Rejected invoice (REJECTED)
        Invoice inv6 = new Invoice(
                acme.getId(), "inv-rejected.pdf", "inv-rejected.pdf",
                "hash-inv-6-pqr678", 195000L, "application/pdf", reviewer
        );
        inv6.setSupplier(s3);
        inv6.setInvoiceNumber("INV-2026-006");
        inv6.setInvoiceDate(LocalDate.of(2026, 2, 22));
        inv6.setCurrency("GBP");
        inv6.setNetAmount(new BigDecimal("250.00"));
        inv6.setTaxAmount(new BigDecimal("50.00"));
        inv6.setGrossAmount(new BigDecimal("300.00"));
        inv6.setStatus(InvoiceStatus.REJECTED);
        inv6.setExtractionMethod(ExtractionMethod.PDFBOX);
        inv6.setExtractionCompletedAt(Instant.now());
        inv6.setSubmittedBy(reviewer);
        inv6.setSubmittedAt(Instant.now().minusSeconds(172800));
        inv6.setReviewedBy(approver);
        inv6.setReviewedAt(Instant.now().minusSeconds(86400));
        inv6.setRejectionReason("Unauthorized service charge added to invoice without prior PO amendment");
        invoiceRepository.save(inv6);

        // 6. Audit Trail for initial actions
        auditService.logEvent(acme.getId(), reviewer.getId(), reviewer.getEmail(), "INVOICE_UPLOADED", "INVOICE", inv1.getId(), Map.of("invoiceNumber", "INV-2026-001"));
        auditService.logEvent(acme.getId(), approver.getId(), approver.getEmail(), "INVOICE_APPROVED", "INVOICE", inv1.getId(), Map.of("invoiceNumber", "INV-2026-001"));
        auditService.logEvent(acme.getId(), approver.getId(), approver.getEmail(), "INVOICE_REJECTED", "INVOICE", inv6.getId(), Map.of("invoiceNumber", "INV-2026-006", "reason", inv6.getRejectionReason()));

    }
}
