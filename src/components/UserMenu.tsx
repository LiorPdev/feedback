"use client";

import { useState, useRef, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { User, Music, Share2, Gift, MessageCircle, BarChart, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import styles from "./UserMenu.module.css";
import { logoutUser } from "@/app/actions/user";

interface UserMenuProps {
  isAdmin: boolean;
  name?: string;
  email?: string;
  onOpenPreferences: () => void;
  onOpenContact: () => void;
  onOpenCreditTransfer: () => void;
  onShare: () => void;
}

export default function UserMenu({
  isAdmin,
  name,
  email,
  onOpenPreferences,
  onOpenContact,
  onOpenCreditTransfer,
  onShare
}: UserMenuProps) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Logout handler to clear both states
  const handleLogout = async () => {
    setIsOpen(false);
    await logoutUser();
    if (user) {
      signOut({ redirectUrl: "/" });
    } else {
      window.location.href = "/";
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isLoaded) return <div className={styles.trigger} style={{ opacity: 0.5 }} />;

  const handleAction = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        {user?.imageUrl ? (
          <Image 
            src={user.imageUrl} 
            alt={user.fullName || "User"} 
            className={styles.avatar}
            width={32}
            height={32}
          />
        ) : (
          <div className={styles.avatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-contrast))', color: 'white' }}>
            <User size={20} />
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={styles.dropdown}
          >
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {user?.fullName || name || (email ? email.split('@')[0] : "משתמש בקהילה")}
              </span>
              {user?.primaryEmailAddress ? (
                <span className={styles.userEmail}>
                  {user.primaryEmailAddress.emailAddress}
                </span>
              ) : email ? (
                <span className={styles.userEmail}>{email}</span>
              ) : null}
            </div>

            <div className={styles.menuList}>
              <button className={styles.menuItem} onClick={() => handleAction(onOpenPreferences)}>
                <div className={styles.iconWrapper}><Music size={18} /></div>
                <span>כרטיס ביקור מוזיקלי</span>
              </button>

              <button className={styles.menuItem} onClick={() => handleAction(onShare)}>
                <div className={styles.iconWrapper}><Share2 size={18} /></div>
                <span>שתפו עם חברים</span>
              </button>

              <button className={styles.menuItem} onClick={() => handleAction(onOpenCreditTransfer)}>
                <div className={styles.iconWrapper}><Gift size={18} /></div>
                <span>שלח/קבל תווי קרדיט</span>
              </button>

              <button className={styles.menuItem} onClick={() => handleAction(onOpenContact)}>
                <div className={styles.iconWrapper}><MessageCircle size={18} /></div>
                <span>צרו איתנו קשר</span>
              </button>

              {isAdmin && (
                <Link href="/admin/reports" className={styles.menuItem} onClick={() => setIsOpen(false)}>
                  <div className={styles.iconWrapper}><BarChart size={18} /></div>
                  <span>דוחות מנהל</span>
                </Link>
              )}

              {/* Logout Button (Hidden for unidentified, visible for Guests and Clerk) */}
              <>
                <div className={styles.divider} />
                <button
                  className={`${styles.menuItem} ${styles.logoutBtn}`}
                  onClick={handleLogout}
                >
                  <div className={styles.iconWrapper}><LogOut size={18} /></div>
                  <span>התנתקות</span>
                </button>
              </>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
