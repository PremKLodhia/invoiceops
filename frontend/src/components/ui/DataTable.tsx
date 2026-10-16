import React, { type ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Inbox } from 'lucide-react';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display right now.',
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
  className = '',
}: DataTableProps<T>): React.ReactElement {
  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'right') return styles.alignRight;
    if (align === 'center') return styles.alignCenter;
    return styles.alignLeft;
  };

  const handleHeaderClick = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortKey === columnKey) {
      return sortDirection === 'asc' ? (
        <ArrowUp className={`${styles.sortIcon} ${styles.sortIconActive}`} size={12} />
      ) : (
        <ArrowDown className={`${styles.sortIcon} ${styles.sortIconActive}`} size={12} />
      );
    }
    return <ArrowUpDown className={styles.sortIcon} size={12} />;
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => {
              const isSortable = !!col.sortable;
              return (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={[
                    styles.th,
                    getAlignmentClass(col.align),
                    isSortable ? styles.sortableTh : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleHeaderClick(col)}
                  role={isSortable ? 'button' : undefined}
                  tabIndex={isSortable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (isSortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleHeaderClick(col);
                    }
                  }}
                >
                  <div className={styles.thContent}>
                    <span>{col.header}</span>
                    {isSortable && renderSortIcon(col.key)}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <tr key={`skeleton-${index}`} className={styles.skeletonRow}>
                {columns.map((col) => (
                  <td key={col.key} className={styles.td}>
                    <div className={styles.skeletonCell} style={{ width: '70%' }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Inbox size={28} />
                </div>
                <div className={styles.emptyTitle}>{emptyTitle}</div>
                <div className={styles.emptyText}>{emptyDescription}</div>
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => {
              const rowKey = keyExtractor
                ? keyExtractor(item, rowIndex)
                : (item.id as string | number) || rowIndex;

              return (
                <tr
                  key={rowKey}
                  className={onRowClick ? styles.clickableRow : ''}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {columns.map((col) => {
                    const value = item[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`${styles.td} ${getAlignmentClass(col.align)}`}
                      >
                        {col.render ? col.render(item, rowIndex) : (value as ReactNode)}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
