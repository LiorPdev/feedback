"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.logo}>
          <img
            src="/Logo.png?v=2"
            alt="פידבק ספייס"
            width={30}
            height={30}
            className={styles.logoImage}
          />
          <span>פידבק-ספייס</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/give-feedback" className={styles.navLink}>לתת פידבק</Link>
          <Link href="/get-feedback" className={styles.navLink}>לקבל פידבק</Link>
          <Link href="/" className={styles.navLink}>דף הבית</Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className={styles.btnGoogle}>
                התחברות
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
