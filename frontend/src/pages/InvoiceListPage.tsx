import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Upload,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { Button, Input, StatusBadge, DataTable, type Column } from '../components/ui';
import { InvoiceUploadModal } from '../components/invoice/InvoiceUploadModal';
import type { Invoice, InvoiceStatus, PaginatedResponse } from '../types';
import styles from './InvoiceListPage.module.css';

type FilterTab = 'all' | InvoiceStatus | string;

export const InvoiceListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<FilterTab>(searchParams.get('status') || 'all');
  const [sortKey, setSortKey] = useState<string>('issueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All Invoices' },
    { id: 'NEEDS_REVIEW', label: 'Needs Review' },
    { id: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'REJECTED', label: 'Disputed / Rejected' },
    { id: 'UPLOADED', label: 'Uploaded' },
  ];

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, string> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await api.get<Invoice[] | PaginatedResponse<Invoice>>('/invoices', { params });
      const list = Array.isArray(res) ? res : res.data || [];
      setInvoices(list);
    } catch (err: unknown) {
      setInvoices([]);
      if (err instanceof ApiError) {
        setLoadError(err.message || 'Failed to load invoices from server');
      } else {
        setLoadError('Failed to communicate with invoice service. Please verify that the backend is running.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleTabChange = (tabId: FilterTab) => {
    setStatusFilter(tabId);
    if (tabId === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', tabId);
    }
    setSearchParams(searchParams);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await api.download('/export/invoices/csv', 'invoices_export.csv');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setExportError(`Export failed: ${err.message}`);
      } else {
        setExportError('Export failed. Please verify that the server is reachable and retry.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (statusFilter !== 'all') {
          const invStatusUpper = (inv.status || '').toUpperCase();
          const filterUpper = statusFilter.toUpperCase();
          if (invStatusUpper !== filterUpper) {
            // Also match matched/paid for approved
            if (filterUpper === 'APPROVED' && (invStatusUpper === 'MATCHED' || invStatusUpper === 'PAID')) {
              // matched
            } else if (filterUpper === 'REJECTED' && (invStatusUpper === 'DISPUTED')) {
              // matched
            } else {
              return false;
            }
          }
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
          const matchSupplier = inv.supplierName.toLowerCase().includes(q);
          const matchPo = inv.poNumber?.toLowerCase().includes(q) ?? false;
          return matchNum || matchSupplier || matchPo;
        }

        return true;
      })
      .sort((a, b) => {
        const valA = (a as unknown as Record<string, unknown>)[sortKey];
        const valB = (b as unknown as Record<string, unknown>)[sortKey];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const comp = String(valA).localeCompare(String(valB));
        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [invoices, statusFilter, searchQuery, sortKey, sortDirection]);

  const subtotalsByCurrency = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const inv of filteredInvoices) {
      const curr = (inv.currency || 'USD').toUpperCase();
      if (!map[curr]) {
        map[curr] = { total: 0, count: 0 };
      }
      map[curr].total += inv.totalAmount || 0;
      map[curr].count += 1;
    }
    return map;
  }, [filteredInvoices]);

  const countsByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: invoices.length };
    invoices.forEach((inv) => {
      const s = (inv.status || '').toUpperCase();
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [invoices]);

  const columns: Column<Invoice & Record<string, unknown>>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      width: '160px',
      render: (inv) => (
        <div className={styles.invoiceCell}>
          <span className={styles.invoiceNum}>{inv.invoiceNumber}</span>
          {inv.poNumber && <span className={styles.poTag}>{inv.poNumber}</span>}
        </div>
      ),
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      sortable: true,
      render: (inv) => (
        <div className={styles.supplierCell}>
          <span className={styles.supplierName}>{inv.supplierName}</span>
          <span className={styles.supplierCode}>ID: {inv.supplierId || 'Auto'}</span>
        </div>
      ),
    },
    {
      key: 'issueDate',
      header: 'Dates (Issued / Due)',
      sortable: true,
      width: '170px',
      render: (inv) => (
        <div className={styles.dateCell}>
          <span className={styles.issueDate}>{inv.issueDate}</span>
          <span className={styles.dueDate}>Due: {inv.dueDate}</span>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      width: '140px',
      render: (inv) => (
        <span className={styles.amountCell}>
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: inv.currency || 'USD',
          }).format(inv.totalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      width: '150px',
      render: (inv) => <StatusBadge status={inv.status} />,
    },
    {
      key: 'actions',
      header: 'Review',
      align: 'right',
      width: '110px',
      render: (inv) => (
        <div className={styles.actionsCell}>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Eye size={13} />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/invoices/${inv.id}`);
            }}
            title="Open review workbench"
          >
            Review
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Invoice Processing Queue</h1>
          <p className={styles.subtitle}>
            Manage ingested invoices, 2-way PO matching exceptions, and payment approvals
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download size={13} />}
            isLoading={isExporting}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Upload size={13} />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Invoice
          </Button>
        </div>
      </div>

      {/* Alert Banners */}
      {loadError && (
        <div style={{
          background: 'var(--color-bg-danger-subtle, #fef2f2)',
          border: '1px solid var(--color-border-danger, #fca5a5)',
          color: 'var(--color-text-danger, #991b1b)',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{loadError}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchInvoices}>
            Retry
          </Button>
        </div>
      )}

      {exportError && (
        <div style={{
          background: 'var(--color-bg-danger-subtle, #fef2f2)',
          border: '1px solid var(--color-border-danger, #fca5a5)',
          color: 'var(--color-text-danger, #991b1b)',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} />
          <span>{exportError}</span>
        </div>
      )}

      {/* Control Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterRow}>
          <div className={styles.searchWrap}>
            <Input
              type="search"
              placeholder="Filter by invoice #, supplier, or PO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={14} />}
            />
          </div>

          <div className={styles.metricsSummary}>
            <div className={styles.metricItem}>
              <span>Displayed:</span>
              <span className={styles.metricValue}>{filteredInvoices.length} invoices</span>
            </div>
            {Object.keys(subtotalsByCurrency).length > 0 && <span>&bull;</span>}
            <div className={styles.metricItem}>
              <span>Subtotals:</span>
              {Object.keys(subtotalsByCurrency).length === 0 ? (
                <span className={styles.metricValue}>-</span>
              ) : (
                <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(subtotalsByCurrency).map(([curr, data]) => {
                    let formatted = `${data.total.toFixed(2)} ${curr}`;
                    try {
                      formatted = new Intl.NumberFormat('en-GB', {
                        style: 'currency',
                        currency: curr,
                      }).format(data.total);
                    } catch {
                      // Fallback
                    }
                    return (
                      <span
                        key={curr}
                        className={styles.metricValue}
                        style={{
                          background: 'var(--color-bg-secondary, #f1f5f9)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.8125rem'
                        }}
                      >
                        {formatted} <span style={{ color: 'var(--color-text-secondary, #64748b)', fontWeight: 400 }}>({data.count})</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className={styles.tabs} role="tablist">
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            const count = tab.id === 'all' ? invoices.length : countsByStatus[tab.id.toUpperCase()] || 0;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                <span>{tab.label}</span>
                <span className={styles.tabCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoices Data Table */}
      <DataTable
        columns={columns}
        data={filteredInvoices as (Invoice & Record<string, unknown>)[]}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
        isLoading={isLoading}
        onRowClick={(item) => navigate(`/invoices/${item.id}`)}
        emptyTitle={loadError ? "Unable to load invoices" : "No invoices found"}
        emptyDescription={
          loadError
            ? "Could not connect to the backend server. Please verify your connection and click Retry."
            : searchQuery || statusFilter !== 'all'
            ? "No invoices match your selected filter criteria. Try clearing search or status filters."
            : "No invoices have been ingested into this organisation yet. Click 'Upload Invoice' to begin processing."
        }
      />

      {/* Table Footer Summary */}
      <div className={styles.footerBar}>
        <span>
          Showing <strong>{filteredInvoices.length}</strong> of{' '}
          <strong>{invoices.length}</strong> total queue entries
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={13} style={{ color: 'var(--color-status-success)' }} />
          All local queue and database records synchronized
        </span>
      </div>

      {/* Upload Modal */}
      <InvoiceUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          fetchInvoices();
        }}
      />
    </div>
  );
};

export default InvoiceListPage;
