import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  X,
  PlusCircle,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { Button, Input, DataTable, StatusBadge, type Column } from '../components/ui';
import type { PurchaseOrder, PurchaseOrderItem, Supplier } from '../types';
import styles from './PurchaseOrdersPage.module.css';

export const PurchaseOrdersPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Form State
  const [poNumber, setPoNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0] || '');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<PurchaseOrderItem[]>([
    { description: 'Service or Item 1', quantity: 1, unitPrice: 0, totalPrice: 0 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPOs = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await api.get<PurchaseOrder[] | { data: PurchaseOrder[] }>('/purchase-orders');
      const list = Array.isArray(res) ? res : res.data || [];
      setPurchaseOrders(list);
    } catch (err: unknown) {
      setPurchaseOrders([]);
      if (err instanceof ApiError) {
        setLoadError(err.message || 'Failed to load purchase orders');
      } else {
        setLoadError('Failed to communicate with purchase order service.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get<Supplier[] | { data: Supplier[] }>('/suppliers');
      const list = Array.isArray(res) ? res : res.data || [];
      setSuppliers(list);
    } catch {
      setSuppliers([]);
    }
  }, []);

  useEffect(() => {
    fetchPOs();
    fetchSuppliers();
  }, [fetchPOs, fetchSuppliers]);

  const filteredPOs = useMemo(() => {
    if (!searchQuery.trim()) return purchaseOrders;
    const q = searchQuery.toLowerCase();
    return purchaseOrders.filter(
      (po) =>
        po.poNumber.toLowerCase().includes(q) ||
        (po.supplierName && po.supplierName.toLowerCase().includes(q)) ||
        (po.description && po.description.toLowerCase().includes(q))
    );
  }, [purchaseOrders, searchQuery]);

  const totalCalculated = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  }, [items]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { description: 'New line item', quantity: 1, unitPrice: 0, totalPrice: 0 },
    ]);
  };

  const handleUpdateItem = (index: number, key: keyof PurchaseOrderItem, val: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] } as PurchaseOrderItem;
      if (key === 'description') {
        item.description = String(val);
      } else if (key === 'quantity' || key === 'unitPrice') {
        const num = Number(val) || 0;
        if (key === 'quantity') item.quantity = num;
        if (key === 'unitPrice') item.unitPrice = num;
        item.totalPrice = Number((item.quantity * item.unitPrice).toFixed(2));
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!poNumber.trim()) {
      setFormError('Purchase Order number is required.');
      return;
    }
    if (!supplierName.trim()) {
      setFormError('Please select or specify a Supplier.');
      return;
    }

    setIsSubmitting(true);
    const newPO: PurchaseOrder = {
      id: `po_${Date.now()}`,
      poNumber: poNumber.trim().toUpperCase(),
      supplierId: supplierId || undefined,
      supplierName: supplierName.trim(),
      description: description.trim() || undefined,
      totalAmount: totalCalculated,
      currency,
      status: 'OPEN',
      issuedDate,
      items,
      createdAt: new Date().toISOString(),
    };

    try {
      const created = await api.post<PurchaseOrder>('/purchase-orders', newPO);
      setPurchaseOrders((prev) => [created || newPO, ...prev]);
      setIsNewModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(err.message || 'Failed to create purchase order on server');
      } else {
        setFormError('Failed to create purchase order. Please verify connection and retry.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPoNumber('');
    setSupplierId('');
    setSupplierName('');
    setDescription('');
    setItems([{ description: 'Service or Item 1', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
    setFormError(null);
  };

  const columns: Column<PurchaseOrder & Record<string, unknown>>[] = [
    {
      key: 'poNumber',
      header: 'PO Number',
      sortable: true,
      render: (po) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-accent)' }}>
          {po.poNumber}
        </span>
      ),
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      sortable: true,
      render: (po) => (
        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
          {po.supplierName || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'issuedDate',
      header: 'Issued Date',
      sortable: true,
      render: (po) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
          {po.issuedDate || '—'}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Commitment Value',
      sortable: true,
      align: 'right',
      render: (po) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: po.currency || 'USD',
          }).format(po.totalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Match Status',
      align: 'center',
      render: (po) => <StatusBadge status={po.status} />,
    },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Purchase Orders Registry</h1>
          <p className={styles.subtitle}>
            Manage procurement commitments for automated 2-way invoice matching against purchase orders
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={13} />}
          onClick={() => setIsNewModalOpen(true)}
        >
          New Purchase Order
        </Button>
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
          <Button variant="secondary" size="sm" onClick={fetchPOs}>
            Retry
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Input
            type="search"
            placeholder="Search POs by number, supplier, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={14} />}
          />
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
          Total PO Commitments: <strong>{filteredPOs.length}</strong>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredPOs as (PurchaseOrder & Record<string, unknown>)[]}
        isLoading={isLoading}
        emptyTitle={loadError ? "Unable to load purchase orders" : "No purchase orders registered"}
        emptyDescription={
          loadError
            ? "Could not connect to the backend server. Please verify your connection and click Retry."
            : searchQuery
            ? "No purchase orders matched your search query."
            : "No purchase orders have been registered in this organisation yet. Click 'New Purchase Order' to issue a commitment for 2-way PO matching."
        }
      />

      {/* New Purchase Order Modal */}
      {isNewModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsNewModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={16} />
                <h2 className={styles.modalTitle}>Issue New Purchase Order</h2>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsNewModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePO}>
              <div className={styles.modalBody}>
                {formError && <div className={styles.errorBanner}>{formError}</div>}

                <div className={styles.formGrid}>
                  <Input
                    label="PO Number"
                    isRequired
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="e.g. PO-2026-004"
                    autoFocus
                  />

                  <div>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                      Currency
                    </label>
                    <select
                      className={styles.selectInput}
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="GBP">GBP (£)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>

                  <div className={styles.fullSpan}>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                      Supplier <span style={{ color: 'var(--color-status-error)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Input
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder="Supplier name"
                        isRequired
                      />
                      {suppliers.length > 0 && (
                        <select
                          className={styles.selectInput}
                          style={{ width: '180px' }}
                          onChange={(e) => {
                            const found = suppliers.find((s) => s.id === e.target.value);
                            if (found) {
                              setSupplierId(found.id);
                              setSupplierName(found.name);
                            }
                          }}
                          value={supplierId}
                        >
                          <option value="">Select Supplier...</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <Input
                    label="Issue Date"
                    type="date"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                  />

                  <Input
                    label="Description / Purpose"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="General description"
                  />
                </div>

                {/* Line Items */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                      PO Line Items
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<PlusCircle size={13} />}
                      onClick={handleAddItem}
                    >
                      Add Line
                    </Button>
                  </div>

                  <table style={{ width: '100%', fontSize: 'var(--text-xs)', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ textAlign: 'left', padding: '4px' }}>Description</th>
                        <th style={{ textAlign: 'right', width: '70px', padding: '4px' }}>Qty</th>
                        <th style={{ textAlign: 'right', width: '90px', padding: '4px' }}>Unit Price</th>
                        <th style={{ textAlign: 'right', width: '90px', padding: '4px' }}>Total</th>
                        <th style={{ width: '30px' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                          <td style={{ padding: '4px' }}>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '4px', fontSize: 'var(--text-xs)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
                              value={it.description}
                              onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                            />
                          </td>
                          <td style={{ padding: '4px' }}>
                            <input
                              type="number"
                              style={{ width: '100%', padding: '4px', textAlign: 'right', fontSize: 'var(--text-xs)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
                              value={it.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td style={{ padding: '4px' }}>
                            <input
                              type="number"
                              step="0.01"
                              style={{ width: '100%', padding: '4px', textAlign: 'right', fontSize: 'var(--text-xs)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
                              value={it.unitPrice}
                              onChange={(e) => handleUpdateItem(idx, 'unitPrice', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right', padding: '4px', fontFamily: 'var(--font-mono)' }}>
                            {currency} {it.totalPrice.toFixed(2)}
                          </td>
                          <td style={{ padding: '4px', textAlign: 'center' }}>
                            {items.length > 1 && (
                              <button
                                type="button"
                                style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
                                onClick={() => handleDeleteItem(idx)}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ textAlign: 'right', marginTop: '12px', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    Total Amount:{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                      {currency} {totalCalculated.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  Create Purchase Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersPage;
