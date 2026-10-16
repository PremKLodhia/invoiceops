# ADR-006: Safe CSV Export with Formula Injection Mitigation

## Status
Accepted

## Context
When financial records are exported to CSV files, values extracted from uploaded invoices (such as invoice numbers, descriptions, or supplier names) may be opened in spreadsheet software like Microsoft Excel, LibreOffice Calc, or Google Sheets.

If an invoice number or supplier name starts with formula-triggering characters (`=`, `+`, `-`, `@`, `\t`, `\r`), the spreadsheet software could execute unintended formulas or command injection (CSV Injection / Formula Injection, CWE-1236).

## Decision
Implement **mandatory formula character sanitization** in the CSV export pipeline:
- Before writing any string field to CSV, inspect the first character.
- If the first character matches any of `=+-@\t\r`, prepend an ASCII single quote (`'`).
- In standard spreadsheet software, the single quote forces the cell to be treated strictly as literal text, preventing formula evaluation.
- Standard RFC 4180 CSV escaping (quoting fields with commas, quotes, or newlines, and escaping inner quotes as `""`) is applied simultaneously.

## Consequences
- Protects users from malicious invoice payloads attempting remote command execution or data exfiltration.
- Preserves readability of negative numbers or codes when opened in spreadsheet viewers.
- Automated tests (`CsvFormulaInjectionTest`) verify that formula injection vectors are neutralized.
