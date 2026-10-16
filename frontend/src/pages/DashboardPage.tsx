import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  ChevronRight,
  Coins,
  AlertCircle,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { Card, Button, StatusBadge } from '../components/ui';
import { InvoiceUploadModal } from '../components/invoice/InvoiceUploadModal';
import type { DashboardMetrics, Invoice } from '../types';
import styles from './DashboardPage.module.css';

const initialMetrics: DashboardMetrics = {
  needsReviewCount: 0,
  pendingApprovalCount: 0,
  approvedCount: 0,
  disputedCount: 0,
  totalCount: 0,
  currencyBreakdown: [],
  recentInvoices: [],
};

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      const [res, invoicesRes] = await Promise.all([
        api.get<Record<string, any>>('/dashboard'),
        api.get<any[]>('/invoices').catch(() => [])
      ]);
      const data = 'data' in res && res.data ? res.data : res;
      const recent = Array.isArray(invoicesRes) ? invoicesRes.slice(0, 5) : [];
      if (data) {
        setMetrics({
          needsReviewCount: data.needsReviewCount ?? data.needsReview ?? 0,
          pendingApprovalCount: data.pendingApprovalCount ?? data.pendingApproval ?? 0,
          approvedCount: data.approvedCount ?? data.approved ?? 0,
          disputedCount: data.disputedCount ?? data.rejected ?? 0,
          totalCount: data.totalCount ?? data.totalInvoices ?? 0,
          currencyBreakdown: data.currencyBreakdown || [],
          recentInvoices: recent,
        });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setLoadError(err.message || 'Failed to fetch dashboard metrics');
      } else {
        setLoadError('Failed to communicate with reporting service. Please check network connection.');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statCards = [
    {
      id: 'needs_review',
      title: 'Requiring Review',
      count: metrics.needsReviewCount,
      icon: Clock,
      meta: 'Awaiting operator verification',
      metaType: 'warning' as const,
      statusParam: 'NEEDS_REVIEW',
    },
    {
      id: 'pending_approval',
      title: 'Awaiting Approval',
      count: metrics.pendingApprovalCount,
      icon: FileText,
      meta: 'Assigned for approval sign-off',
      metaType: 'neutral' as const,
      statusParam: 'PENDING_APPROVAL',
    },
    {
      id: 'approved',
      title: 'Approved for Payment',
      count: metrics.approvedCount,
      icon: CheckCircle2,
      meta: 'Passed compliance & 2-way PO match',
      metaType: 'success' as const,
      statusParam: 'APPROVED',
    },
    {
      id: 'disputed',
      title: 'Discrepancies & Disputed',
      count: metrics.disputedCount,
      icon: AlertTriangle,
      meta: 'Price or duplicate exceptions',
      metaType: 'error' as const,
      statusParam: 'REJECTED',
    },
  ];

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Accounts Payable Workbench</h1>
          <p className={styles.subtitle}>
            Real-time pipeline monitoring, invoice extraction exceptions, and approval throughput
          </p>
        </div>

        <div className={styles.actionsArea}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />}
            onClick={fetchDashboardData}
            disabled={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Upload size={13} />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Ingest Invoices
          </Button>
        </div>
      </div>

      {/* Load Error Banner */}
      {loadError && (
        <div style={{
          background: 'var(--color-bg-danger-subtle, #fef2f2)',
          border: '1px solid var(--color-border-danger, #fca5a5)',
          color: 'var(--color-text-danger, #991b1b)',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '20px',
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
          <Button variant="secondary" size="sm" onClick={fetchDashboardData}>
            Retry
          </Button>
        </div>
      )}

      {/* High-level Operational Metric Cards */}
      <div className={styles.statGrid}>
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.id}
              className={styles.statCard}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/invoices?status=${stat.statusParam}`)}
              title={`View ${stat.title}`}
            >
              <div className={styles.statHeader}>
                <span>{stat.title}</span>
                <span className={styles.statIcon}>
                  <IconComponent size={16} />
                </span>
              </div>
              <div className={styles.statValue}>{stat.count}</div>
              <div className={styles.statMeta}>
                <span
                  className={`${styles.statMetaHighlight} ${
                    stat.metaType === 'success'
                      ? styles.metaSuccess
                      : stat.metaType === 'warning'
                      ? styles.metaWarning
                      : stat.metaType === 'error'
                      ? styles.metaError
                      : ''
                  }`}
                >
                  {stat.meta}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Currency Totals Breakdown */}
      {metrics.currencyBreakdown && metrics.currencyBreakdown.length > 0 && (
        <div className={styles.currencyBreakdown}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coins size={15} style={{ color: 'var(--color-text-secondary)' }} />
            <span className={styles.currencyTitle}>Active Currency Totals:</span>
          </div>
          {metrics.currencyBreakdown.map((curr) => (
            <div key={curr.currency} className={styles.currencyPill}>
              <span className={styles.currencyCode}>{curr.currency}</span>
              <span className={styles.currencyAmount}>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: curr.currency,
                }).format(curr.totalAmount)}
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-2xs)' }}>
                ({curr.count} inv)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid: Pipeline Activity & Operations Hub */}
      <div className={styles.mainGrid}>
        {/* Recent Operational Activity */}
        <Card
          title="Recent Pipeline Invoices"
          subtitle="Latest extracted and validated documents in the queue"
          padding="none"
          action={
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowUpRight size={13} />}
              onClick={() => navigate('/invoices')}
            >
              View Full Queue
            </Button>
          }
        >
          <div className={styles.activityList}>
            {(metrics.recentInvoices || []).length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--color-text-secondary, #64748b)', fontSize: '0.875rem' }}>
                No invoice activity recorded yet in this organisation. Ingest an invoice to view live pipeline throughput.
              </div>
            ) : (
              (metrics.recentInvoices || []).map((inv: Invoice) => (
              <div
                key={inv.id}
                className={styles.activityItem}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                title="Open invoice review workspace"
              >
                <div className={styles.activityMain}>
                  <div className={styles.activityIconWrap}>
                    <FileText size={15} />
                  </div>
                  <div className={styles.activityText}>
                    <span className={styles.activityTitle}>
                      {inv.invoiceNumber} &bull; {inv.supplierName}
                    </span>
                    <span className={styles.activitySubtitle}>
                      Dated {inv.issueDate || (inv as any).invoiceDate || 'N/A'} &bull; Received{' '}
                      {new Date(inv.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <StatusBadge status={inv.status} />
                  <span className={styles.activityAmount}>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: inv.currency || 'GBP',
                    }).format((inv as any).grossAmount ?? inv.totalAmount ?? 0)}
                  </span>
                </div>
              </div>
            )))}
          </div>
        </Card>

        {/* Operational Quick Actions & Processing Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card
            title="Operational Actions"
            subtitle="Batch processes and reconciliations"
            padding="dense"
          >
            <div className={styles.quickActionList}>
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => setIsUploadModalOpen(true)}
              >
                <div className={styles.quickActionContent}>
                  <Upload size={15} />
                  <span>Upload & Ingest Invoices</span>
                </div>
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/purchase-orders')}
              >
                <div className={styles.quickActionContent}>
                  <RefreshCw size={15} />
                  <span>Purchase Orders & 2-Way Matching</span>
                </div>
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/audit')}
              >
                <div className={styles.quickActionContent}>
                  <FileSpreadsheet size={15} />
                  <span>Review System Audit Trail</span>
                </div>
                <ChevronRight size={14} />
              </button>
            </div>
          </Card>

          <Card
            title="Processing Health"
            subtitle="Local parsing & matching services"
            padding="dense"
          >
            <div className={styles.systemStatusBlock}>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>PDF Parser</span>
                <span className={styles.statusValue} style={{ color: 'var(--color-status-success)' }}>
                  ONLINE (PDFBox v3)
                </span>
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Deterministic Regex</span>
                <span className={styles.statusValue} style={{ color: 'var(--color-status-success)' }}>
                  ACTIVE (Deterministic)
                </span>
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>PO Match Engine</span>
                <span className={styles.statusValue} style={{ color: 'var(--color-status-success)' }}>
                  ONLINE (2-Way PO Match)
                </span>
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Database Storage</span>
                <span className={styles.statusValue}>Local Engine (Multi-Tenant)</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Upload Modal */}
      <InvoiceUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          fetchDashboardData();
        }}
      />
    </div>
  );
};

export default DashboardPage;
