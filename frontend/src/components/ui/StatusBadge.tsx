import React from 'react';
import styles from './StatusBadge.module.css';

export interface StatusBadgeProps {
  status: string;
  label?: string;
  showDot?: boolean;
  className?: string;
}

const formatStatusText = (status: string): string => {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  showDot = true,
  className = '',
}) => {
  const normalizedKey = `status-${status.toLowerCase()}`;
  const statusClass = styles[normalizedKey] || styles['status-neutral'];

  return (
    <span className={`${styles.badge} ${statusClass} ${className}`}>
      {showDot && <span className={styles.dot} aria-hidden="true" />}
      <span>{label || formatStatusText(status)}</span>
    </span>
  );
};

export default StatusBadge;
