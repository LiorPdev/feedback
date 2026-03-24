"use client";

import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ADMIN_EMAIL } from "@/lib/constants";
import { Music, Home, HelpCircle, Share2, MessageCircle, BarChart, X, User as UserIcon } from "lucide-react";
import ContactModal from "./ContactModal";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { getUserData } from "@/app/actions/user";
import UserPreferencesModal from "./UserPreferencesModal";
import styles from "./Navbar.module.css";
import AnimatedTokenCounter from "./AnimatedTokenCounter";
import { getCookie, setCookie } from "@/lib/cookieUtils";

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [tokens, setTokens] = useState<number | null>(null);
  const [userGenre, setUserGenre] = useState<string>("");
  const [displayedTokens, setDisplayedTokens] = useState<number | null>(null);
  const [glowMode, setGlowMode] = useState<"positive" | "negative" | null>(null);
  const [showTokensInfo, setShowTokensInfo] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const redirectUrlRef = useRef<string | null>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const result = await getUserData(user.id);
        if (result.success && result.tokens !== undefined) {
          if (tokens !== null && result.tokens !== tokens) {
            setGlowMode(result.tokens > tokens ? "positive" : "negative");
          }
          setTokens(result.tokens);
          setUserGenre(result.userGenre || "");
          if (displayedTokens === null) {
            setDisplayedTokens(result.tokens);
          }
        }
      }
    };
    fetchUserData();

    const handleUpdate = () => {
      fetchUserData();
    };

    window.addEventListener("tokens-updated", handleUpdate);
    
    const handleOpenPrefs = (e: any) => {
      const redirectTo = e.detail?.redirectTo;
      redirectUrlRef.current = redirectTo || null;
      setShowPreferencesModal(true);
    };
    window.addEventListener("open-preferences-modal", handleOpenPrefs);

    return () => {
      window.removeEventListener("tokens-updated", handleUpdate);
      window.removeEventListener("open-preferences-modal", handleOpenPrefs);
    };
  }, [user, pathname, displayedTokens, tokens]); // Added tokens to dependencies for fetchTokens to compare correctly

  const handleClosePrefs = () => {
    const redirectTo = redirectUrlRef.current;
    setShowPreferencesModal(false);
    if (redirectTo) {
      router.push(redirectTo);
      redirectUrlRef.current = null;
    }
  };

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

  useEffect(() => {
    if (user && pathname.startsWith("/give-feedback")) {
      const isExplained = getCookie("fbCreditExplained");
      if (!isExplained) {
        setShowTokensInfo(true);
        setCookie("fbCreditExplained", "true", 365);
      }
    }
  }, [pathname, user]);

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
                        <div className={styles.headerTitleGroup}>
                          <HelpCircle size={18} className={styles.helpIcon} />
                          <h3>איך עובד מנגנון הקרדיטים?</h3>
                        </div>
                        <button
                          className={styles.closePopupButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTokensInfo(false);
                          }}
                          aria-label="סגור"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <p>שליחת שיר מורידה מתווי הקרדיט שלך. כדי לצבור תווי קרדיט חדשים, פשוט תנו פידבק לשירים של יוצרים אחרים בקהילה.</p>
                      <div className={styles.popupArrow} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <UserButton afterSignOutUrl="/">
              <UserButton.MenuItems>
                <UserButton.Action
                  label="העדפות משתמש"
                  labelIcon={<UserIcon size={16} />}
                  onClick={() => setShowPreferencesModal(true)}
                />
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
                {user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL && (
                  <UserButton.Link
                    label="דוחות מנהל"
                    labelIcon={<BarChart size={16} />}
                    href="/admin/reports"
                  />
                )}
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
        </div>
      </div>
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
      <UserPreferencesModal
        isOpen={showPreferencesModal}
        onClose={handleClosePrefs}
        initialGenre={userGenre}
      />
    </nav>
  );
}
