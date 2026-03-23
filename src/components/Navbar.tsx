"use client";

import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Music, Home, HelpCircle, Share2, MessageCircle } from "lucide-react";
import ContactModal from "./ContactModal";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { getUserTokens } from "@/app/actions/songs";
import { REWARD_OVERALL, REWARD_COMMENT, SONG_SUBMISSION_COST } from "@/lib/constants";
import styles from "./Navbar.module.css";
import AnimatedTokenCounter from "./AnimatedTokenCounter";

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [tokens, setTokens] = useState<number | null>(null);
  const [displayedTokens, setDisplayedTokens] = useState<number | null>(null);
  const [glowMode, setGlowMode] = useState<"positive" | "negative" | null>(null);
  const [showTokensInfo, setShowTokensInfo] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      if (user) {
        const result = await getUserTokens(user.id);
        if (result.success) {
          if (tokens !== null && result.tokens !== tokens) {
            setGlowMode(result.tokens > tokens ? "positive" : "negative");
          }
          setTokens(result.tokens);
          if (displayedTokens === null) {
            setDisplayedTokens(result.tokens);
          }
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
  }, [user, pathname, displayedTokens, tokens]); // Added tokens to dependencies for fetchTokens to compare correctly

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
    if (tokens !== null && displayedTokens !== null && tokens !== displayedTokens) {
      // Step 2: Update counter after 1 second
      const updateTimer = setTimeout(() => {
        setDisplayedTokens(tokens);
      }, 1000);

      return () => clearTimeout(updateTimer);
    }
  }, [tokens, displayedTokens]);

  useEffect(() => {
    if (glowMode) {
      // Step 3: Stop glow after total 1.5 seconds (gives a bit of time after update)
      const stopGlowTimer = setTimeout(() => {
        setGlowMode(null);
      }, 2500);

      return () => clearTimeout(stopGlowTimer);
    }
  }, [glowMode]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'פידבק ספייס',
        text: 'בואו לקבל ולתת פידבק על שירים בקהילת פידבק ספייס!',
        url: window.location.origin,
      });
    } else {
      navigator.clipboard.writeText(window.location.origin);
      alert('הקישור הועתק ללוח!');
    }
  };

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
                  className={`${styles.tokenDisplay} ${glowMode === "positive" ? styles.glowingPositive : glowMode === "negative" ? styles.glowingNegative : ""}`}
                  title="לחצו להסבר על הקרדיטים"
                  onClick={() => setShowTokensInfo(!showTokensInfo)}
                >
                  <div className={styles.tokenIcon}>
                    <Music size={14} />
                  </div>
                  <AnimatedTokenCounter value={displayedTokens ?? 0} />
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
                      <p>העלאת שיר חדש עושה שימוש ב {SONG_SUBMISSION_COST} תווי קרדיט. כדי לקבל קרדיטים נוספים, פשוט תנו פידבק אמיתי ובונה לשירים של יוצרים אחרים בקהילה.</p>
                      <p style={{ marginTop: "5px" }}>על כל דירוג קטגוריה תקבלו {REWARD_OVERALL} תווי קרדיט, ועל הוספת הסבר תקבלו {REWARD_COMMENT} תווי קרדיט נוספים.</p>
                      <div className={styles.popupArrow} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <UserButton afterSignOutUrl="/">
              <UserButton.MenuItems>
                <UserButton.Action
                  label="שתפו עם חברים"
                  labelIcon={<Share2 size={16} />}
                  onClick={handleShare}
                />
                <UserButton.Action
                  label="צרו איתנו קשר"
                  labelIcon={<MessageCircle size={16} />}
                  onClick={() => setShowContactModal(true)}
                />
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
        </div>
      </div>
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </nav>
  );
}
