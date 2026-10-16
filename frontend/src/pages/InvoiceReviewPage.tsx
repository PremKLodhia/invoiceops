import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Check,
  AlertTriangle,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  History,
  FileCheck2,
  XCircle,
  Copy,
  DollarSign,
  Maximize2,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Button, StatusBadge, Input } from '../components/ui';
import type {
  InvoiceDetail,
  InvoiceLineItem,
  ConfidenceLevel,
  Supplier,
} from '../types';
import styles from './InvoiceReviewPage.module.css';



export const InvoiceReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workbench' | 'audit'>('workbench');

  // Form Fields State
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [netAmount, setNetAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [grossAmount, setGrossAmount] = useState<number>(0);
  const [poReference, setPoReference] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

  // Document Zoom & Viewer controls
  const [zoomScale, setZoomScale] = useState<number>(100);

  // Dirty & Save feedback
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [actionError, setActionError] = useState<string | null>(null);

  // Rejection Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingWorkflow, setIsSubmittingWorkflow] = useState(false);

  const populateForm = useCallback((inv: InvoiceDetail) => {
    setSupplierName(inv.supplierName || '');
    setInvoiceNumber(inv.invoiceNumber || '');
    setIssueDate(inv.issueDate || inv.invoiceDate || '');
    setDueDate(inv.dueDate || '');
    setCurrency(inv.currency || 'USD');
    setNetAmount(inv.netAmount || 0);
    setTaxAmount(inv.taxAmount || 0);
    setTaxRate(inv.taxRate || 0);
    setGrossAmount(inv.grossAmount || 0);
    setPoReference(inv.poNumber || inv.poReferenceExtracted || '');
    setLineItems(inv.lineItems || []);
    setIsDirty(false);
    setSaveStatus('idle');
  }, []);

  // Load Invoice and Suppliers
  const loadInvoiceData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);
    setActionError(null);

    try {
      const invData = await api.get<InvoiceDetail>(`/invoices/${id}`);
      setInvoice(invData);
      populateForm(invData);
    } catch (err: unknown) {
      setInvoice(null);
      if (err instanceof ApiError) {
        setLoadError(err.message || 'Failed to load invoice');
      } else {
        setLoadError('Failed to load invoice. Please verify that the server is running and the invoice exists.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, populateForm]);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await api.get<Supplier[] | { data: Supplier[] }>('/suppliers');
      const list = Array.isArray(res) ? res : res.data || [];
      setSuppliers(list);
    } catch {
      setSuppliers([]);
    }
  }, []);

  useEffect(() => {
    loadInvoiceData();
    loadSuppliers();
  }, [loadInvoiceData, loadSuppliers]);

  const markDirty = () => {
    setIsDirty(true);
    setSaveStatus('idle');
  };

  // Arithmetic discrepancy check: Net + Tax != Gross
  const arithmeticDiscrepancy = useMemo(() => {
    const computedTotal = Number((netAmount + taxAmount).toFixed(2));
    const gross = Number(grossAmount.toFixed(2));
    const diff = Number(Math.abs(computedTotal - gross).toFixed(2));

    if (diff > 0.01) {
      return {
        expected: computedTotal,
        actual: gross,
        variance: diff,
      };
    }
    return null;
  }, [netAmount, taxAmount, grossAmount]);

  // Handle Save Changes
  const handleSaveChanges = async () => {
    if (!id || !invoice) return;
    setSaveStatus('saving');
    setActionError(null);

    const payload = {
      supplierName,
      invoiceNumber,
      invoiceDate: issueDate,
      dueDate,
      currency,
      netAmount,
      taxAmount,
      taxRate,
      grossAmount,
      poReference,
      lineItems,
    };

    try {
      const updated = await api.put<InvoiceDetail>(`/invoices/${id}/fields`, payload);
      setSaveStatus('saved');
      setIsDirty(false);
      if (updated && updated.id) {
        setInvoice(updated);
      } else {
        setInvoice((prev) => (prev ? { ...prev, ...payload } : null));
      }
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      setSaveStatus('idle');
      // On failure, preserve dirty state, do not set saved, show actionable error
      if (err instanceof ApiError) {
        setActionError(`Failed to save invoice changes: ${err.message}`);
      } else {
        setActionError('Failed to save invoice changes. Please verify connection and retry.');
      }
    }
  };

  // Workflow transitions
  const handleWorkflowAction = async (action: 'submit' | 'approve' | 'reject' | 'reopen') => {
    if (!id || !invoice) return;
    setIsSubmittingWorkflow(true);
    setActionError(null);

    try {
      let updatedInv: InvoiceDetail | null = null;
      if (action === 'submit') {
        updatedInv = await api.post<InvoiceDetail>(`/invoices/${id}/submit`);
      } else if (action === 'approve') {
        updatedInv = await api.post<InvoiceDetail>(`/invoices/${id}/approve`);
      } else if (action === 'reject') {
        updatedInv = await api.post<InvoiceDetail>(`/invoices/${id}/reject`, { reason: rejectionReason });
        setIsRejectModalOpen(false);
      } else if (action === 'reopen') {
        updatedInv = await api.post<InvoiceDetail>(`/invoices/${id}/reopen`);
      }

      if (updatedInv && updatedInv.id) {
        setInvoice(updatedInv);
      } else {
        await loadInvoiceData();
      }
    } catch (err: unknown) {
      // PRESERVE previous state, DO NOT simulate status transition
      if (err instanceof ApiError) {
        setActionError(`Workflow operation failed: ${err.message}`);
      } else {
        setActionError('Workflow operation failed. The server did not accept the transition.');
      }
    } finally {
      setIsSubmittingWorkflow(false);
    }
  };

  // Line item manipulation
  const handleAddLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `li_${Date.now()}`,
      description: 'New line item',
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
      source: 'MANUAL',
    };
    setLineItems((prev) => [...prev, newItem]);
    markDirty();
  };

  const handleUpdateLineItem = (index: number, key: keyof InvoiceLineItem, val: string | number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (key === 'description') {
        item.description = String(val);
      } else if (key === 'quantity' || key === 'unitPrice') {
        const numVal = Number(val) || 0;
        if (key === 'quantity') item.quantity = numVal;
        if (key === 'unitPrice') item.unitPrice = numVal;
        item.lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
      }

      updated[index] = item as InvoiceLineItem;
      return updated;
    });
    markDirty();
  };

  const handleDeleteLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  };

  // Confidence pill badge helper
  const renderConfidenceBadge = (fieldName: string) => {
    const fieldObj = invoice?.fields?.[fieldName];
    const confidence: ConfidenceLevel = fieldObj?.confidence || 'UNVERIFIED';

    let badgeClass = styles.confUnverified;
    if (confidence === 'HIGH') badgeClass = styles.confHigh;
    else if (confidence === 'MEDIUM') badgeClass = styles.confMedium;
    else if (confidence === 'LOW') badgeClass = styles.confLow;
    else if (confidence === 'CORRECTED') badgeClass = styles.confCorrected;

    return (
      <span className={`${styles.confidenceBadge} ${badgeClass}`}>
        {confidence}
      </span>
    );
  };

  if (isLoading && !invoice) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        Loading invoice extraction workspace...
      </div>
    );
  }

  if (loadError || !invoice) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '540px', margin: '40px auto' }}>
        <div style={{
          background: 'var(--color-surface, #ffffff)',
          border: '1px solid var(--color-border, #e2e8f0)',
          borderRadius: '8px',
          padding: '32px 24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}>
          <AlertCircle size={36} color="var(--color-danger, #ef4444)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text, #0f172a)', marginBottom: '8px' }}>
            Unable to Load Invoice
          </h2>
          <p style={{ color: 'var(--color-text-secondary, #64748b)', fontSize: '0.875rem', marginBottom: '24px' }}>
            {loadError || 'The requested invoice could not be found or the server returned an error.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button variant="secondary" onClick={() => navigate('/invoices')}>
              Return to Queue
            </Button>
            <Button variant="primary" onClick={loadInvoiceData}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const userRole = (user?.role || 'REVIEWER').toUpperCase();
  const isReviewerOrAdmin = userRole === 'REVIEWER' || userRole === 'ADMIN';
  const isApproverOrAdmin = userRole === 'APPROVER' || userRole === 'ADMIN';

  const status = (invoice?.status || '').toUpperCase();

  return (
    <div className={styles.container}>
      {/* Workspace Header Toolbar */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate('/invoices')}
            title="Return to Invoice Queue"
          >
            <ArrowLeft size={14} />
            <span>Queue</span>
          </button>

          <div className={styles.invoiceTitleBlock}>
            <div className={styles.invoiceNumRow}>
              <h1 className={styles.invoiceHeading}>{invoice?.invoiceNumber || 'Invoice Review'}</h1>
              <StatusBadge status={invoice?.status || 'NEEDS_REVIEW'} />
            </div>
            <span className={styles.originalFileMeta}>
              File: {invoice?.originalFilename || 'Document'} &bull; Uploaded{' '}
              {invoice?.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'Recent'}
            </span>
          </div>
        </div>

        <div className={styles.topBarRight}>
          {/* Save Status indicator */}
          <div className={styles.saveIndicator}>
            {saveStatus === 'saving' && (
              <span className={styles.saveIndicatorSaving}>
                <Clock size={12} /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className={styles.saveIndicatorSaved}>
                <Check size={12} /> All changes saved
              </span>
            )}
            {isDirty && saveStatus === 'idle' && (
              <span className={styles.saveIndicatorDirty}>
                <AlertCircle size={12} /> Unsaved changes
              </span>
            )}
          </div>

          {/* Workflow Action Buttons */}
          {(status === 'NEEDS_REVIEW' || status === 'UPLOADED' || status === 'DRAFT') && (
            <>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Save size={13} />}
                onClick={handleSaveChanges}
                disabled={!isDirty || saveStatus === 'saving'}
              >
                Save Changes
              </Button>

              {isReviewerOrAdmin && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<FileCheck2 size={13} />}
                  onClick={() => handleWorkflowAction('submit')}
                  isLoading={isSubmittingWorkflow}
                >
                  Submit for Approval
                </Button>
              )}
            </>
          )}

          {status === 'PENDING_APPROVAL' && isApproverOrAdmin && (
            <>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<XCircle size={13} />}
                onClick={() => setIsRejectModalOpen(true)}
              >
                Reject Invoice
              </Button>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Check size={13} />}
                onClick={() => handleWorkflowAction('approve')}
                isLoading={isSubmittingWorkflow}
              >
                Approve Invoice
              </Button>
            </>
          )}

          {status === 'REJECTED' && isReviewerOrAdmin && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw size={13} />}
              onClick={() => handleWorkflowAction('reopen')}
              isLoading={isSubmittingWorkflow}
            >
              Re-open for Review
            </Button>
          )}
        </div>
      </header>

      {/* Discrepancy & Alert Banners */}
      <div className={styles.alertArea}>
        {actionError && (
          <div className={`${styles.alertBox} ${styles.alertError}`} role="alert">
            <AlertCircle size={16} className={styles.alertIcon} />
            <div className={styles.alertContent}>
              <span className={styles.alertTitle}>Action Failed</span>
              <span className={styles.alertText}>{actionError}</span>
            </div>
          </div>
        )}

        {/* Rejection Reason Notice */}
        {status === 'REJECTED' && (
          <div className={`${styles.alertBox} ${styles.alertError}`}>
            <XCircle size={16} className={styles.alertIcon} />
            <div className={styles.alertContent}>
              <span className={styles.alertTitle}>Invoice Rejected</span>
              <span className={styles.alertText}>
                <strong>Reason:</strong> {invoice?.rejectionReason || 'No specific rejection reason provided.'}
              </span>
            </div>
          </div>
        )}

        {/* Arithmetic Error Banner */}
        {arithmeticDiscrepancy && (
          <div className={`${styles.alertBox} ${styles.alertError}`} role="alert">
            <AlertCircle size={16} className={styles.alertIcon} />
            <div className={styles.alertContent}>
              <span className={styles.alertTitle}>Arithmetic Validation Error: Calculation Mismatch</span>
              <span className={styles.alertText}>
                Net Subtotal ({currency} {netAmount.toFixed(2)}) + Tax ({currency} {taxAmount.toFixed(2)}) equals{' '}
                <strong>{currency} {arithmeticDiscrepancy.expected.toFixed(2)}</strong>, but Gross Invoice Total is entered as{' '}
                <strong>{currency} {arithmeticDiscrepancy.actual.toFixed(2)}</strong>. Exact variance:{' '}
                <strong>{currency} {arithmeticDiscrepancy.variance.toFixed(2)}</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Suspected Duplicate Banner */}
        {invoice?.hasDuplicateWarning && invoice.duplicateDetails && (
          <div className={`${styles.alertBox} ${styles.alertWarning}`} role="alert">
            <Copy size={16} className={styles.alertIcon} />
            <div className={styles.alertContent}>
              <span className={styles.alertTitle}>Suspected Duplicate Invoice Detected</span>
              <span className={styles.alertText}>
                Matches existing invoice <strong>{invoice.duplicateDetails.matchedInvoiceNumber || invoice.duplicateDetails.invoiceNumber}</strong> from{' '}
                <strong>{invoice.duplicateDetails.matchedSupplierName || invoice.duplicateDetails.supplierName}</strong> (Dated{' '}
                {invoice.duplicateDetails.matchedDate || invoice.duplicateDetails.date}, Amount {currency}{' '}
                {(invoice.duplicateDetails.matchedGrossAmount || invoice.duplicateDetails.grossAmount || 0).toFixed(2)}).
              </span>
            </div>
          </div>
        )}

        {/* Purchase Order Mismatch Banner */}
        {invoice?.hasPoMismatch && invoice.poMismatchDetails && (
          <div className={`${styles.alertBox} ${styles.alertWarning}`} role="alert">
            <DollarSign size={16} className={styles.alertIcon} />
            <div className={styles.alertContent}>
              <span className={styles.alertTitle}>Purchase Order Amount Discrepancy</span>
              <span className={styles.alertText}>
                Invoice Gross Total ({currency} {invoice.poMismatchDetails.invoiceAmount.toFixed(2)}) exceeds linked{' '}
                <strong>{invoice.poMismatchDetails.poNumber}</strong> commitment value ({currency}{' '}
                {invoice.poMismatchDetails.poAmount.toFixed(2)}) by{' '}
                <strong>{currency} {invoice.poMismatchDetails.variance.toFixed(2)}</strong>.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Split View Layout */}
      <div className={styles.splitLayout}>
        {/* Left Pane: Document Preview */}
        <section className={styles.documentPane} aria-label="Original Document Preview">
          <div className={styles.docToolbar}>
            <span style={{ fontWeight: 600 }}>Original Document</span>
            <div className={styles.docControls}>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => setZoomScale((prev) => Math.max(50, prev - 15))}
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span className={styles.zoomLevel}>{zoomScale}%</span>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => setZoomScale((prev) => Math.min(200, prev + 15))}
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => setZoomScale(100)}
                title="Reset Zoom"
              >
                <RotateCcw size={13} />
              </button>
              <a
                href={`/api/invoices/${id}/document`}
                target="_blank"
                rel="noreferrer"
                className={styles.toolBtn}
                title="Open in new window"
              >
                <Maximize2 size={13} />
              </a>
            </div>
          </div>

          <div className={styles.viewerContainer}>
            {invoice?.contentType === 'application/pdf' || !invoice?.contentType?.startsWith('image') ? (
              <iframe
                src={`/api/invoices/${id}/document#view=FitH`}
                className={styles.docFrame}
                title="Invoice Document Preview"
              />
            ) : (
              <img
                src={`/api/invoices/${id}/document`}
                alt="Invoice Document Preview"
                className={styles.docImage}
                style={{ transform: `scale(${zoomScale / 100})` }}
              />
            )}
          </div>
        </section>

        {/* Right Pane: Extracted Financial Information Workbench */}
        <section className={styles.workbenchPane} aria-label="Extracted Financial Workbench">
          <div className={styles.workbenchTabs}>
            <button
              type="button"
              className={`${styles.workbenchTabBtn} ${activeTab === 'workbench' ? styles.workbenchTabBtnActive : ''}`}
              onClick={() => setActiveTab('workbench')}
            >
              <span>Financial Fields & Items</span>
              <span className={styles.tabBadge}>{lineItems.length} items</span>
            </button>
            <button
              type="button"
              className={`${styles.workbenchTabBtn} ${activeTab === 'audit' ? styles.workbenchTabBtnActive : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <History size={13} />
              <span>Audit Trail</span>
              <span className={styles.tabBadge}>{invoice?.auditEvents?.length || 0}</span>
            </button>
          </div>

          {activeTab === 'workbench' ? (
            <div className={styles.sectionContent}>
              {/* Form Grid */}
              <div className={styles.formGrid}>
                {/* Supplier Field */}
                <div className={`${styles.fieldWrapper} ${styles.fullSpan}`}>
                  <div className={styles.fieldLabelRow}>
                    <label htmlFor="supplierName" className={styles.fieldLabel}>Supplier Name</label>
                    {renderConfidenceBadge('supplierName')}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Input
                      id="supplierName"
                      value={supplierName}
                      onChange={(e) => {
                        setSupplierName(e.target.value);
                        markDirty();
                      }}
                      placeholder="Enter supplier name"
                    />
                    {suppliers.length > 0 && (
                      <select
                        aria-label="Select existing supplier"
                        className={styles.selectInput}
                        style={{ width: '180px' }}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSupplierName(e.target.value);
                            markDirty();
                          }
                        }}
                        value=""
                      >
                        <option value="">Link Supplier...</option>
                        {suppliers.map((sup) => (
                          <option key={sup.id} value={sup.name}>
                            {sup.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Invoice Number */}
                <div className={styles.fieldWrapper}>
                  <div className={styles.fieldLabelRow}>
                    <label htmlFor="invoiceNumber" className={styles.fieldLabel}>Invoice Number</label>
                    {renderConfidenceBadge('invoiceNumber')}
                  </div>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => {
                      setInvoiceNumber(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. INV-2026-001"
                  />
                </div>

                {/* PO Reference */}
                <div className={styles.fieldWrapper}>
                  <div className={styles.fieldLabelRow}>
                    <label htmlFor="poReference" className={styles.fieldLabel}>Purchase Order (PO)</label>
                    {renderConfidenceBadge('poReference')}
                  </div>
                  <Input
                    id="poReference"
                    value={poReference}
                    onChange={(e) => {
                      setPoReference(e.target.value);
                      markDirty();
                    }}
                    placeholder="e.g. PO-70231"
                  />
                </div>

                {/* Invoice Date */}
                <div className={styles.fieldWrapper}>
                  <div className={styles.fieldLabelRow}>
                    <label htmlFor="issueDate" className={styles.fieldLabel}>Invoice Date</label>
                    {renderConfidenceBadge('issueDate')}
                  </div>
                  <Input
                    id="issueDate"
                    type="date"
                    value={issueDate}
                    onChange={(e) => {
                      setIssueDate(e.target.value);
                      markDirty();
                    }}
                  />
                </div>

                {/* Due Date */}
                <div className={styles.fieldWrapper}>
                  <div className={styles.fieldLabelRow}>
                    <label htmlFor="dueDate" className={styles.fieldLabel}>Payment Due Date</label>
                    {renderConfidenceBadge('dueDate')}
                  </div>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      markDirty();
                    }}
                  />
                </div>

                {/* Currency */}
                <div className={styles.fieldWrapper}>
                  <div className={styles.fieldLabelRow}>
                    <label htmlFor="currency" className={styles.fieldLabel}>Currency</label>
                    {renderConfidenceBadge('currency')}
                  </div>
                  <select
                    id="currency"
                    className={styles.selectInput}
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      markDirty();
                    }}
                  >
                    <option value="GBP">GBP - British Pound (£)</option>
                    <option value="USD">USD - US Dollar ($)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                  </select>
                </div>

                {/* Tax Rate % */}
                <div className={styles.fieldWrapper}>
                  <div className={styles.fieldLabelRow}>
                    <label htmlFor="taxRate" className={styles.fieldLabel}>Tax Rate (%)</label>
                    <span className={`${styles.confidenceBadge} ${styles.confMedium}`}>CALC</span>
                  </div>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => {
                      const r = Number(e.target.value) || 0;
                      setTaxRate(r);
                      const computedTax = Number(((netAmount * r) / 100).toFixed(2));
                      setTaxAmount(computedTax);
                      markDirty();
                    }}
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className={styles.lineItemsSection}>
                <div className={styles.lineItemsHeader}>
                  <span className={styles.sectionHeading}>Extracted Line Items ({lineItems.length})</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Plus size={12} />}
                    onClick={handleAddLineItem}
                  >
                    Add Row
                  </Button>
                </div>

                <table className={styles.lineItemsTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Description</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Qty</th>
                      <th style={{ width: '18%', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ width: '18%', textAlign: 'right' }}>Line Total</th>
                      <th style={{ width: '4%' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={item.id || index}>
                        <td>
                          <input
                            type="text"
                            aria-label={`Line item ${index + 1} description`}
                            className={styles.tableInput}
                            value={item.description}
                            onChange={(e) => handleUpdateLineItem(index, 'description', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            aria-label={`Line item ${index + 1} quantity`}
                            className={`${styles.tableInput} ${styles.tableInputMono}`}
                            value={item.quantity}
                            onChange={(e) => handleUpdateLineItem(index, 'quantity', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            aria-label={`Line item ${index + 1} unit price`}
                            step="0.01"
                            className={`${styles.tableInput} ${styles.tableInputMono}`}
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateLineItem(index, 'unitPrice', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                          {currency} {item.lineTotal.toFixed(2)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.deleteRowBtn}
                            onClick={() => handleDeleteLineItem(index)}
                            title="Delete line"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {lineItems.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '16px' }}>
                          No line items recorded. Click &quot;Add Row&quot; to insert items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary Box */}
              <div className={styles.totalsBox}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Net Subtotal:</span>
                  <div style={{ width: '110px' }}>
                    <input
                      type="number"
                      aria-label="Net Subtotal"
                      step="0.01"
                      className={`${styles.tableInput} ${styles.tableInputMono}`}
                      value={netAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setNetAmount(val);
                        markDirty();
                      }}
                    />
                  </div>
                </div>

                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Tax Amount:</span>
                  <div style={{ width: '110px' }}>
                    <input
                      type="number"
                      aria-label="Tax Amount"
                      step="0.01"
                      className={`${styles.tableInput} ${styles.tableInputMono}`}
                      value={taxAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setTaxAmount(val);
                        markDirty();
                      }}
                    />
                  </div>
                </div>

                <div className={`${styles.totalRow} ${styles.totalRowGross}`}>
                  <span>Gross Invoice Total:</span>
                  <div style={{ width: '110px' }}>
                    <input
                      type="number"
                      aria-label="Gross Invoice Total"
                      step="0.01"
                      className={`${styles.tableInput} ${styles.tableInputMono}`}
                      style={{ fontWeight: 700 }}
                      value={grossAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setGrossAmount(val);
                        markDirty();
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Audit Trail Tab */
            <div className={styles.sectionContent}>
              <span className={styles.sectionHeading}>Invoice Audit History</span>
              <div className={styles.auditTimeline}>
                {(invoice?.auditEvents || []).map((event) => (
                  <div key={event.id} className={styles.auditItem}>
                    <div className={styles.auditDot} />
                    <div className={styles.auditBody}>
                      <div className={styles.auditActionRow}>
                        <span className={styles.auditAction}>{event.action.replace(/_/g, ' ')}</span>
                        <span className={styles.auditTime}>{new Date(event.createdAt).toLocaleString()}</span>
                      </div>
                      <span className={styles.auditActor}>Actor: {event.actorEmail}</span>
                      {event.metadata && (
                        <div className={styles.auditMeta}>
                          {JSON.stringify(event.metadata)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Rejection Modal Dialog */}
      {isRejectModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsRejectModalOpen(false)}>
          <div className={styles.rejectModal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-status-error)' }}>
              <AlertTriangle size={18} />
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: 0 }}>
                Reject Invoice {invoice?.invoiceNumber}
              </h3>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
              Please specify the precise discrepancy or compliance reason for rejecting this invoice. The operator will be notified to review or dispute with the vendor.
            </p>

            <textarea
              className={styles.textarea}
              placeholder="e.g. Unit price on line 1 does not match PO contractual price; delivery receipt missing."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isSubmittingWorkflow}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!rejectionReason.trim() || isSubmittingWorkflow}
                isLoading={isSubmittingWorkflow}
                onClick={() => handleWorkflowAction('reject')}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceReviewPage;
