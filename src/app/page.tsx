"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { CheckCircle, BarChart3, Users, ArrowRight } from "lucide-react";
import Image from "next/image";
import styles from "./landing.module.css";

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

export default function Home() {
  return (
    <div className={styles.landingPage}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <img
              src="/Logo.png?v=2"
              alt="פידבק ספייס"
              width={38}
              height={38}
              className={styles.logoImage}
            />
            <span>פידבק-ספייס</span>
          </div>
          <div className={styles.navLinks}>
            <SignedOut>
              <SignInButton mode="modal">
                <button className={styles.btnGoogle} style={{ padding: "0.5rem 1.2rem", fontSize: "0.95rem" }}>
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
              <span style={{ color: "var(--primary)" }}>ההצלחה שלך</span>
            </motion.h1>
            <motion.p className={styles.heroSubtitle} variants={fadeInUp}>
              מערכת לקבלת פידבקים אמיתיים על היצירות שלך
            </motion.p>
            <motion.div className={styles.howItWorks} variants={fadeInUp}>
              <h3>איך זה עובד?</h3>
              <p>בפידבק-ספייס אתה מעלה יצירה כדי לקבל משוב כנה מאנשי הקהילה, או נותן פידבק לאחרים כדי לעזור להם להשתפר.</p>
            </motion.div>
            <motion.div className={styles.heroButtons} variants={fadeInUp}>
              <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl="/get-feedback">
                  <button className={styles.btnPrimary}>
                    אני רוצה לקבל פידבק
                  </button>
                </SignInButton>
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className={styles.btnSecondary}>
                    אני רוצה לתת פידבק
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <button className={styles.btnPrimary} onClick={() => window.location.href = "/get-feedback"}>
                  אני רוצה לקבל פידבק
                </button>
                <button className={styles.btnSecondary} onClick={() => window.location.href = "/dashboard"}>
                  אני רוצה לתת פידבק
                </button>
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
                src="/feedback_dashboard_mockup_1773818196454.png"
                alt="Feedback Flow Dashboard"
                fill
                style={{ objectFit: "cover" }}
                priority
              />
              {!Image && (
                <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BarChart3 size={100} color="var(--primary)" opacity={0.2} />
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <motion.button
          className={styles.scrollDownFab}
          onClick={() => {
            const featuresSection = document.querySelector(`.${styles.features}`);
            featuresSection?.scrollIntoView({ behavior: 'smooth' });
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          transition={{
            opacity: { duration: 0.5, delay: 1 },
            y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
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
                title: "דעה כנה, לא 'לייק' מחברים",
                desc: "נמאס לקבל לייקים רק כי לא נעים להם להגיד את האמת? כאן תקבל חוות דעת מאנשים שלא מכירים אותך ולא חייבים לך כלום. פשוט פידבק כנה שיעזור לך להשתפר.",
                icon: <CheckCircle />
              },
              {
                title: "מרחב אנונימי לפידבק נקי",
                desc: "כשלא יודעים מי כתב את הפידבק, אין אגו ואין חששות. האנונימיות מאפשרת לאנשים לתת ביקורת בונה ומדויקת בלי לסנן מילים, כדי שתדעו בדיוק איפה היצירה שלכם עומדת.",
                icon: <CheckCircle />
              },
              {
                title: "פשוט ובחינם לגמרי",
                desc: "מערכת פתוחה לכולם בחינם לגמרי. בלי הרשמות מסובכות וללא תשלום – פשוט מקום שנועד לעזור ליוצרים לקבל משוב ולקדם אחד את השני.",
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

        {/* Footer inside features */}
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <p className={styles.copyright}>
              &copy; 2026 פידבק-ספייס | כל הזכויות שמורות | {" "}
              <a href="mailto:contact@feedback.activitywiz.com" className={styles.footerLink}>צור קשר</a>
            </p>
          </div>
        </footer>
      </section>
    </div>
  );
}