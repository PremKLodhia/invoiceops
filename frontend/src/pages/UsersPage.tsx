import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserPlus,
  Search,
  X,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Button, Input, DataTable, type Column } from '../components/ui';
import type { User, UserRole } from '../types';
import styles from './UsersPage.module.css';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New User Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('REVIEWER');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await api.get<User[] | { data: User[] }>('/users');
      const list = Array.isArray(res) ? res : res.data || [];
      setUsers(list);
    } catch (err: unknown) {
      setUsers([]);
      if (err instanceof ApiError) {
        setLoadError(err.message || 'Failed to load organisation team members');
      } else {
        setLoadError('Failed to communicate with user management service.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role?.toUpperCase() !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

  const handleToggleStatus = async (userToToggle: User) => {
    setActionError(null);
    const newStatus = !userToToggle.isActive;
    try {
      const updated = await api.put<User>(`/users/${userToToggle.id}/status?active=${newStatus}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userToToggle.id ? (updated || { ...u, isActive: newStatus }) : u))
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Failed to update user status. Please try again.');
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Full Name is required.');
      return;
    }
    if (!email.trim()) {
      setFormError('Email address is required.');
      return;
    }
    if (!password.trim() || password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      role,
    };

    try {
      const created = await api.post<User>('/users', payload);
      setUsers((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(err.message || 'Failed to create user on server');
      } else {
        setFormError('Failed to create user. Please verify details and retry.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('REVIEWER');
    setFormError(null);
  };

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '48px 24px',
          textAlign: 'center',
          maxWidth: '540px',
          margin: '40px auto',
        }}>
          <Lock size={36} color="var(--color-text-secondary)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Administrator Access Required
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            You are currently signed in as <strong>{currentUser?.fullName}</strong> ({currentUser?.role}).
            Only users with the <strong>ADMIN</strong> role can view or manage team member accounts and access permissions.
          </p>
        </div>
      </div>
    );
  }

  const columns: Column<User & Record<string, unknown>>[] = [
    {
      key: 'fullName',
      header: 'Team Member',
      sortable: true,
      render: (u) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.fullName}</span>
          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-secondary)' }}>{u.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      sortable: true,
      width: '140px',
      render: (u) => {
        const r = (u.role || '').toUpperCase();
        let bg = 'var(--color-bg-secondary, #f1f5f9)';
        let color = 'var(--color-text-secondary, #475569)';
        if (r === 'ADMIN') {
          bg = '#ede9fe';
          color = '#6d28d9';
        } else if (r === 'APPROVER') {
          bg = '#e0f2fe';
          color = '#0369a1';
        } else if (r === 'REVIEWER') {
          bg = '#ecfdf5';
          color = '#047857';
        }
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: 'var(--text-2xs)',
            fontWeight: 600,
            background: bg,
            color,
          }}>
            <Shield size={11} />
            {r}
          </span>
        );
      },
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      width: '120px',
      align: 'center',
      render: (u) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: 'var(--text-2xs)',
          fontWeight: 500,
          color: u.isActive ? 'var(--color-status-success)' : 'var(--color-text-muted)',
        }}>
          {u.isActive ? <CheckCircle size={13} /> : <XCircle size={13} />}
          {u.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined Date',
      sortable: true,
      width: '140px',
      render: (u) => (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: '130px',
      render: (u) => {
        const isSelf = u.id === currentUser?.id;
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={isSelf}
            onClick={() => handleToggleStatus(u)}
            title={isSelf ? 'Cannot deactivate your own account' : u.isActive ? 'Deactivate user' : 'Reactivate user'}
          >
            {u.isActive ? 'Deactivate' : 'Reactivate'}
          </Button>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Team & Access Control</h1>
          <p className={styles.subtitle}>
            Manage authorised operators, invoice reviewers, approvers, and administrative credentials
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<UserPlus size={13} />}
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
        >
          Add Team Member
        </Button>
      </div>

      {/* Alert Banners */}
      {loadError && (
        <div style={{
          background: 'var(--color-bg-danger-subtle, #fef2f2)',
          border: '1px solid var(--color-border-danger, #fca5a5)',
          color: 'var(--color-text-danger, #991b1b)',
          borderRadius: '6px',
          padding: '12px 16px',
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
          <Button variant="secondary" size="sm" onClick={fetchUsers}>
            Retry
          </Button>
        </div>
      )}

      {actionError && (
        <div style={{
          background: 'var(--color-bg-danger-subtle, #fef2f2)',
          border: '1px solid var(--color-border-danger, #fca5a5)',
          color: 'var(--color-text-danger, #991b1b)',
          borderRadius: '6px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Input
            type="search"
            placeholder="Search by user name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={14} />}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            className={styles.selectInput}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="REVIEWER">REVIEWER</option>
            <option value="APPROVER">APPROVER</option>
          </select>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            Total Users: <strong>{filteredUsers.length}</strong>
          </div>
        </div>
      </div>

      {/* Users DataTable */}
      <DataTable
        columns={columns}
        data={filteredUsers as (User & Record<string, unknown>)[]}
        isLoading={isLoading}
        emptyTitle={loadError ? "Unable to load users" : "No users found"}
        emptyDescription={
          loadError
            ? "Could not connect to the user management service. Please check connection and click Retry."
            : searchQuery || roleFilter !== 'ALL'
            ? "No users matched your search or role filters."
            : "No team members found in this organisation."
        }
      />

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={16} />
                <h2 className={styles.modalTitle}>Add Team Member</h2>
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

            <form onSubmit={handleCreateUser}>
              <div className={styles.modalBody}>
                {formError && <div className={styles.errorBanner}>{formError}</div>}

                <Input
                  label="Full Name"
                  isRequired
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  autoFocus
                />

                <Input
                  label="Email Address"
                  type="email"
                  isRequired
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@acme.com"
                />

                <Input
                  label="Temporary Password"
                  type="password"
                  isRequired
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />

                <div className={styles.roleSelect}>
                  <label className={styles.roleLabel}>Assigned Role</label>
                  <select
                    className={styles.selectInput}
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                  >
                    <option value="REVIEWER">REVIEWER (Extract, edit & submit invoices)</option>
                    <option value="APPROVER">APPROVER (Review & approve/reject invoices)</option>
                    <option value="ADMIN">ADMIN (Full administrative access & team management)</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isSubmitting}>
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
