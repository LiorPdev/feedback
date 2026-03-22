"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { CheckCircle, BarChart3 } from "lucide-react";
import Image from "next/image";
import styles from "@/app/landing.module.css";
import { useState, useEffect } from "react";
import { getUserSongCount } from "@/app/actions/songs";
import Footer from "./Footer";

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

export default function LandingClient() {
  const { user, isLoaded } = useUser();
  const [hasSongs, setHasSongs] = useState(false);

  useEffect(() => {
    async function checkSongs() {
      if (isLoaded && user) {
        const result = await getUserSongCount(user.id);
        if (result.success && result.count > 0) {
          setHasSongs(true);
        }
      }
    }
    checkSongs();
  }, [user, isLoaded]);

  return (
    <div className={styles.landingPage}>
      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={`${styles.blob} ${styles.blob1}`} />
          <div className={`${styles.blob} ${styles.blob2}`} />
        </div>
        <div className={styles.heroWrapper}>
          <motion.div
            className={styles.heroContent}
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.h1 className={styles.heroTitle} variants={fadeInUp}>
              פידבק אמיתי <br />
              <span style={{ color: "var(--brand-contrast)" }}>ההצלחה שלך</span>
            </motion.h1>
            <motion.p className={styles.heroSubtitle} variants={fadeInUp}>
              קהילה לקבלת משוב אמיתי על היצירות שלנו
            </motion.p>
            <motion.div className={styles.howItWorks} variants={fadeInUp}>
              <h3>איך זה עובד?</h3>
              <p>אתם מעלים יצירה כדי לקבל משוב כנה מאנשי הקהילה וגם נותנים פידבק אנונימי לאחרים כדי לעזור להם להשתפר.</p>
            </motion.div>
            <motion.div className={styles.heroButtons} variants={fadeInUp}>
              <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl="/get-feedback">
                  <button className={styles.btnPrimary}>
                    אני רוצה לקבל פידבק
                  </button>
                </SignInButton>
                <SignInButton mode="modal" forceRedirectUrl="/give-feedback">
                  <button className={styles.btnSecondary}>
                    אני רוצה לתת פידבק
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <button
                  className={styles.btnPrimary}
                  onClick={() => window.location.href = hasSongs ? "/dashboard" : "/get-feedback"}
                >
                  {hasSongs ? "האיזור האישי שלי" : "אני רוצה לקבל פידבק"}
                </button>
                <Link href="/give-feedback" className={styles.btnSecondary}>
                  אני רוצה לתת פידבק
                </Link>
              </SignedIn>
            </motion.div>
          </motion.div>

          <motion.div
            className={styles.heroMockup}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className={styles.mockupImage} style={{ position: "relative", width: "100%", aspectRatio: "16/10", overflow: "hidden", borderRadius: "20px" }}>
              <Image
                src="/mockup.webp"
                alt="Feedback Flow Dashboard"
                fill
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          </motion.div>
        </div>

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
                title: "דעה כנה, לא רק 'לייק' כדי לצאת ידי חובה",
                desc: "נמאס לקבל לייקים רק כי לא נעים להם להגיד את האמת? כאן תקבל חוות דעת מאנשים שלא מכירים אותך ולא חייבים לך כלום. פשוט פידבק אנונימי כנה שיעזור לך להשתפר.",
                icon: <CheckCircle />
              },
              {
                title: "פידבק אנונימי",
                desc: "כשלא יודעים מי כתב את הפידבק, אין אגו ואין חששות. האנונימיות מאפשרת לאנשים לתת ביקורת בונה בלי לסנן מילים. לפעמים זה עלול להיות קצת מאתגר אבל זה בדיוק מה שיקדם אותך.",
                icon: <CheckCircle />
              },
              {
                title: "החלטות מבוססות נתונים",
                desc: "מתלבטים איזה שיר להוציא כסינגל? לא בטוחים איזה עיבוד עובד טוב יותר? העלו מספר שירים או גרסאות וגלו מה הקהל מעדיף באמת. הפידבקים יעזרו לכם להחליט במה להשקיע ואיזה שיר הכי כדאי לקדם.",
                icon: <CheckCircle />
              },
              {
                title: "פשוט ובחינם לגמרי",
                desc: "מערכת פתוחה לכולם בחינם לגמרי. בלי הרשמות מסובכות וללא תשלום – פשוט מקום שנועד לעזור ליוצרים לקבל משוב ולקדם אחד את השני.",
                icon: <CheckCircle />
              },
              {
                title: "חשיפה בפלייליסטים",
                desc: "השירים שאתם הכי אהבתם יצורפו לפלייליסטים עם אלפי עוקבים.",
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
