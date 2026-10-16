import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = r"C:\Users\shivs\.gemini\antigravity\scratch\invoiceops\sample-data"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_pdf(filename, supplier_name, inv_num, inv_date, due_date, po_num, items, net, tax, gross, currency="GBP"):
    doc = SimpleDocTemplate(os.path.join(OUTPUT_DIR, filename), pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=20, leading=24, textColor=colors.HexColor('#0F172A'))
    normal_style = ParagraphStyle('NormalStyle', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor('#334155'))
    bold_style = ParagraphStyle('BoldStyle', parent=styles['Normal'], fontSize=10, leading=14, fontName='Helvetica-Bold', textColor=colors.HexColor('#0F172A'))
    
    elements = []
    
    # Header
    elements.append(Paragraph(f"<b>INVOICE</b>", title_style))
    elements.append(Spacer(1, 12))
    
    # Supplier and Invoice Info
    curr_sym = "£" if currency == "GBP" else "$" if currency == "USD" else "€"
    
    info_data = [
        [Paragraph(f"<b>Supplier:</b><br/>{supplier_name}<br/>100 Enterprise Way<br/>London, EC2A 4NE<br/>VAT: GB123456789", normal_style),
         Paragraph(f"<b>Invoice Details:</b><br/>Invoice Number: {inv_num}<br/>Date: {inv_date}<br/>Due Date: {due_date}<br/>PO Reference: {po_num}", normal_style)]
    ]
    info_table = Table(info_data, colWidths=[3.5*inch, 3.5*inch])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 16))
    
    # Line items
    table_data = [["Description", "Qty", "Unit Price", "Total"]]
    for item in items:
        table_data.append([
            item[0],
            str(item[1]),
            f"{curr_sym}{item[2]:.2f}",
            f"{curr_sym}{item[3]:.2f}"
        ])
    
    table_data.append(["", "", "Net Subtotal:", f"{curr_sym}{net:.2f}"])
    table_data.append(["", "", "Tax (VAT 20%):", f"{curr_sym}{tax:.2f}"])
    table_data.append(["", "", "Gross Total:", f"{curr_sym}{gross:.2f}"])
    
    t = Table(table_data, colWidths=[4.0*inch, 0.8*inch, 1.2*inch, 1.2*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#CBD5E1')),
        ('LINEBELOW', (0,len(items)), (-1,len(items)), 1, colors.HexColor('#E2E8F0')),
        ('FONTNAME', (2,-3), (-1,-1), 'Helvetica-Bold'),
        ('LINEABOVE', (2,-1), (-1,-1), 1.5, colors.HexColor('#0F172A')),
    ]))
    elements.append(t)
    
    elements.append(Spacer(1, 24))
    elements.append(Paragraph("<b>Payment Terms:</b> Bank Transfer to sort code 20-00-00, account 12345678. Thank you for your business.", normal_style))
    
    doc.build(elements)
    print(f"Created {filename}")

# 1. Clean standard invoice
create_pdf(
    "01_standard_clean.pdf",
    supplier_name="Apex Cloud Technologies Ltd",
    inv_num="INV-2026-0841",
    inv_date="2026-09-15",
    due_date="2026-10-15",
    po_num="PO-2026-001",
    items=[
        ("Managed Cloud Infrastructure - September 2026", 1, 800.00, 800.00),
        ("Dedicated Backup Storage (2TB)", 2, 100.00, 200.00)
    ],
    net=1000.00,
    tax=200.00,
    gross=1200.00,
    currency="GBP"
)

# 2. Missing fields invoice (no PO reference, missing due date)
create_pdf(
    "03_missing_fields.pdf",
    supplier_name="Northwind Facilities Group",
    inv_num="NF-9921",
    inv_date="2026-09-20",
    due_date="N/A",
    po_num="UNSPECIFIED",
    items=[
        ("Office Maintenance and HVAC Servicing", 1, 450.00, 450.00),
    ],
    net=450.00,
    tax=90.00,
    gross=540.00,
    currency="GBP"
)

# 3. Duplicate invoice (same inv number & supplier as 01)
create_pdf(
    "04_duplicate_invoice.pdf",
    supplier_name="Apex Cloud Technologies Ltd",
    inv_num="INV-2026-0841",
    inv_date="2026-09-15",
    due_date="2026-10-15",
    po_num="PO-2026-001",
    items=[
        ("Managed Cloud Infrastructure - September 2026", 1, 800.00, 800.00),
        ("Dedicated Backup Storage (2TB)", 2, 100.00, 200.00)
    ],
    net=1000.00,
    tax=200.00,
    gross=1200.00,
    currency="GBP"
)

# 4. PO Mismatch (PO is for 500, invoice is for 1200)
create_pdf(
    "05_po_mismatch.pdf",
    supplier_name="Apex Cloud Technologies Ltd",
    inv_num="INV-2026-0899",
    inv_date="2026-09-25",
    due_date="2026-10-25",
    po_num="PO-2026-002",
    items=[
        ("Emergency Security Audit Consultation", 5, 200.00, 1000.00),
        ("Incident Triage Add-on", 1, 500.00, 500.00)
    ],
    net=1500.00,
    tax=300.00,
    gross=1800.00,
    currency="GBP"
)

# 5. Math discrepancy (subtotal 500 + tax 100 = gross written as 750)
create_pdf(
    "06_math_discrepancy.pdf",
    supplier_name="Meridian Stationery Supplies",
    inv_num="MSS-4410",
    inv_date="2026-09-28",
    due_date="2026-10-28",
    po_num="PO-2026-003",
    items=[
        ("Recycled Paper Reams A4 (Box of 5)", 10, 30.00, 300.00),
        ("Ergonomic Keyboard & Mouse Combos", 4, 50.00, 200.00)
    ],
    net=500.00,
    tax=100.00,
    gross=750.00,  # Deliberate arithmetic discrepancy (should be 600.00)
    currency="GBP"
)

# 6. Scanned receipt / invoice as PNG
img = Image.new('RGB', (800, 1000), color=(250, 250, 248))
d = ImageDraw.Draw(img)
# Draw text simulating receipt
d.text((50, 60), "METRO LOGISTICS SERVICES", fill=(30, 30, 30))
d.text((50, 90), "Tax Invoice: MLS-7732", fill=(40, 40, 40))
d.text((50, 120), "Date: 2026-09-18   Due: 2026-10-18", fill=(50, 50, 50))
d.text((50, 150), "PO Reference: PO-2026-004", fill=(50, 50, 50))
d.line([(50, 180), (750, 180)], fill=(180, 180, 180), width=2)
d.text((50, 210), "Courier Delivery - London to Manchester       Qty: 1   Amount: £350.00", fill=(30, 30, 30))
d.text((50, 240), "Fuel Surcharge                              Qty: 1   Amount: £50.00", fill=(30, 30, 30))
d.line([(50, 280), (750, 280)], fill=(180, 180, 180), width=1)
d.text((500, 310), "Net Amount:   £400.00", fill=(30, 30, 30))
d.text((500, 340), "VAT (20%):     £80.00", fill=(30, 30, 30))
d.text((500, 370), "Total Gross:  £480.00", fill=(10, 10, 10))
img.save(os.path.join(OUTPUT_DIR, "02_scanned_receipt.png"))
print("Created 02_scanned_receipt.png")

# 7. Corrupt file
with open(os.path.join(OUTPUT_DIR, "07_corrupt_file.pdf"), "wb") as f:
    f.write(b"%PDF-1.4\n%This file is intentionally corrupted for testing error handling\nCORRUPT_BYTES_XYZ_0000_FAIL")
print("Created 07_corrupt_file.pdf")
