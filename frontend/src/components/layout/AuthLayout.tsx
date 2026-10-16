import React from 'react';
import { Outlet } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';
import styles from './AuthLayout.module.css';

const CURRENT_YEAR = new Date().getFullYear();

export const AuthLayout: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.authBox}>
        <div className={styles.brandArea}>
          <div className={styles.logoIcon}>
            <FileSpreadsheet size={20} />
          </div>
          <h1 className={styles.title}>InvoiceOps</h1>
          <p className={styles.subtitle}>Financial Operations & Invoice Workbench</p>
        </div>

        <Outlet />
      </div>

      <footer className={styles.footer}>
        InvoiceOps &copy; {CURRENT_YEAR} &bull; Local-first enterprise invoice platform
      </footer>
    </div>
  );
};

export default AuthLayout;
