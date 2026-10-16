import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const DOWNLOADS_DIR = 'C:/Users/shivs/Downloads';
const PDF_OUTPUT_PATH = path.join(DOWNLOADS_DIR, 'InvoiceOps_Engineering_Carousel.pdf');
const SLIDES_OUTPUT_DIR = path.join(DOWNLOADS_DIR, 'InvoiceOps_Carousel_Slides');

if (!fs.existsSync(SLIDES_OUTPUT_DIR)) {
  fs.mkdirSync(SLIDES_OUTPUT_DIR, { recursive: true });
}

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>InvoiceOps — Engineering Presentation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    @page {
      size: 1080px 1350px;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #CBD5E1;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .slide {
      width: 1080px;
      height: 1350px;
      padding: 80px 84px;
      background-color: #F8FAFC;
      color: #0F172A;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }

    /* Common Components */
    .mono-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 600;
      color: #2563EB;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      padding: 6px 14px;
      border-radius: 4px;
      display: inline-block;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 24px;
    }

    .mono-tag.dark {
      color: #334155;
      background: #F1F5F9;
      border-color: #CBD5E1;
    }

    .slide-header {
      margin-bottom: 36px;
    }

    .slide-title {
      font-size: 52px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin-bottom: 12px;
    }

    .slide-subtitle {
      font-size: 22px;
      font-weight: 400;
      color: #475569;
      line-height: 1.5;
    }

    .card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 32px 36px;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 24px;
      border-top: 1px solid #E2E8F0;
      font-size: 14px;
      color: #64748B;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.03em;
    }

    /* Slide 1 Specifics */
    .hero-title {
      font-size: 84px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.04em;
      line-height: 1.0;
      margin-bottom: 18px;
    }

    .hero-subtitle {
      font-size: 26px;
      font-weight: 400;
      color: #475569;
      line-height: 1.45;
      max-width: 900px;
      margin-bottom: 40px;
    }

    .mockup-frame {
      flex: 1;
      max-height: 570px;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
      margin-bottom: 40px;
    }

    .mockup-header {
      background: #F1F5F9;
      padding: 14px 20px;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .mockup-dots {
      display: flex;
      gap: 6px;
    }

    .mockup-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #CBD5E1;
    }

    .mockup-url {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #64748B;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      padding: 4px 14px;
      border-radius: 4px;
      width: 320px;
    }

    .mockup-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F8FAFC;
      border: 2px dashed #CBD5E1;
      margin: 20px;
      border-radius: 6px;
      text-align: center;
      padding: 40px;
    }

    .mockup-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      font-weight: 600;
      color: #0F172A;
      margin-bottom: 8px;
    }

    .mockup-sublabel {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #64748B;
      max-width: 500px;
      line-height: 1.5;
    }

    .pills-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: auto;
    }

    .tech-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 500;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      color: #0F172A;
      padding: 8px 16px;
      border-radius: 6px;
    }

    /* Slide 2 Specifics */
    .comparison-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-bottom: 32px;
    }

    .comparison-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 28px 32px;
    }

    .comparison-card.bottleneck {
      border-left: 4px solid #DC2626;
    }

    .comparison-card.solution {
      border-left: 4px solid #2563EB;
    }

    .comparison-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 12px;
      display: inline-block;
    }

    .comparison-tag.red {
      color: #DC2626;
    }

    .comparison-tag.blue {
      color: #2563EB;
    }

    .card-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .card-list-item {
      display: flex;
      gap: 12px;
      font-size: 16px;
      line-height: 1.5;
      color: #334155;
    }

    .card-list-item strong {
      color: #0F172A;
      font-weight: 600;
    }

    .bullet-marker {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      color: #64748B;
      flex-shrink: 0;
      line-height: 1.5;
    }

    .principle-callout {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-left: 4px solid #16A34A;
      border-radius: 8px;
      padding: 24px 30px;
    }

    .principle-text {
      font-size: 18px;
      font-weight: 600;
      color: #0F172A;
      line-height: 1.5;
      margin-bottom: 8px;
    }

    .principle-author {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #64748B;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* Slide 3 Specifics */
    .flow-container {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 24px;
    }

    .flow-step {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 20px 24px;
      display: flex;
      align-items: flex-start;
      gap: 20px;
    }

    .step-number {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      font-weight: 700;
      color: #2563EB;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      padding: 6px 12px;
      border-radius: 6px;
      flex-shrink: 0;
    }

    .step-content {
      flex: 1;
    }

    .step-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .step-title {
      font-size: 18px;
      font-weight: 700;
      color: #0F172A;
    }

    .step-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .step-desc {
      font-size: 15px;
      color: #475569;
      line-height: 1.45;
    }

    .flow-arrow {
      text-align: center;
      color: #94A3B8;
      font-size: 14px;
      font-family: 'JetBrains Mono', monospace;
      line-height: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }

    /* Slide 4 Specifics */
    .guardrails-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-gap: 24px;
      margin-bottom: 30px;
    }

    .guardrail-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 30px 28px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .guardrail-code-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: #2563EB;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      padding: 4px 10px;
      border-radius: 4px;
      align-self: flex-start;
      margin-bottom: 16px;
    }

    .guardrail-title {
      font-size: 20px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 12px;
      line-height: 1.3;
    }

    .guardrail-desc {
      font-size: 15px;
      color: #475569;
      line-height: 1.55;
    }

    /* Slide 5 Specifics */
    .state-machine-box {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 28px 30px;
      margin-bottom: 28px;
    }

    .state-machine-header {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }

    .state-flow {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .state-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      padding: 8px 14px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      color: #1E293B;
    }

    .state-pill.active {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #1D4ED8;
    }

    .state-pill.success {
      background: #F0FDF4;
      border-color: #BBF7D0;
      color: #15803D;
    }

    .state-pill.danger {
      background: #FEF2F2;
      border-color: #FECACA;
      color: #B91C1C;
    }

    .state-arrow {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      color: #94A3B8;
      font-weight: 600;
    }

    .quality-gates-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 28px 30px;
      margin-bottom: 28px;
    }

    .quality-gate-item {
      display: flex;
      gap: 16px;
      margin-bottom: 18px;
    }

    .quality-gate-item:last-child {
      margin-bottom: 0;
    }

    .gate-bullet {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      color: #16A34A;
      background: #DCFCE7;
      border: 1px solid #BBF7D0;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .gate-title {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 4px;
    }

    .gate-desc {
      font-size: 14px;
      color: #475569;
      line-height: 1.5;
    }

    .github-callout {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 24px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .github-text {
      font-size: 15px;
      color: #334155;
      line-height: 1.45;
    }

    .github-link {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      padding: 8px 16px;
      border-radius: 6px;
      white-space: nowrap;
    }
  </style>
</head>
<body>

  <!-- SLIDE 1: Title & Core Architecture -->
  <div class="slide" id="slide-1">
    <div style="flex: 1; display: flex; flex-direction: column;">
      <div>
        <span class="mono-tag">[OPEN SOURCE / PORTFOLIO PROJECT]</span>
        <h1 class="hero-title">InvoiceOps</h1>
        <p class="hero-subtitle">A local-first, AI-assisted invoice operations platform for small finance teams.</p>
      </div>

      <!-- Centered Bordered Wireframe Container -->
      <div class="mockup-frame">
        <div class="mockup-header">
          <div class="mockup-dots">
            <div class="mockup-dot"></div>
            <div class="mockup-dot"></div>
            <div class="mockup-dot"></div>
          </div>
          <div class="mockup-url">invoiceops.local/workbench/inv_01</div>
        </div>
        <div class="mockup-body">
          <div>
            <div class="mockup-label">[Insert Split-Screen Workbench UI Screenshot Here]</div>
            <p class="mockup-sublabel">Side-by-side document preview on the left, verified deterministic field extractions and 2-way PO matching on the right.</p>
          </div>
        </div>
      </div>

      <!-- Bottom Tech Stack Pills -->
      <div class="pills-container">
        <span class="tech-pill">Java 21 LTS</span>
        <span class="tech-pill">Spring Boot 3.4</span>
        <span class="tech-pill">React 18 + TypeScript</span>
        <span class="tech-pill">PostgreSQL 16</span>
        <span class="tech-pill">Apache PDFBox</span>
        <span class="tech-pill">Tess4J OCR</span>
        <span class="tech-pill">Playwright</span>
      </div>
    </div>

    <div class="footer">
      <span>InvoiceOps — Java 21 / Spring Boot 3 / React + TS</span>
      <span>1/5</span>
    </div>
  </div>

  <!-- SLIDE 2: The Operational Problem vs. Engineering Solution -->
  <div class="slide" id="slide-2">
    <div>
      <span class="mono-tag dark">[PROBLEM ANALYSIS & SYSTEM RATIONALE]</span>
      <div class="slide-header">
        <h2 class="slide-title">Why I Built This</h2>
        <p class="slide-subtitle">Eliminating silent financial errors and untracked approvals in accounts payable.</p>
      </div>

      <div class="comparison-grid">
        <!-- Bottleneck Card -->
        <div class="comparison-card bottleneck">
          <span class="comparison-tag red">[The Bottleneck]</span>
          <div class="card-list">
            <div class="card-list-item">
              <span class="bullet-marker">&bull;</span>
              <div><strong>Manual PDF Data Entry:</strong> Invoices arrive in varying PDF formats, forcing employees to manually key invoice numbers, dates, and amounts into payment batches.</div>
            </div>
            <div class="card-list-item">
              <span class="bullet-marker">&bull;</span>
              <div><strong>Silent Duplicate Filings:</strong> Duplicate vendor submissions go unnoticed across payment cycles, risking duplicate supplier disbursements.</div>
            </div>
            <div class="card-list-item">
              <span class="bullet-marker">&bull;</span>
              <div><strong>Unnoticed PO Overruns:</strong> Invoices with line items exceeding authorized Purchase Order commitments pass through without budget variance detection.</div>
            </div>
            <div class="card-list-item">
              <span class="bullet-marker">&bull;</span>
              <div><strong>Informal Email Approvals:</strong> Financial decisions happen over unstructured chats and emails without a tamper-evident audit history.</div>
            </div>
          </div>
        </div>

        <!-- Solution Card -->
        <div class="comparison-card solution">
          <span class="comparison-tag blue">[The Solution]</span>
          <div class="card-list">
            <div class="card-list-item">
              <span class="bullet-marker">&bull;</span>
              <div><strong>Deterministic Extraction Pipeline:</strong> Zero-cost local text stream extraction with OCR fallback and confidence scoring.</div>
            </div>
            <div class="card-list-item">
              <span class="bullet-marker">&bull;</span>
              <div><strong>Automated Math & PO Validation:</strong> Real-time cross-checking of Net + Tax == Gross and 2-way Purchase Order item matching.</div>
            </div>
            <div class="card-list-item">
              <span class="bullet-marker">&bull;</span>
              <div><strong>Strict State Machine:</strong> Guarded server-side transitions requiring explicit human verification before payment sign-off.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Core Principle Callout -->
      <div class="principle-callout">
        <div class="principle-text">"Automation assists people; it does not silently make financial decisions. Human reviewers retain final authority."</div>
        <div class="principle-author">— Core System Design Principle</div>
      </div>
    </div>

    <div class="footer">
      <span>InvoiceOps — Java 21 / Spring Boot 3 / React + TS</span>
      <span>2/5</span>
    </div>
  </div>

  <!-- SLIDE 3: Multi-Tiered Extraction Pipeline -->
  <div class="slide" id="slide-3">
    <div>
      <span class="mono-tag">[INGESTION ARCHITECTURE]</span>
      <div class="slide-header">
        <h2 class="slide-title">Resilient Document Extraction</h2>
        <p class="slide-subtitle">Designed to run 100% locally with zero paid APIs and graceful fallback.</p>
      </div>

      <div class="flow-container">
        <!-- Step 1 -->
        <div class="flow-step">
          <div class="step-number">01</div>
          <div class="step-content">
            <div class="step-header-row">
              <span class="step-title">Upload & Pre-Flight Validation</span>
              <span class="step-badge">MIME + SHA-256</span>
            </div>
            <div class="step-desc">Validates file magic bytes (PDF, PNG, JPG), enforces 10MB payload ceiling, and calculates SHA-256 hash to intercept exact duplicates.</div>
          </div>
        </div>

        <div class="flow-arrow">&darr;</div>

        <!-- Step 2 -->
        <div class="flow-step">
          <div class="step-number">02</div>
          <div class="step-content">
            <div class="step-header-row">
              <span class="step-title">Tier 1: Apache PDFBox (Native Stream)</span>
              <span class="step-badge">Sub-50ms Throughput</span>
            </div>
            <div class="step-desc">Direct text stream extraction for modern digital PDFs. Completely deterministic, free, and executes in memory without external services.</div>
          </div>
        </div>

        <div class="flow-arrow">&darr; <span style="font-size: 11px; color: #64748B;">Fallback if no text stream found</span></div>

        <!-- Step 3 -->
        <div class="flow-step">
          <div class="step-number">03</div>
          <div class="step-content">
            <div class="step-header-row">
              <span class="step-title">Tier 2: Tess4J / Tesseract OCR</span>
              <span class="step-badge">Local OCR Engine</span>
            </div>
            <div class="step-desc">Rasterizes unreadable PDFs and scanned receipts to high-DPI bitmaps. Locally extracts textual tokens with zero third-party cloud calls.</div>
          </div>
        </div>

        <div class="flow-arrow">&darr;</div>

        <!-- Step 4 -->
        <div class="flow-step">
          <div class="step-number">04</div>
          <div class="step-content">
            <div class="step-header-row">
              <span class="step-title">Deterministic Regex & Pattern Parser</span>
              <span class="step-badge">Confidence Tagged</span>
            </div>
            <div class="step-desc">Extracts structured supplier, invoice number, dates, VAT rates, and line totals. Assigns HIGH, MEDIUM, or LOW confidence metadata.</div>
          </div>
        </div>

        <div class="flow-arrow">&darr; <span style="font-size: 11px; color: #64748B;">Optional enhancement</span></div>

        <!-- Step 5 -->
        <div class="flow-step">
          <div class="step-number">05</div>
          <div class="step-content">
            <div class="step-header-row">
              <span class="step-title">Optional Local Ollama LLM</span>
              <span class="step-badge">llama3.2:3b</span>
            </div>
            <div class="step-desc">Locally running LLM assists with complex unstructured table formats. The platform remains 100% operational if Ollama is absent.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>InvoiceOps — Java 21 / Spring Boot 3 / React + TS</span>
      <span>3/5</span>
    </div>
  </div>

  <!-- SLIDE 4: Financial Validation & Security Boundaries -->
  <div class="slide" id="slide-4">
    <div>
      <span class="mono-tag">[INTEGRITY & DEFENSE-IN-DEPTH]</span>
      <div class="slide-header">
        <h2 class="slide-title">Production-Grade Guardrails</h2>
        <p class="slide-subtitle">Multi-layered validation engines ensuring arithmetic correctness and tenant isolation.</p>
      </div>

      <div class="guardrails-grid">
        <!-- Card 1 -->
        <div class="guardrail-card">
          <span class="guardrail-code-tag">[MATH CONSISTENCY]</span>
          <h3 class="guardrail-title">Arithmetic Integrity Verification</h3>
          <p class="guardrail-desc">Enforces strict balance equation: <code>Net Subtotal + Tax Amount == Gross Total</code>. Incorporates a <code>&plusmn;0.05</code> rounding tolerance to handle fractional VAT penny rounding without false rejection.</p>
        </div>

        <!-- Card 2 -->
        <div class="guardrail-card">
          <span class="guardrail-code-tag">[2-WAY PO MATCHING]</span>
          <h3 class="guardrail-title">Procurement Limit Verification</h3>
          <p class="guardrail-desc">Automatically cross-references invoice items and totals against authorized Purchase Order commitments and linked supplier identities. Prevents payment of unauthorized overages.</p>
        </div>

        <!-- Card 3 -->
        <div class="guardrail-card">
          <span class="guardrail-code-tag">[TENANT ISOLATION]</span>
          <h3 class="guardrail-title">Strict Multi-Tenant Scoping</h3>
          <p class="guardrail-desc">All JPA repository queries filter by <code>organisation_id</code> extracted from verified server-side security sessions. Prevents cross-tenant invoice, supplier, and document access with 403 Forbidden boundaries.</p>
        </div>

        <!-- Card 4 -->
        <div class="guardrail-card">
          <span class="guardrail-code-tag">[CWE-1236 DEFENSE]</span>
          <h3 class="guardrail-title">CSV Formula Injection Shield</h3>
          <p class="guardrail-desc">Server-side export actively sanitizes spreadsheet formula triggers (<code>=</code>, <code>+</code>, <code>-</code>, <code>@</code>, <code>\\t</code>, <code>\\r</code>) with single-quote escaping and quote encapsulation, neutralizing spreadsheet execution exploits.</p>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>InvoiceOps — Java 21 / Spring Boot 3 / React + TS</span>
      <span>4/5</span>
    </div>
  </div>

  <!-- SLIDE 5: Auditable State Machine & Repo Details -->
  <div class="slide" id="slide-5">
    <div>
      <span class="mono-tag">[LIFECYCLE & VERIFICATION]</span>
      <div class="slide-header">
        <h2 class="slide-title">Auditable Lifecycle & Testing</h2>
        <p class="slide-subtitle">Controlled state transitions with immutable operational audit logging.</p>
      </div>

      <!-- State Machine Box -->
      <div class="state-machine-box">
        <div class="state-machine-header">Guarded Finite State Machine Workflow</div>
        <div class="state-flow">
          <span class="state-pill">UPLOADED</span>
          <span class="state-arrow">&rarr;</span>
          <span class="state-pill">PROCESSING</span>
          <span class="state-arrow">&rarr;</span>
          <span class="state-pill active">NEEDS_REVIEW</span>
          <span class="state-arrow">&rarr;</span>
          <span class="state-pill active">PENDING_APPROVAL</span>
          <span class="state-arrow">&rarr;</span>
          <span class="state-pill success">APPROVED</span>
          <span style="font-size: 13px; color: #94A3B8; margin: 0 4px;">/</span>
          <span class="state-pill danger">REJECTED</span>
        </div>
      </div>

      <!-- Quality Gates Card -->
      <div class="quality-gates-card">
        <div class="quality-gate-item">
          <div class="gate-bullet">&check;</div>
          <div>
            <div class="gate-title">Append-Only Application Audit Trail</div>
            <div class="gate-desc">Tracks every invoice ingestion, field correction, status transition, and administrative action with actor identity, timestamp, and before/after metadata snapshots.</div>
          </div>
        </div>

        <div class="quality-gate-item">
          <div class="gate-bullet">&check;</div>
          <div>
            <div class="gate-title">Automated 4-Stage Quality Gate in CI/CD</div>
            <div class="gate-desc">GitHub Actions suite runs 39 Spring Boot JUnit 5 tests (RBAC, math validation, tenant isolation), TypeScript strict checks, Vite production build, and 9 Playwright Chromium browser E2E tests.</div>
          </div>
        </div>

        <div class="quality-gate-item">
          <div class="gate-bullet">&check;</div>
          <div>
            <div class="gate-title">Strict Zero-Cost Engineering (&pound;0 / $0 Budget)</div>
            <div class="gate-desc">Runs entirely on local hardware via embedded H2 or Docker Compose PostgreSQL. Zero paid cloud APIs, zero recurring subscriptions, and zero vendor lock-in.</div>
          </div>
        </div>
      </div>

      <!-- GitHub Callout Card -->
      <div class="github-callout">
        <div class="github-text">
          <strong>Full Source Code & Architecture Decision Records (ADRs)</strong><br>
          Includes reproducible Docker setup, seed scripts, and test suite on GitHub.
        </div>
        <div class="github-link">github.com/PremKLodhia/invoiceops</div>
      </div>
    </div>

    <div class="footer">
      <span>InvoiceOps — Java 21 / Spring Boot 3 / React + TS</span>
      <span>5/5</span>
    </div>
  </div>

</body>
</html>
`;

async function generatePresentation() {
  console.log('--- Launching Chromium to generate 5-page PDF presentation ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 2
  });

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  // 1. Export 5-page PDF with exact 1080x1350px page size
  console.log('Generating PDF:', PDF_OUTPUT_PATH);
  await page.pdf({
    path: PDF_OUTPUT_PATH,
    width: '1080px',
    height: '1350px',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    preferCSSPageSize: true
  });
  console.log('PDF successfully created at:', PDF_OUTPUT_PATH);

  // 2. Also export individual high-res PNG slides for LinkedIn Carousel
  const slideLocators = await page.locator('.slide').all();
  console.log(`Generating ${slideLocators.length} slide PNGs in:`, SLIDES_OUTPUT_DIR);
  for (let i = 0; i < slideLocators.length; i++) {
    const slidePath = path.join(SLIDES_OUTPUT_DIR, `Slide_${i + 1}.png`);
    await slideLocators[i].screenshot({ path: slidePath });
    console.log(`  Slide ${i + 1} exported: ${slidePath}`);
  }

  await browser.close();
  console.log('--- All Presentation Artifacts Generated Successfully ---');
}

generatePresentation();
