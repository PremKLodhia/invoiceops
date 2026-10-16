import React, { type ReactNode, type HTMLAttributes } from 'react';
import styles from './Card.module.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  padding?: 'normal' | 'dense' | 'none';
  children?: ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  footer,
  padding = 'normal',
  children,
  className = '',
  ...props
}) => {
  const hasHeader = title || subtitle || action;

  return (
    <div className={`${styles.card} ${className}`} {...props}>
      {hasHeader && (
        <div className={styles.header}>
          <div className={styles.titleArea}>
            {typeof title === 'string' ? <h3 className={styles.title}>{title}</h3> : title}
            {typeof subtitle === 'string' ? (
              <p className={styles.subtitle}>{subtitle}</p>
            ) : (
              subtitle
            )}
          </div>
          {action && <div className={styles.actions}>{action}</div>}
        </div>
      )}
      <div className={`${styles.body} ${styles[`padding-${padding}`]}`}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
};

export default Card;
