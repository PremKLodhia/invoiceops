import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Building2,
  ClipboardList,
  History,
  Users,
  LogOut,
  Menu,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import styles from './AppLayout.module.css';

interface NavItemConfig {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
  adminOnly?: boolean;
}

const navItems: NavItemConfig[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/invoices',
    label: 'Invoices',
    icon: Receipt,
  },
  {
    to: '/suppliers',
    label: 'Suppliers',
    icon: Building2,
  },
  {
    to: '/purchase-orders',
    label: 'Purchase Orders',
    icon: ClipboardList,
  },
  {
    to: '/audit',
    label: 'Audit Trail',
    icon: History,
  },
  {
    to: '/users',
    label: 'Users',
    icon: Users,
    adminOnly: true,
  },
];

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, organisation, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Determine current page title for breadcrumb
  const currentNav = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const pageTitle = location.pathname.startsWith('/invoices/') && location.pathname !== '/invoices'
    ? 'Invoice Review'
    : currentNav ? currentNav.label : 'Workbench';

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'OP';

  return (
    <div className={styles.wrapper}>
      {sidebarOpen && <div className={styles.backdrop} onClick={closeSidebar} />}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <FileSpreadsheet size={16} />
            </div>
            <span className={styles.brandTitle}>InvoiceOps</span>
          </div>
          <span className={styles.badgeEnv}>LOCAL</span>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSectionTitle}>Navigation</div>
          {navItems
            .filter((item) => !item.adminOnly || user?.role === 'admin' || user?.role === 'ADMIN')
            .map((item) => {
              const IconComponent = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                  }
                >
                  <IconComponent size={16} className={styles.navIcon} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.orgLabel}>Organisation</div>
          <div className={styles.orgName} title={organisation?.name || 'Default Org'}>
            {organisation?.name || 'Acme Operations'}
          </div>
        </div>
      </aside>

      <div className={styles.mainContainer}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.menuToggle}
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className={styles.breadcrumb}>
              InvoiceOps / <strong>{pageTitle}</strong>
            </div>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>{userInitials}</div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user?.fullName || 'Finance Operator'}</span>
                <span className={styles.userRole}>{user?.role || 'operator'}</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.logoutBtn}
              onClick={handleLogout}
              title="Sign out of InvoiceOps"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
