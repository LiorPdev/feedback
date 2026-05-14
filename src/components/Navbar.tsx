"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import ContactModal from "./ContactModal";
import InfoTooltip from "./InfoTooltip";
import Image from "next/image";
import { Bell } from "lucide-react";
import { getUserData } from "@/app/actions/user";
import { getUserSongCount } from "@/app/actions/songs";
import { getMyGivenFeedbacksCount } from "@/app/actions/feedback";
import { logAction } from "@/app/actions/logs";
import UserPreferencesModal from "./UserPreferencesModal";
import CreditTransferModal from "./CreditTransferModal";
import styles from "./Navbar.module.css";
import AnimatedTokenCounter from "./AnimatedTokenCounter";
import { GiPodium } from "react-icons/gi";
import CopyToast from "./CopyToast";
import { useShare } from "@/hooks/useShare";
import UserMenu from "./UserMenu";
import RegistrationGate from "./RegistrationGate";
import { RegistrationGateOptions } from "@/lib/auth-events";
import { useAuth } from "@clerk/nextjs";
import Button from "./ui/Button";
import { useUtmMode } from "@/hooks/useUtmMode";
import { SONG_SUBMISSION_COST } from "@/lib/constants";

interface NavbarProps {
  isLoggedIn: boolean;
  initialTokens: number;
  isAdmin: boolean;
}

