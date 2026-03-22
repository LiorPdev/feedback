"use client";

import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.copyright}>
          © {currentYear} | כל הזכויות שמורות
        </div>

        <div className={styles.links}>
          <Link href="/terms" className={styles.link}>תנאי שימוש</Link>
          <span className={styles.separator}>|</span>
          <Link href="/privacy" className={styles.link}>מדיניות פרטיות</Link>
        </div>
      </div>
    </footer>
  );
}
