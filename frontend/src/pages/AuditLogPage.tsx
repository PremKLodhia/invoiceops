import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { Button, Input, DataTable, type Column } from '../components/ui';
import type { AuditEvent } from '../types';
import styles from './AuditLogPage.module.css';

export const AuditLogPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAuditEvents = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await api.get<AuditEvent[] | { data: AuditEvent[] }>('/audit-events');
      const list = Array.isArray(res) ? res : res.data || [];
      setEvents(list);
    } catch (err: unknown) {
      setEvents([]);
      if (err instanceof ApiError) {
        setLoadError(err.message || 'Failed to load audit events');
      } else {
        setLoadError('Failed to communicate with audit trail service.');
      }
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
            Append-only chronological audit trail of invoice ingestions, field edits, approval transitions, and system actions
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

      {/* Alert Banner */}
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
          <Button variant="secondary" size="sm" onClick={fetchAuditEvents}>
            Retry
          </Button>
        </div>
      )}

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
        emptyTitle={loadError ? "Unable to load audit trail" : "No audit records found"}
        emptyDescription={
          loadError
            ? "Could not connect to the backend server. Please verify your connection and click Retry."
            : searchQuery || actionFilter !== 'ALL' || entityFilter !== 'ALL'
            ? "No audit events match your selected filter criteria."
            : "No audit events have been recorded in this organisation yet."
        }
      />
    </div>
  );
};

export default AuditLogPage;
