import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { Button, Input, DataTable, type Column } from '../components/ui';
import type { AuditEvent } from '../types';
import styles from './AuditLogPage.module.css';

const initialAuditEvents: AuditEvent[] = [
  {
    id: 'aud_108',
    actorEmail: 'admin@acme.com',
    action: 'INVOICE_APPROVE',
    entityType: 'INVOICE',
    entityId: 'inv_07',
    metadata: { invoiceNumber: 'INV-2026-0885', supplier: 'Silverline Precision Parts', grossAmount: 7650.0 },
    createdAt: '2026-10-15T16:20:12Z',
  },
  {
    id: 'aud_107',
    actorEmail: 'operator@acme.com',
    action: 'INVOICE_SUBMIT',
    entityType: 'INVOICE',
    entityId: 'inv_07',
    metadata: { invoiceNumber: 'INV-2026-0885', targetStage: 'PENDING_APPROVAL' },
    createdAt: '2026-10-15T15:45:00Z',
  },
  {
    id: 'aud_106',
    actorEmail: 'operator@acme.com',
    action: 'FIELD_CORRECTION',
    entityType: 'INVOICE',
    entityId: 'inv_01',
    metadata: { field: 'supplierName', previous: 'Apex Int Ltd', updated: 'Apex Logistics LLC' },
    createdAt: '2026-10-15T14:10:45Z',
  },
  {
    id: 'aud_105',
    actorEmail: 'approver@acme.com',
    action: 'INVOICE_REJECT',
    entityType: 'INVOICE',
    entityId: 'inv_03',
    metadata: { invoiceNumber: 'INV-2026-0889', reason: 'Missing receiving docket and line total variance' },
    createdAt: '2026-10-15T11:32:00Z',
  },
  {
    id: 'aud_104',
    actorEmail: 'worker@invoiceops.local',
    action: 'INVOICE_UPLOAD',
    entityType: 'INVOICE',
    entityId: 'inv_01',
    metadata: { filename: 'apex_freight_october_invoice.pdf', parser: 'PDFBox v3' },
    createdAt: '2026-10-15T09:12:00Z',
  },
  {
    id: 'aud_103',
    actorEmail: 'admin@acme.com',
    action: 'SUPPLIER_CREATE',
    entityType: 'SUPPLIER',
    entityId: 'sup_05',
    metadata: { name: 'Northwind Packaging Co.', taxId: 'GB554321987' },
    createdAt: '2026-10-14T10:15:20Z',
  },
  {
    id: 'aud_102',
    actorEmail: 'admin@acme.com',
    action: 'PO_CREATE',
    entityType: 'PURCHASE_ORDER',
    entityId: 'po_02',
    metadata: { poNumber: 'PO-70228', amount: 4120.5 },
    createdAt: '2026-10-13T13:40:00Z',
  },
];

export const AuditLogPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>(initialAuditEvents);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const fetchAuditEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get<AuditEvent[] | { data: AuditEvent[] }>('/audit');
      const list = Array.isArray(res) ? res : res.data || [];
      if (list.length > 0) {
        setEvents(list);
      }
    } catch {
      // Backend fallback preserved
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditEvents();
  }, [fetchAuditEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (actionFilter !== 'ALL' && ev.action !== actionFilter) return false;
      if (entityFilter !== 'ALL' && ev.entityType !== entityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchActor = ev.actorEmail.toLowerCase().includes(q);
        const matchAction = ev.action.toLowerCase().includes(q);
        const matchId = ev.entityId?.toLowerCase().includes(q) ?? false;
        const matchMeta = ev.metadata ? JSON.stringify(ev.metadata).toLowerCase().includes(q) : false;
        return matchActor || matchAction || matchId || matchMeta;
      }
      return true;
    });
  }, [events, searchQuery, actionFilter, entityFilter]);

  const columns: Column<AuditEvent & Record<string, unknown>>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp (Local)',
      sortable: true,
      width: '180px',
      render: (ev) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
          {new Date(ev.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actorEmail',
      header: 'Actor',
      sortable: true,
      width: '210px',
      render: (ev) => (
        <span style={{ fontWeight: 500, fontSize: 'var(--text-xs)' }}>
          {ev.actorEmail}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      width: '170px',
      render: (ev) => (
        <span className={styles.actionTag}>
          {ev.action}
        </span>
      ),
    },
    {
      key: 'entityType',
      header: 'Entity / Target ID',
      width: '180px',
      render: (ev) => (
        <span style={{ fontSize: 'var(--text-xs)' }}>
          <strong>{ev.entityType}</strong> &bull;{' '}
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
            {ev.entityId || 'system'}
          </span>
        </span>
      ),
    },
    {
      key: 'metadata',
      header: 'Event Metadata Summary',
      render: (ev) =>
        ev.metadata ? (
          <span className={styles.metaSnippet} title={JSON.stringify(ev.metadata, null, 2)}>
            {JSON.stringify(ev.metadata)}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>&mdash;</span>
        ),
    },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>System Audit Trail</h1>
          <p className={styles.subtitle}>
            Immutable chronological ledger of invoice ingestions, field edits, approval transitions, and system actions
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={13} />}
            onClick={fetchAuditEvents}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download size={13} />}
            onClick={() => alert('Exporting audit trail to CSV...')}
          >
            Export Log
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Input
            type="search"
            placeholder="Search by actor email, entity ID, or metadata..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={14} />}
          />
        </div>

        <div className={styles.filterControls}>
          <select
            className={styles.selectInput}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filter by action"
          >
            <option value="ALL">All Actions</option>
            <option value="INVOICE_UPLOAD">INVOICE_UPLOAD</option>
            <option value="FIELD_CORRECTION">FIELD_CORRECTION</option>
            <option value="INVOICE_SUBMIT">INVOICE_SUBMIT</option>
            <option value="INVOICE_APPROVE">INVOICE_APPROVE</option>
            <option value="INVOICE_REJECT">INVOICE_REJECT</option>
            <option value="SUPPLIER_CREATE">SUPPLIER_CREATE</option>
            <option value="PO_CREATE">PO_CREATE</option>
          </select>

          <select
            className={styles.selectInput}
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            aria-label="Filter by entity type"
          >
            <option value="ALL">All Entity Types</option>
            <option value="INVOICE">INVOICE</option>
            <option value="SUPPLIER">SUPPLIER</option>
            <option value="PURCHASE_ORDER">PURCHASE_ORDER</option>
          </select>
        </div>

        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={14} style={{ color: 'var(--color-status-success)' }} />
          <span>{filteredEvents.length} recorded events</span>
        </div>
      </div>

      {/* Events Table */}
      <DataTable
        columns={columns}
        data={filteredEvents as (AuditEvent & Record<string, unknown>)[]}
        isLoading={isLoading}
        emptyTitle="No audit records found"
        emptyDescription="System actions and approvals will appear here as they are executed."
      />
    </div>
  );
};

export default AuditLogPage;
