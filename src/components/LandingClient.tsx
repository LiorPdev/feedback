"use client";

import Link from "next/link";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import styles from "@/app/landing.module.css";
import { useState, useEffect } from "react";
import { getUserSongCount } from "@/app/actions/songs";
import Footer from "./Footer";
import AuthOverlay from "./AuthOverlay";
import HeroGallery from "./HeroGallery";
import { GiPodium } from "react-icons/gi";
import Image from "next/image";

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
  initialHasSongs = false,
  initialGenre = ""
}: {
  initialHasSongs?: boolean,
  initialGenre?: string
}) {
  const { user, isLoaded } = useUser();
  const [hasSongs, setHasSongs] = useState(initialHasSongs);
  const [userGenre, setUserGenre] = useState(initialGenre);
  const [authOverlay, setAuthOverlay] = useState<{ isOpen: boolean; message: React.ReactNode; redirectUrl?: string }>({
    isOpen: false,
    message: "",
  });

  useEffect(() => {
    async function checkUserData() {
      if (isLoaded && user) {
        const [songResult, userResult] = await Promise.all([
          getUserSongCount(user.id),
          (async () => {
            const { getUserData } = await import("@/app/actions/user");
            return getUserData(user.id);
          })()
        ]);

        if (songResult.success && songResult.count > 0) {
          setHasSongs(true);
        } else {
          setHasSongs(false);
        }

        if (userResult.success && userResult.userGenre) {
          setUserGenre(userResult.userGenre);
        }
      }
    }
    if (isLoaded) {
      checkUserData();
    }

    const handleUpdate = () => {
      checkUserData();
    };
    window.addEventListener("tokens-updated", handleUpdate);

    return () => {
      window.removeEventListener("tokens-updated", handleUpdate);
    };
  }, [user, isLoaded]);

  const handleGiveFeedbackClick = () => {
    if (user && !userGenre) {
      window.dispatchEvent(new CustomEvent("open-preferences-modal", {
        detail: { redirectTo: "/give-feedback" }
      }));
    }
  };

  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className={styles.landingPage}>
      <AnimatePresence>
        {authOverlay.isOpen && (
          <AuthOverlay
            isModal
            message={authOverlay.message}
            redirectUrl={authOverlay.redirectUrl}
            onClose={() => setAuthOverlay(prev => ({ ...prev, isOpen: false }))}
          />
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.heroWrapper}>
          <motion.div
            className={styles.heroContent}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.h1 className={styles.heroTitle} variants={fadeInUp}>
              <span style={{ color: "var(--brand-contrast)" }}>מישהו מקשיב לך</span>
            </motion.h1>
            <motion.p className={styles.heroSubtitle} variants={fadeInUp}>
              קבלו משוב אמיתי על השירים שלכם.
            </motion.p>
            <SignedOut>
              <motion.div className={styles.howItWorks} variants={fadeInUp}>
                <h3>איך זה עובד?</h3>
                <p>אתם שולחים שיר בצורה פשוטה ומקבלים פידבק מהקהילה באתר.</p>
              </motion.div>
            </SignedOut>
            <motion.div className={styles.heroButtons} variants={fadeInUp}>
              <SignedOut>
                <Link href="/get-feedback" className={styles.btnPrimary}>
                  אני רוצה לקבל פידבק
                </Link>
                <Link
                  href="/give-feedback"
                  className={styles.btnSecondary}
                >
                  אני רוצה לתת פידבק
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href={hasSongs ? "/dashboard" : "/get-feedback"}
                  className={styles.btnPrimary}
                >
                  {hasSongs ? "האיזור האישי שלי" : "אני רוצה לקבל פידבק"}
                </Link>
                {userGenre ? (
                  <Link
                    href="/give-feedback"
                    className={styles.btnSecondary}
                  >
                    אני רוצה לתת פידבק
                  </Link>
                ) : (
                  <button
                    className={styles.btnSecondary}
                    onClick={handleGiveFeedbackClick}
                  >
                    אני רוצה לתת פידבק
                  </button>
                )}
              </SignedIn>
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
            {isLoaded ? (
              user ? (
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
              )
            ) : (
              <div className={styles.heroPlaceholder} style={{ height: '300px' }} />
            )}
          </motion.div>
        </div>

        {isLoaded && !user && (
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
              }
            ].map((feature, idx) => (
              <motion.div key={idx} className={styles.featureCard} variants={fadeInUp}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
