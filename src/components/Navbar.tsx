"use client";

import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Music, Home } from "lucide-react";
import { getUserTokens } from "@/app/actions/songs";
import styles from "./Navbar.module.css";
import AnimatedTokenCounter from "./AnimatedTokenCounter";

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [tokens, setTokens] = useState<number | null>(null);
  const [isGlowing, setIsGlowing] = useState(false);
  const prevTokens = useRef<number | null>(null);

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
    if (prevTokens.current !== null && tokens !== null && prevTokens.current !== tokens) {
      setIsGlowing(true);
      const timer = setTimeout(() => setIsGlowing(false), 3000);
      return () => clearTimeout(timer);
    }
    if (tokens !== null) {
      prevTokens.current = tokens;
    }
  }, [tokens]);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.logo}>
          <img
            src="/Logo.png?v=2"
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
              <Home size={20} />
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
              <div className={`${styles.tokenDisplay} ${isGlowing ? styles.glowing : ""}`} title="יתרת תווי קרדיט">
                <AnimatedTokenCounter value={tokens} />
                <div className={styles.tokenIcon}>
                  <Music size={14} />
                </div>
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
