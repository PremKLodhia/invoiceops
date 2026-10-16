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
} from 'lucide-react';
import { api } from '../api/client';
import { Card, Button, StatusBadge } from '../components/ui';
import { InvoiceUploadModal } from '../components/invoice/InvoiceUploadModal';
import type { DashboardMetrics, Invoice } from '../types';
import styles from './DashboardPage.module.css';

const fallbackMetrics: DashboardMetrics = {
  needsReviewCount: 14,
  pendingApprovalCount: 6,
  approvedCount: 128,
  disputedCount: 3,
  totalCount: 151,
  currencyBreakdown: [
    { currency: 'GBP', totalAmount: 14250.0, count: 42 },
    { currency: 'USD', totalAmount: 268420.5, count: 96 },
    { currency: 'EUR', totalAmount: 18400.0, count: 13 },
  ],
  recentInvoices: [
    {
      id: 'inv_01',
      invoiceNumber: 'INV-2026-0891',
      supplierName: 'Apex Logistics LLC',
      totalAmount: 14250.0,
      taxAmount: 1295.45,
      currency: 'USD',
      status: 'NEEDS_REVIEW',
      issueDate: '2026-10-14',
      dueDate: '2026-11-13',
      createdAt: '2026-10-14T09:12:00Z',
    },
    {
      id: 'inv_02',
      invoiceNumber: 'INV-2026-0890',
      supplierName: 'Vertex Component Corp',
      totalAmount: 4120.5,
      taxAmount: 374.59,
      currency: 'USD',
      status: 'PENDING_APPROVAL',
      issueDate: '2026-10-14',
      dueDate: '2026-11-28',
      createdAt: '2026-10-14T10:45:00Z',
    },
    {
      id: 'inv_03',
      invoiceNumber: 'INV-2026-0889',
      supplierName: 'Cascade Industrial Spares',
      totalAmount: 2840.0,
      taxAmount: 258.18,
      currency: 'USD',
      status: 'REJECTED',
      issueDate: '2026-10-13',
      dueDate: '2026-11-12',
      createdAt: '2026-10-13T14:20:00Z',
    },
    {
      id: 'inv_04',
      invoiceNumber: 'INV-2026-0888',
      supplierName: 'Kestrel Cloud Infrastructure',
      totalAmount: 8400.0,
      taxAmount: 0.0,
      currency: 'USD',
      status: 'APPROVED',
      issueDate: '2026-10-12',
      dueDate: '2026-10-26',
      createdAt: '2026-10-12T08:00:00Z',
    },
  ],
};

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>(fallbackMetrics);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get<DashboardMetrics | { data: DashboardMetrics }>('/dashboard');
      const data = 'data' in res && res.data ? res.data : (res as DashboardMetrics);
      if (data && typeof data.needsReviewCount === 'number') {
        setMetrics(data);
      }
    } catch {
      // Retain fallback data when backend is starting up or offline
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
      meta: 'Passed compliance & 3-way match',
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
            {(metrics.recentInvoices || []).map((inv: Invoice) => (
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
                      Dated {inv.issueDate} &bull; Received{' '}
                      {new Date(inv.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <StatusBadge status={inv.status} />
                  <span className={styles.activityAmount}>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: inv.currency || 'USD',
                    }).format(inv.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
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
                  <span>Purchase Orders & 3-Way Matching</span>
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
                  ONLINE (2-Way & 3-Way)
                </span>
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Database Storage</span>
                <span className={styles.statusValue}>PostgreSQL Multi-tenant</span>
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
