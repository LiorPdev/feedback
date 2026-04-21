"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import styles from "@/app/landing.module.css";
import { useState, useEffect } from "react";
import { getUserSongCount } from "@/app/actions/songs";
import { getMyGivenFeedbacksCount, getDisplayFeedbacksCount } from "@/app/actions/feedback";
import { getUserData } from "@/app/actions/user";
import Footer from "./Footer";
import HeroGallery from "./HeroGallery";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}
import { useRouter, useSearchParams } from "next/navigation";
import { GiPodium } from "react-icons/gi";
import Image from "next/image";
import RegistrationGate, { GateType } from "./RegistrationGate";
import PageHeader from "./PageHeader";
import Button from "./ui/Button";
import { useUtmMode } from "@/hooks/useUtmMode";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

export default function LandingClient({
  isLoggedIn = false,
  isClerkUser = false,
  initialHasSongs = false,
  initialGenre = "",
  initialHasFeedbacksGiven = false,
  totalFeedbacksCount: initialTotalFeedbacksCount = 0
}: {
  isLoggedIn?: boolean,
  isClerkUser?: boolean,
  initialHasSongs?: boolean,
  initialGenre?: string,
  initialHasFeedbacksGiven?: boolean,
  totalFeedbacksCount?: number
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasSongs, setHasSongs] = useState(initialHasSongs);
  const [hasFeedbacksGiven, setHasFeedbacksGiven] = useState(initialHasFeedbacksGiven);
  const [totalFeedbacksCount, setTotalFeedbacksCount] = useState(initialTotalFeedbacksCount);
  const [userGenre, setUserGenre] = useState(initialGenre);
  const [activeGate, setActiveGate] = useState<GateType | null>(null);
  const [targetRedirectUrl, setTargetRedirectUrl] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const { isUtmMode, utmSource } = useUtmMode();

  useEffect(() => {
    const handleUpdate = async () => {
      const totalCount = await getDisplayFeedbacksCount();
      setTotalFeedbacksCount(totalCount);

      if (isLoggedIn) {
        const [songResult, feedbackCount, userData] = await Promise.all([
          getUserSongCount(),
          getMyGivenFeedbacksCount(),
          getUserData()
        ]);

        setHasSongs(songResult.success && songResult.count > 0);
        setHasFeedbacksGiven(feedbackCount > 0);
        if (userData.success) {
          if (userData.userGenre) setUserGenre(userData.userGenre);
          if (userData.email) setUserEmail(userData.email);
        }
      }
    };

    handleUpdate();
    window.addEventListener("tokens-updated", handleUpdate);

    return () => {
      window.removeEventListener("tokens-updated", handleUpdate);
    };
  }, [isLoggedIn, searchParams]);

  const handleGetFeedbackClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    // Identify lead for Meta Ads if in UTM mode
    if (isUtmMode && typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Lead");
    }

    if (isClerkUser || isUtmMode) {
      const dest = `/get-feedback?backHome=true${utmSource ? `&utm_source=${utmSource}` : ""}`;
      router.push(dest);
    } else {
      setTargetRedirectUrl("/get-feedback");
      setActiveGate(isLoggedIn ? "complete-registration" : "get-feedback");
    }
  };

  const handleGiveFeedbackClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    if (isClerkUser || isUtmMode) {
      if (isLoggedIn && !userGenre) {
        window.dispatchEvent(new CustomEvent("open-preferences-modal", {
          detail: { redirectTo: "/give-feedback?backHome=true" }
        }));
      } else {
        const dest = `/give-feedback?backHome=true${utmSource ? `&utm_source=${utmSource}` : ""}`;
        router.push(dest);
      }
    } else {
      setTargetRedirectUrl("/give-feedback");
      setActiveGate(isLoggedIn ? "complete-registration" : "give-feedback");
    }
  };

  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className={styles.landingPage}>
      <RegistrationGate
        isOpen={!!activeGate}
        type={activeGate || "give-feedback"}
        onClose={() => {
          setActiveGate(null);
          setTargetRedirectUrl(undefined);
        }}
        userEmail={userEmail}
        redirectUrl={targetRedirectUrl}
      />

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.heroWrapper}>
          <motion.div
            className={styles.heroContent}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} style={{ width: '100%' }}>
              <PageHeader
                title="מישהו מקשיב לך"
                subtitle={<span className={styles.feedbackStat}>{totalFeedbacksCount} מוזיקאים בקהילה קיבלו פידבק ביממה האחרונה</span>}
                variant="hero"
                hideDivider
                align="center"
              />
            </motion.div>
            {!isLoggedIn && (
              <motion.div className={styles.howItWorks} variants={fadeInUp}>
                <h3 style={{ textAlign: "right", paddingRight: "0.7rem" }}>איך זה עובד?</h3>
                <ul className={styles.howItWorksList}>
                  <li><strong>מעלים</strong> שיר (קישור או קובץ)</li>
                  <li><strong>מקבלים</strong> חוות דעת כנה ואנונימית מהקהילה</li>
                  <li><strong>תורמים</strong> מהידע שלכם כדי לעזור לאחרים</li>
                </ul>
              </motion.div>
            )}
            <motion.div className={styles.heroButtons} variants={fadeInUp}>
              {!isLoggedIn ? (
                <>
                  <Button
                    onClick={handleGetFeedbackClick}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    אני רוצה לקבל פידבק
                  </Button>
                  <Button
                    onClick={handleGiveFeedbackClick}
                    variant="outline-brand"
                    size="lg"
                    fullWidth
                  >
                    אני רוצה לתת פידבק
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleGetFeedbackClick}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    {(hasSongs || hasFeedbacksGiven) ? "האיזור האישי שלי" : "אני רוצה לקבל פידבק"}
                  </Button>
                  <Button
                    variant="outline-brand"
                    size="lg"
                    fullWidth
                    onClick={handleGiveFeedbackClick}
                  >
                    אני רוצה לתת פידבק
                  </Button>
                </>
              )}
            </motion.div>

            <motion.div variants={fadeInUp} className={styles.topRatedLinkWrapper}>
              <Link href="/top-rated" className={styles.topRatedLink}>
                <GiPodium size={20} />
                <span>היכל התהילה</span>
              </Link>
            </motion.div>

          </motion.div>

          <motion.div
            className={styles.heroMockup}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {isLoggedIn ? (
              <HeroGallery />
            ) : (
              <div className={styles.videoWrapper}>
                {!showVideo ? (
                  <div
                    className={styles.videoThumbnail}
                    onClick={() => setShowVideo(true)}
                  >
                    <Image
                      src="https://img.youtube.com/vi/4kxbf8gNDzk/maxresdefault.jpg"
                      alt="Play Video"
                      className={styles.thumbnailImage}
                      width={1280}
                      height={720}
                      loading="eager"
                      unoptimized
                    />
                    <div className={styles.playButton}>
                      <svg viewBox="0 0 24 24" width="48" height="48" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <iframe
                    src="https://www.youtube.com/embed/4kxbf8gNDzk?autoplay=1&mute=0&loop=1&playlist=4kxbf8gNDzk"
                    title="מישהו מקשיב לך"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {!isLoggedIn && (
          <motion.button
            className={styles.scrollDownFab}
            onClick={() => {
              const featuresSection = document.querySelector(`.${styles.features}`);
              featuresSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{
              opacity: 1,
              y: [0, 15, 0],
              scale: [1, 1.1, 1],
              x: "-50%"
            }}
            transition={{
              opacity: { duration: 0.5, delay: 1 },
              y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
              scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
            }}
            aria-label="גלול למטה"
          >
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" d="m112 184 144 144 144-144"></path>
            </svg>
          </motion.button>
        )}
      </header>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresContent}>
          <motion.h2
            className={styles.sectionTitle}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            למה?
          </motion.h2>
          <motion.div
            className={styles.featuresGrid}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              {
                title: "פשוט ובחינם לגמרי",
                desc: "מערכת פתוחה לכולם. בלי הרשמות מסובכות וללא תשלום – פשוט מקום שנועד לעזור ליוצרים לקבל משוב ולקדם אחד את השני.",
                icon: <CheckCircle />
              },
              {
                title: "תובנות אמיתיות, לא רק 'לייק' כדי לצאת ידי חובה",
                desc: "במקום לייקים מנומסים, תקבלו כאן חוות דעת ממוזיקאים ואנשים שלא מכירים אותך ולא חייבים לך כלום. פשוט פידבק אנונימי אמיתי שיעזור לך להשתפר.",
                icon: <CheckCircle />
              },
              {
                title: "פידבק אנונימי",
                desc: "כשלא יודעים מי כתב את הפידבק, אין אגו ואין חששות. האנונימיות מאפשרת לאנשים לתת ביקורת בונה בלי לסנן מילים. לפעמים זה עלול להיות קצת מאתגר אבל זה בדיוק מה שיקדם אותך.",
                icon: <CheckCircle />
              },
              {
                title: "לבחור את השיר הנכון",
                desc: "מתלבטים איזה שיר כדאי לקדם? איזה שיר להוציא כסינגל? לא בטוחים איזה עיבוד עובד טוב יותר? העלו מספר שירים וגלו מה אחרים חושבים. הפידבקים יעזרו לכם לקבל החלטות מושכלות יותר.",
                icon: <CheckCircle />
              },
              {
                title: "שירים נבחרים יכנסו לפלייליסטים בספוטיפי",
                desc: (
                  <ul style={{ listStyleType: "none", padding: 0, marginTop: "0.5rem", textAlign: "center" }}>
                    <li style={{ marginBottom: "0.5rem" }}>
                      <a href="https://open.spotify.com/playlist/2pItlRIEcNpVrdrNPvTJiU?si=d2a588f23af24b08" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-primary)", textDecoration: "underline" }}>ישראלי שקט רגוע</a>
                    </li>
                    <li style={{ marginBottom: "0.5rem" }}>
                      <a href="https://open.spotify.com/playlist/6VOJdiNq1lGprqQLfOm7pl?si=290c5cc2422e481c" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-primary)", textDecoration: "underline" }}>ישראלי איכותי</a>
                    </li>
                    <li style={{ marginBottom: "0.5rem" }}>
                      <a href="https://open.spotify.com/playlist/36YoT388ljvJSssrC0LUMK?si=bc627ffb6efa43b0" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-primary)", textDecoration: "underline" }}>רוק ישראלי</a>
                    </li>
                    <li style={{ marginBottom: "0.5rem" }}>
                      <a href="https://open.spotify.com/playlist/0qYgjCnqOmG1WyJ3nZf841?si=31bf2145098d40fc" target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand-primary)", textDecoration: "underline" }}>אינדי ישראלי</a>
                    </li>
                  </ul>
                ),
                icon: <CheckCircle />
              }
            ].map((feature, idx) => (
              <motion.div key={idx} className={styles.featureCard} variants={fadeInUp}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <div className={styles.featureDesc}>{feature.desc}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
