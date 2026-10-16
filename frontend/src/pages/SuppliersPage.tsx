import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Mail,
  X,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { Button, Input, DataTable, StatusBadge, type Column } from '../components/ui';
import type { Supplier } from '../types';
import styles from './SuppliersPage.module.css';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // New Supplier form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTaxId, setNewTaxId] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await api.get<Supplier[] | { data: Supplier[] }>('/suppliers');
      const list = Array.isArray(res) ? res : res.data || [];
      setSuppliers(list);
    } catch (err: unknown) {
      setSuppliers([]);
      if (err instanceof ApiError) {
        setLoadError(err.message || 'Failed to load suppliers');
      } else {
        setLoadError('Failed to communicate with supplier directory service.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactEmail && s.contactEmail.toLowerCase().includes(q)) ||
        (s.taxId && s.taxId.toLowerCase().includes(q))
    );
  }, [suppliers, searchQuery]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim()) {
      setFormError('Supplier Name is required.');
      return;
    }

    setIsSubmitting(true);
    const newRecord = {
      name: newName.trim(),
      contactEmail: newEmail.trim() || undefined,
      taxId: newTaxId.trim() || undefined,
      address: newAddress.trim() || undefined,
      notes: newNotes.trim() || undefined,
      active: true,
    };

    try {
      const created = await api.post<Supplier>('/suppliers', newRecord);
      setSuppliers((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      // Never simulate success on failure
      if (err instanceof ApiError) {
        setFormError(err.message || 'Failed to create supplier on server');
      } else {
        setFormError('Failed to register supplier. Please verify connection and retry.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewTaxId('');
    setNewAddress('');
    setNewNotes('');
    setFormError(null);
  };

  const columns: Column<Supplier & Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Supplier Name',
      sortable: true,
      render: (s) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.name}</span>
          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            ID: {s.id}
          </span>
        </div>
      ),
    },
    {
      key: 'contactEmail',
      header: 'Contact Email',
      render: (s) =>
        s.contactEmail ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)' }}>
            <Mail size={12} style={{ color: 'var(--color-text-secondary)' }} />
            {s.contactEmail}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>&mdash;</span>
        ),
    },
    {
      key: 'taxId',
      header: 'Tax ID / VAT',
      render: (s) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
          {s.taxId || '—'}
        </span>
      ),
    },
    {
      key: 'invoicesCount',
      header: 'Processed Invoices',
      align: 'center',
      render: (s) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {s.invoicesCount || 0}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      align: 'center',
      render: (s) => (
        <StatusBadge status={s.active ? 'active' : 'inactive'} label={s.active ? 'Active' : 'Inactive'} />
      ),
    },
    {
      key: 'actions',
      header: 'Details',
      align: 'right',
      render: (s) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSupplier(s);
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Supplier Directory</h1>
          <p className={styles.subtitle}>
            Verified vendor credentials, remittance identifiers, and processing records
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={13} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Supplier
        </Button>
      </div>

      {/* Toolbar */}
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
          <Button variant="secondary" size="sm" onClick={fetchSuppliers}>
            Retry
          </Button>
        </div>
      )}

      {/* Search Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Input
            type="search"
            placeholder="Search suppliers by name, email, or VAT ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={14} />}
          />
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
          Total Suppliers: <strong>{filteredSuppliers.length}</strong>
        </div>
      </div>

      {/* Suppliers Table */}
      <DataTable
        columns={columns}
        data={filteredSuppliers as (Supplier & Record<string, unknown>)[]}
        isLoading={isLoading}
        onRowClick={(s) => setSelectedSupplier(s as Supplier)}
        emptyTitle={loadError ? "Unable to load suppliers" : "No suppliers found"}
        emptyDescription={
          loadError
            ? "Could not connect to the backend server. Please verify your connection and click Retry."
            : searchQuery
            ? "No suppliers matched your search query."
            : "No suppliers have been registered in this organisation yet. Click 'Add Supplier' to create your first vendor record."
        }
      />

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} />
                <h2 className={styles.modalTitle}>Register New Supplier</h2>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier}>
              <div className={styles.modalBody}>
                {formError && <div className={styles.errorBanner}>{formError}</div>}

                <Input
                  label="Supplier Legal Name"
                  isRequired
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Acme Logistics UK Ltd"
                  autoFocus
                />

                <Input
                  label="Remittance Email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="billing@acme.com"
                />

                <Input
                  label="Tax ID / VAT Registration"
                  value={newTaxId}
                  onChange={(e) => setNewTaxId(e.target.value)}
                  placeholder="e.g. GB123456789"
                />

                <Input
                  label="Registered Address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Street, City, Postal Code"
                />

                <Input
                  label="Internal Operational Notes"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Payment terms Net 30, discount available on Net 10."
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  Save Supplier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Detail Drawer / Modal */}
      {selectedSupplier && (
        <div className={styles.modalOverlay} onClick={() => setSelectedSupplier(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} />
                <h2 className={styles.modalTitle}>{selectedSupplier.name}</h2>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedSupplier(null)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.supplierDetailCard}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Supplier ID:</span>
                  <span className={styles.detailVal} style={{ fontFamily: 'var(--font-mono)' }}>
                    {selectedSupplier.id}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Contact Email:</span>
                  <span className={styles.detailVal}>{selectedSupplier.contactEmail || 'Not specified'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Tax ID / VAT:</span>
                  <span className={styles.detailVal} style={{ fontFamily: 'var(--font-mono)' }}>
                    {selectedSupplier.taxId || 'Not registered'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Physical Address:</span>
                  <span className={styles.detailVal}>{selectedSupplier.address || '—'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Operational Notes:</span>
                  <span className={styles.detailVal}>{selectedSupplier.notes || '—'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Invoices Ingested:</span>
                  <span className={styles.detailVal}>{selectedSupplier.invoicesCount || 0} invoices</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                fullWidth
                rightIcon={<ExternalLink size={13} />}
                onClick={() => {
                  setSelectedSupplier(null);
                  navigate(`/invoices?search=${encodeURIComponent(selectedSupplier.name)}`);
                }}
              >
                Filter Invoices for this Supplier
              </Button>
            </div>

            <div className={styles.modalFooter}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSupplier(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersPage;