export default function Navbar({ isLoggedIn, initialTokens, isAdmin }: NavbarProps) {
  const pathname = usePathname();
  const { userId, isLoaded: authLoaded } = useAuth();
  const [tokens, setTokens] = useState<number | null>(isLoggedIn ? initialTokens : null);
  const [displayedTokens, setDisplayedTokens] = useState<number | null>(isLoggedIn ? initialTokens : null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [unreadSongsCount, setUnreadSongsCount] = useState<number>(0);
  const [firstUnreadSlug, setFirstUnreadSlug] = useState<string | null>(null);
  const [glowMode, setGlowMode] = useState<"positive" | "negative" | null>(null);
  const [showTokensInfo, setShowTokensInfo] = useState(false);
  const [showUnreadInfo, setShowUnreadInfo] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [hasSongs, setHasSongs] = useState(false);
  const [hasFeedbacksGiven, setHasFeedbacksGiven] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [gateOptions, setGateOptions] = useState<RegistrationGateOptions>({ type: "give-feedback" });
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const redirectUrlRef = useRef<string | null>(null);
  const tokenTriggerRef = useRef<HTMLDivElement>(null);
  const unreadTriggerRef = useRef<HTMLAnchorElement>(null);
  const router = useRouter();
  const { share, copied } = useShare();
  const { isUtmMode } = useUtmMode();

  // Sync server state with client state if mismatch detected
  useEffect(() => {
    if (authLoaded && !!userId !== isLoggedIn) {
      router.refresh();
    }
  }, [authLoaded, userId, isLoggedIn, router]);

  // 1. Data Fetching Effect (On mount/login)
  useEffect(() => {
    const fetchUserData = async () => {
      if (isLoggedIn) {
        try {
          const [result, songResult, feedbackCount] = await Promise.all([
            getUserData(),
            getUserSongCount(),
            getMyGivenFeedbacksCount()
          ]);

          if (result.success) {
            if (result.tokens !== undefined) {
              setTokens(prev => {
                if (prev !== null && result.tokens !== prev) {
                  setGlowMode(result.tokens > prev ? "positive" : "negative");
                }
                return result.tokens;
              });
              setDisplayedTokens(prev => prev === null ? result.tokens : prev);
            }
            if (result.unreadFeedbacksCount !== undefined) {
              setUnreadCount(result.unreadFeedbacksCount);
            }
            if (result.uniqueSongsCount !== undefined) {
              setUnreadSongsCount(result.uniqueSongsCount);
            }
            if (result.firstUnreadSongSlug !== undefined) {
              setFirstUnreadSlug(result.firstUnreadSongSlug);
            }
          }

          setHasSongs(songResult.success && songResult.count > 0);
          setHasFeedbacksGiven(feedbackCount > 0);
        } catch (e) {
          logAction({
            message: "Failed to fetch user data in Navbar",
            data: { error: e instanceof Error ? e.message : String(e) },
            source: "Navbar.tsx:fetchUserData"
          });
        }
      }
    };

    fetchUserData();
  }, [isLoggedIn]);

  // 2. Event Listeners Effect
  useEffect(() => {
    const handleUpdate = async () => {
      if (isLoggedIn) {
        const [result, songResult, feedbackCount] = await Promise.all([
          getUserData(),
          getUserSongCount(),
          getMyGivenFeedbacksCount()
        ]);
        
        if (result.success) {
          if (result.tokens !== undefined) {
            setTokens(prev => {
              if (prev !== null && result.tokens !== prev) {
                setGlowMode(result.tokens > prev ? "positive" : "negative");
              }
              return result.tokens;
            });
          }
          if (result.unreadFeedbacksCount !== undefined) {
            setUnreadCount(result.unreadFeedbacksCount);
          }
          if (result.uniqueSongsCount !== undefined) {
            setUnreadSongsCount(result.uniqueSongsCount);
          }
          if (result.firstUnreadSongSlug !== undefined) {
            setFirstUnreadSlug(result.firstUnreadSongSlug);
          }
        }
        setHasSongs(songResult.success && songResult.count > 0);
        setHasFeedbacksGiven(feedbackCount > 0);
      }
    };

    window.addEventListener("tokens-updated", handleUpdate);
    window.addEventListener("feedbacks-updated", handleUpdate);

    const handleOpenPrefs = (e: Event) => {
      const customEvent = e as CustomEvent<{ redirectTo?: string }>;
      const redirectTo = customEvent.detail?.redirectTo;
      redirectUrlRef.current = redirectTo || null;
      setShowPreferencesModal(true);
    };
    window.addEventListener("open-preferences-modal", handleOpenPrefs);

    const handleOpenAuth = (e: Event) => {
      const customEvent = e as CustomEvent<RegistrationGateOptions>;
      setGateOptions(customEvent.detail);
      setShowRegistrationModal(true);
    };
    window.addEventListener("open-registration-gate", handleOpenAuth);

    return () => {
      window.removeEventListener("tokens-updated", handleUpdate);
      window.removeEventListener("feedbacks-updated", handleUpdate);
      window.removeEventListener("open-preferences-modal", handleOpenPrefs);
      window.removeEventListener("open-registration-gate", handleOpenAuth);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (pendingRedirect && !showPreferencesModal) {
      router.push(pendingRedirect);
      setTimeout(() => setPendingRedirect(null), 0);
    }
  }, [pendingRedirect, showPreferencesModal, router]);

  const handleClosePrefs = () => {
    const redirectTo = redirectUrlRef.current;
    setShowPreferencesModal(false);

    if (redirectTo) {
      setPendingRedirect(redirectTo);
      redirectUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (tokens !== null && displayedTokens !== null && tokens !== displayedTokens) {
      const updateTimer = setTimeout(() => {
        setDisplayedTokens(tokens);
      }, 1200);

      return () => clearTimeout(updateTimer);
    }
  }, [tokens, displayedTokens]);

  useEffect(() => {
    if (glowMode) {
      const stopGlowTimer = setTimeout(() => {
        setGlowMode(null);
      }, 2500);

      return () => clearTimeout(stopGlowTimer);
    }
  }, [glowMode]);

  const handleShare = () => {
    share({
      title: 'פידבק ספייס',
      text: 'מוזמנים להצטרף אלי ולתת פידבק על שירים בקהילת פידבק ספייס!',
      url: window.location.origin,
    });
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      const scrollContainer = document.querySelector(".scroll-container");
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.logo} onClick={handleLogoClick}>
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
          {!isLoggedIn && !userId && !isUtmMode && (
            <Button
              variant="outline"
              className={styles.loginBtn}
              onClick={() => {
                setGateOptions({ type: "minimal" });
                setShowRegistrationModal(true);
              }}
            >
              התחברות
            </Button>
          )}
          {(isLoggedIn || userId) && (
            <Link href="/top-rated" className={styles.navLink} title="היכל התהילה">
              <GiPodium size={26} />
            </Link>
          )}
          {(isLoggedIn || userId) && (
            <>
              {tokens !== null && (
                <div className={styles.tokenWrapper}>
                  <div
                    className={`${styles.tokenDisplay} ${glowMode === "positive" ? styles.glowingPositive : glowMode === "negative" ? styles.glowingNegative : ""}`}
                    title="לחצו להסבר על הקרדיטים"
                    onClick={() => setShowTokensInfo(!showTokensInfo)}
                    ref={tokenTriggerRef}
                  >
                    <AnimatedTokenCounter value={displayedTokens ?? 0} />
                  </div>

                  <InfoTooltip
                    isOpen={showTokensInfo}
                    onClose={() => setShowTokensInfo(false)}
                    title="איך עובד מנגנון הקרדיטים?"
                    content={
                      <p>העלאת שיר וצפיה בפידבק מורידה {SONG_SUBMISSION_COST} תווי קרדיט. כדי לצבור תווי קרדיט חדשים, פשוט תנו פידבק לשירים של יוצרים אחרים בקהילה.</p>
                    }
                    arrowPosition="left"
                    align="left"
                    triggerRef={tokenTriggerRef}
                  />
                </div>
              )}

              {unreadCount > 0 && (
                <div className={styles.tokenWrapper}>
                  <Link
                    href={unreadSongsCount === 1 && firstUnreadSlug ? `/show-feedback/${firstUnreadSlug}` : "/dashboard?tab=songs"}
                    className={styles.unreadBadge}
                    onClick={() => setShowUnreadInfo(!showUnreadInfo)}
                    ref={unreadTriggerRef}
                  >
                    <Bell size={16} fill="currentColor" />
                  </Link>

                  <InfoTooltip
                    isOpen={showUnreadInfo}
                    onClose={() => setShowUnreadInfo(false)}
                    title={`מחכים לך ${unreadCount} פידבקים חדשים!`}
                    content={
                      <p></p>
                    }
                    arrowPosition="left"
                    align="left"
                    triggerRef={unreadTriggerRef}
                    showIcon={false}
                    arrowOffset={14}
                    forceRelative={true}
                    autoCloseMs={2000}
                  />
                </div>
              )}

              <UserMenu
                isAdmin={isAdmin}
                onOpenPreferences={() => setShowPreferencesModal(true)}
                onOpenContact={() => setShowContactModal(true)}
                onOpenCreditTransfer={() => setShowCreditModal(true)}
                onShare={handleShare}
                hasSongs={hasSongs}
                hasFeedbacksGiven={hasFeedbacksGiven}
              />
            </>
          )}
        </div>
      </div>

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
      <UserPreferencesModal
        isOpen={showPreferencesModal}
        onClose={handleClosePrefs}
      />
      <CreditTransferModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        currentTokens={tokens ?? 0}
      />
      <RegistrationGate
        isOpen={showRegistrationModal}
        type={gateOptions.type}
        redirectUrl={gateOptions.redirectUrl}
        userEmail={gateOptions.userEmail}
        forceShowForm={gateOptions.forceShowForm}
        onClose={() => {
          setShowRegistrationModal(false);
          if (gateOptions.onClose) gateOptions.onClose();
        }}
        onSuccess={() => {
          setShowRegistrationModal(false);
          if (gateOptions.onSuccess) {
            gateOptions.onSuccess();
          } else {
            window.location.reload();
          }
        }}
      />
      <CopyToast isVisible={copied} />
    </nav>
  );
}
