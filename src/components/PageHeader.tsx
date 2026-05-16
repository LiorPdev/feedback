"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import styles from "./PageHeader.module.css";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  showBack?: boolean;
  backUrl?: string;
  showClose?: boolean;
  onClose?: () => void;
  actions?: ReactNode;
  className?: string;
  variant?: 'default' | 'compact' | 'hero';
  align?: 'start' | 'center';
  hideDivider?: boolean;
  afterTitle?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  showBack = false,
  backUrl,
  showClose = false,
  onClose,
  actions,
  className = "",
  variant = 'default',
  align = 'start',
  hideDivider = false,
  afterTitle,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <header className={`${styles.header} ${styles[variant] || ""} ${hideDivider ? styles.noDivider : ""} ${className}`.trim()}>
      <div className={styles.rightSection}>
        {showBack && (
          <button 
            onClick={handleBack} 
            className={styles.navBtn}
            aria-label="חזרה"
            type="button"
          >
            <ArrowRight size={24} />
          </button>
        )}
      </div>

      <div className={`${styles.centerSection} ${styles[align] || ""}`.trim()}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>{title}</h1>
          {afterTitle && <div className={styles.afterTitle}>{afterTitle}</div>}
        </div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>

      <div className={styles.leftSection}>
        {actions && <div className={styles.actions}>{actions}</div>}
        {showClose && (
          <button 
            onClick={onClose} 
            className={`${styles.navBtn} ${styles.closeBtn}`}
            aria-label="סגירה"
            type="button"
          >
            <X size={24} />
          </button>
        )}
      </div>
    </header>
  );
}
