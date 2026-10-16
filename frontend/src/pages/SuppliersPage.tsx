import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Mail,
  X,
  ExternalLink,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { Button, Input, DataTable, StatusBadge, type Column } from '../components/ui';
import type { Supplier } from '../types';
import styles from './SuppliersPage.module.css';

const initialSuppliers: Supplier[] = [
  {
    id: 'sup_01',
    name: 'Apex Logistics LLC',
    contactEmail: 'billing@apexlogistics.com',
    taxId: 'GB982341209',
    address: 'Unit 4, Gateway Logistics Park, Birmingham, B24 8HX',
    notes: 'Primary freight and warehouse partner. Net 30 terms.',
    active: true,
    invoicesCount: 14,
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'sup_02',
    name: 'Vertex Component Corp',
    contactEmail: 'accounts@vertexcomponents.io',
    taxId: 'US84-1928471',
    address: '500 Technology Drive, San Jose, CA 95110',
    notes: 'Microcontrollers and circuit board assemblies.',
    active: true,
    invoicesCount: 8,
    createdAt: '2026-02-01T11:20:00Z',
  },
  {
    id: 'sup_03',
    name: 'Cascade Industrial Spares',
    contactEmail: 'ar@cascade-spares.co.uk',
    taxId: 'GB119283741',
    address: '12 Foundry Way, Sheffield, S9 2TR',
    notes: 'Hydraulic and pneumatic replacement parts.',
    active: true,
    invoicesCount: 6,
    createdAt: '2026-02-18T14:40:00Z',
  },
  {
    id: 'sup_04',
    name: 'Kestrel Cloud Infrastructure',
    contactEmail: 'invoicing@kestrelcloud.net',
    taxId: 'EU372009182',
    address: 'Keizersgracht 421, 1016 EK Amsterdam, Netherlands',
    notes: 'Managed cloud server hosting and load balancing.',
    active: true,
    invoicesCount: 12,
    createdAt: '2026-01-10T09:00:00Z',
  },
  {
    id: 'sup_05',
    name: 'Northwind Packaging Co.',
    contactEmail: 'orders@northwindpackaging.com',
    taxId: 'GB554321987',
    address: 'Northwind Depot, Trafford Park, Manchester, M17 1EB',
    notes: 'Recyclable corrugated boxes and pallet wraps.',
    active: true,
    invoicesCount: 5,
    createdAt: '2026-03-05T08:30:00Z',
  },
];

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    try {
      const res = await api.get<Supplier[] | { data: Supplier[] }>('/suppliers');
      const list = Array.isArray(res) ? res : res.data || [];
      if (list.length > 0) {
        setSuppliers(list);
      }
    } catch {
      // Backend fallback preserved
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
    const newRecord: Supplier = {
      id: `sup_${Date.now()}`,
      name: newName.trim(),
      contactEmail: newEmail.trim() || undefined,
      taxId: newTaxId.trim() || undefined,
      address: newAddress.trim() || undefined,
      notes: newNotes.trim() || undefined,
      active: true,
      invoicesCount: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      await api.post('/suppliers', newRecord);
      setSuppliers((prev) => [newRecord, ...prev]);
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      // Offline fallback: persist in state
      setSuppliers((prev) => [newRecord, ...prev]);
      setIsAddModalOpen(false);
      resetForm();
      if (err instanceof ApiError) {
        console.warn('Backend sync failed, stored locally:', err.message);
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
        emptyTitle="No suppliers found"
        emptyDescription="Add a new supplier to start matching incoming invoices."
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
