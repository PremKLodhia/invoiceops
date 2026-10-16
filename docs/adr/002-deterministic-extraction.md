# ADR-002: Deterministic Extraction with Optional AI

## Status
Accepted

## Context
InvoiceOps needs to extract structured data from uploaded PDF and image invoices. Options considered:
1. Require a cloud AI/ML API (OpenAI, Google Document AI, AWS Textract)
2. Use only local Ollama LLM
3. Use deterministic extraction first, with optional AI enhancement

## Decision
Use a **pluggable extraction pipeline**:

1. **PDFBox** (always available): Extract embedded text from digital PDFs.
2. **Tesseract OCR** (optional enhancement): Extract text from scanned PDFs and images.
3. **Deterministic parser** (always available): Regex and pattern-based field extraction from raw text.
4. **Ollama LLM** (optional enhancement): AI-assisted structured extraction from text.

The pipeline degrades gracefully:
- Without Tesseract: scanned documents show "OCR unavailable" but digital PDFs work.
- Without Ollama: deterministic parsing handles extraction; less accurate but functional.
- All core features work with only PDFBox + deterministic parser.

## Consequences
- **Zero cost**: no paid APIs required.
- **Works offline**: everything runs locally.
- **Resilient**: system works even if optional tools aren't installed.
- **Transparent**: each extracted field records its source method and confidence.
- **Trade-off**: deterministic extraction is less accurate than ML for diverse layouts.

## Alternatives Rejected
- **Cloud AI APIs**: violate zero-cost and privacy requirements.
- **Ollama-only**: would make the system non-functional without a running model.
