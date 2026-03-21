"use client";

import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Music, Home, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { getUserTokens } from "@/app/actions/songs";
import styles from "./Navbar.module.css";
import AnimatedTokenCounter from "./AnimatedTokenCounter";

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [tokens, setTokens] = useState<number | null>(null);
  const [isGlowing, setIsGlowing] = useState(false);
  const [showTokensInfo, setShowTokensInfo] = useState(false);
  const prevTokens = useRef<number | null>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      if (user) {
        const result = await getUserTokens(user.id);
        if (result.success) {
          setTokens(result.tokens);
        }
      }
    };
    fetchTokens();

    const handleUpdate = () => {
      fetchTokens();
    };

    window.addEventListener("tokens-updated", handleUpdate);
    return () => {
      window.removeEventListener("tokens-updated", handleUpdate);
    };
  }, [user, pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowTokensInfo(false);
      }
    };
    if (showTokensInfo) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTokensInfo]);

  useEffect(() => {
    if (prevTokens.current !== null && tokens !== null && prevTokens.current !== tokens) {
      const frame = requestAnimationFrame(() => setIsGlowing(true));
      const timer = setTimeout(() => setIsGlowing(false), 3000);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
    if (tokens !== null) {
      prevTokens.current = tokens;
    }
  }, [tokens]);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/Logo.png"
            alt="פידבק ספייס"
            width={30}
            height={30}
            className={styles.logoImage}
          />
          <span>פידבק-ספייס</span>
        </Link>
        <div className={styles.navLinks}>
          {pathname !== "/" && (
            <Link href="/" className={styles.navLink} title="דף הבית">
              <Home size={24} />
            </Link>
          )}
          <SignedOut>
            <SignInButton mode="modal">
              <button className={styles.btnGoogle}>
                התחברות
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            {tokens !== null && (
              <div className={styles.tokenWrapper}>
                <div 
                  className={`${styles.tokenDisplay} ${isGlowing ? styles.glowing : ""}`} 
                  title="לחצו להסבר על הקרדיטים"
                  onClick={() => setShowTokensInfo(!showTokensInfo)}
                >
                  <div className={styles.tokenIcon}>
                    <Music size={14} />
                  </div>
                  <AnimatedTokenCounter value={tokens} />
                </div>

                <AnimatePresence>
                  {showTokensInfo && (
                    <motion.div 
                      ref={infoRef}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className={styles.tokenInfoPopup}
                    >
                      <div className={styles.popupHeader}>
                        <HelpCircle size={18} className={styles.helpIcon} />
                        <h3>איך עובד מנגנון הקרדיטים?</h3>
                      </div>
                      <p>העלאת שיר חדש עושה שימוש בקרדיטים שצברת. כדי לקבל קרדיטים נוספים, פשוט תנו פידבק כנה ובונה לשירים של יוצרים אחרים בקהילה.</p>
                      <div className={styles.popupArrow} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
