"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import styles from "./LandingClient.module.css";
import { useState, useEffect } from "react";
import { getUserSongCount } from "@/app/actions/songs";
import { getMyGivenFeedbacksCount } from "@/app/actions/feedback";
import { getUserData } from "@/app/actions/user";
import Footer from "./Footer";
import HeroGallery, { CommunityStats } from "./HeroGallery";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}
import { useRouter, useSearchParams } from "next/navigation";
import { GiPodium } from "react-icons/gi";
import Image from "next/image";
import PageHeader from "./PageHeader";
import Button from "./ui/Button";
import { useUtmMode } from "@/hooks/useUtmMode";
import FeedbacksTypewriter from "./FeedbacksTypewriter";
import { openRegistrationGate } from "@/lib/auth-events";

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
  initialCommunityStats = null
}: {
  isLoggedIn?: boolean,
  isClerkUser?: boolean,
  initialHasSongs?: boolean,
  initialGenre?: string,
  initialHasFeedbacksGiven?: boolean,
  initialCommunityStats?: CommunityStats | null
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasSongs, setHasSongs] = useState(initialHasSongs);
  const [hasFeedbacksGiven, setHasFeedbacksGiven] = useState(initialHasFeedbacksGiven);
  const [userGenre, setUserGenre] = useState(initialGenre);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const { isUtmMode, utmSource } = useUtmMode();

  useEffect(() => {
    const handleUpdate = async () => {
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
      openRegistrationGate({
        type: isLoggedIn ? "complete-registration" : "get-feedback",
        redirectUrl: "/get-feedback",
        userEmail: userEmail
      });
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
      openRegistrationGate({
        type: isLoggedIn ? "complete-registration" : "give-feedback",
        redirectUrl: "/give-feedback",
        userEmail: userEmail
      });
    }
  };

  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className={styles.landingPage}>

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.heroWrapper}>
          <motion.div
            className={styles.heroContent}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className={styles.heroHeaderWrapper}>
              <PageHeader
                title="מישהו מקשיב לך"
                variant="hero"
                hideDivider
                align="center"
              />
            </motion.div>
            {!isLoggedIn && (
              <motion.div className={styles.howItWorks} variants={fadeInUp}>
                <h3>איך זה עובד?</h3>
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

          <FeedbacksTypewriter
            className={styles.feedbacksTicker}
          />

          <motion.div
            className={styles.heroMockup}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <HeroGallery
              initialData={initialCommunityStats}
              isLoggedIn={isLoggedIn}
              onUnauthorizedClick={() => openRegistrationGate({ type: "give-feedback" })}
            />
          </motion.div>
        </div>
      </header>

      {/* Video Section for unregistered users */}
      {!isLoggedIn && (
        <section className={styles.videoSection}>
          <div className={styles.videoSectionContent}>
            <motion.h2
              className={styles.sectionTitle}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              איך זה עובד?
            </motion.h2>
            <motion.div
              className={styles.videoContainerLarge}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className={styles.videoWrapperLarge}>
                {!showVideo ? (
                  <div
                    className={styles.videoThumbnailLarge}
                    onClick={() => setShowVideo(true)}
                  >
                    <Image
                      src="https://img.youtube.com/vi/4kxbf8gNDzk/maxresdefault.jpg"
                      alt="Play Video"
                      className={styles.thumbnailImageLarge}
                      width={1280}
                      height={720}
                      loading="lazy"
                      unoptimized
                    />
                    <div className={styles.playButtonLarge}>
                      <svg viewBox="0 0 24 24" width="64" height="64" fill="white">
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
            </motion.div>
          </div>
        </section>
      )}

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
                title: "קהילה של יוצרים",
                desc: "המערכת פתוחה לכולם וללא שום עלות. פשוט מרחב שיתופי שבו אנחנו עוזרים אחד לשני להשתפר, לדייק את היצירה ולגדול יחד.",
                icon: <CheckCircle />
              },
              {
                title: "חוות דעת אובייקטיבית",
                desc: "לפעמים 'לייק' מחברים זה לא מספיק כדי לצמוח. כאן תקבלו נקודת מבט ממוזיקאים וממאזינים שאוהבים מוזיקה כמוכם. השיח מקצועי ומתמקד רק בדבר אחד: איך אתם יכולים להשתפר עוד ועוד.",
                icon: <CheckCircle />
              },
              {
                title: "פידבק אנונימי",
                desc: "אנונימיות היא הסוד לדיוק היצירה. היא מאפשרת למאזינים להעניק לכם משוב כנה וישיר, בלי ה'לא נעים' של חברים. זה המקום לקבל תשובות אמיתיות על מה עובד בשיר ומה דורש ליטוש.",
                icon: <CheckCircle />
              },
              {
                title: "מרחב בטוח ומכבד",
                desc: "בקהילה שלנו אין מקום לביקורת פוגענית. הקהילה שלנו מורכבת מיוצרים בדיוק כמוכם, שמגיעים עם רצון אמיתי לעזור, לתרום ולצמוח יחד.",
                icon: <CheckCircle />
              },
              {
                title: "לבחור את השיר הנכון",
                desc: "מתלבטים איזה שיר כדאי לקדם? איזה שיר להוציא כסינגל? לא בטוחים איזה עיבוד עובד טוב יותר? העלו מספר שירים או גירסאות שונות ותראו מה אחרים חושבים. הפידבקים יעזרו לכם להשקיע את האנרגיה והתקציב שלכם בשירים עם הפוטנציאל הגבוה ביותר להצליח.",
                icon: <CheckCircle />
              },
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
