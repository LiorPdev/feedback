"use client";

import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Button from "../ui/Button";
import { logAction } from "@/app/actions/logs";
import styles from "./UnifiedAuthForm.module.css";

type AuthStep = "IDENTIFY" | "VERIFY";

interface UnifiedAuthFormProps {
  onSuccess?: () => void;
  onStepChange?: (step: AuthStep) => void;
  redirectUrl?: string;
}

export default function UnifiedAuthForm({ onSuccess, onStepChange, redirectUrl }: UnifiedAuthFormProps) {
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [step, setStep] = useState<AuthStep>("IDENTIFY");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signIn" | "signUp" | null>(null);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInLoaded || !signUpLoaded || !email || !signIn || !signUp) return;

    setLoading(true);
    setError(null);

    try {
      // First, try to sign in
      try {
        const result = await signIn.create({ identifier: email });

        if (result.status === "needs_first_factor") {
          // User exists, send code
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const factor = (result.supportedFirstFactors as any[]).find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (f: any) => f.strategy === "email_code"
          );

          if (factor && "emailAddressId" in factor) {
            await signIn.prepareFirstFactor({
              strategy: "email_code",
              emailAddressId: factor.emailAddressId,
            });
            setMode("signIn");
            setStep("VERIFY");
            onStepChange?.("VERIFY");
          } else {
            setError("משהו השתבש בשליחת הקוד. נסו שוב.");
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        // If user not found, try to sign up
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isUserNotFound = err.errors?.some((errorItem: any) => errorItem.code === "form_identifier_not_found");

        if (isUserNotFound) {
          await signUp.create({ emailAddress: email });
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setMode("signUp");
          setStep("VERIFY");
          onStepChange?.("VERIFY");
        } else {
          logAction({ message: "SignIn Error", data: err, source: "UnifiedAuthForm:handleIdentify" });
          setError(err.errors?.[0]?.message || "ארעה שגיאה בחיבור.");
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logAction({ message: "Auth Error", data: err, source: "UnifiedAuthForm:handleIdentify" });
      setError(err.errors?.[0]?.message || "ארעה שגיאה. בדקו את המייל ונסו שוב.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!signInLoaded || !signUpLoaded || !code || loading || !signIn || !signUp) return;

    const cleanCode = code.trim();
    if (!cleanCode) return;

    setLoading(true);
    setError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processError = (err: any) => {
      console.warn("Caught Clerk error safely:", err);
      const message = (err.errors?.[0]?.message || err.message || "").toLowerCase().trim();
      let displayMessage = "ארעה שגיאה באימות. נסו שוב מאוחר יותר.";

      if (message.includes("incorrect") || message.includes("invalid")) {
        displayMessage = "קוד האימות אינו תקין. בדקו שוב את המייל.";
      } else if (message.includes("expired")) {
        displayMessage = "פג תוקף קוד האימות. חזרו אחורה ושלחו קוד חדש.";
      } else if (message.includes("too many attempts")) {
        displayMessage = "ניסיתם יותר מדי פעמים. המתינו כמה דקות ונסו שוב.";
      } else if (err.errors?.[0]?.message) {
        displayMessage = err.errors[0].message;
      }

      setError(displayMessage);
      setLoading(false);
    };

    // Using a self-contained async block to avoid any bubble-up
    (async () => {
      try {
        if (mode === "signIn" && signIn) {
          const result = await signIn.attemptFirstFactor({
            strategy: "email_code",
            code: cleanCode,
          });
          if (result.status === "complete") {
            await setSignInActive({ session: result.createdSessionId });
            onSuccess?.();
          } else {
            setLoading(false);
          }
        } else if (mode === "signUp" && signUp) {
          const result = await signUp.attemptEmailAddressVerification({
            code: cleanCode,
          });
          if (result.status === "complete") {
            await setSignUpActive({ session: result.createdSessionId });
            onSuccess?.();
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        processError(err);
      }
    })().catch(processError);
  };

  const handleGoogleLogin = async () => {
    if (!signInLoaded || !signIn) return;
    try {
      const targetUrl = redirectUrl || "/";
      if (typeof window !== "undefined") {
        sessionStorage.setItem("sso_callback_url", targetUrl);
      }
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: targetUrl,
      });
    } catch (err) {
      logAction({ message: "Google Auth Error", data: err, source: "UnifiedAuthForm:handleGoogleLogin" });
    }
  };

  return (
    <>
      <div className={styles.container}>
        {step === "IDENTIFY" ? (
          <>
            <Button
              variant="outline"
              onClick={handleGoogleLogin}
              className={styles.googleButton}
              fullWidth
            >
              <div className={styles.googleIconWrapper}>
                <Image
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  width={18}
                  height={18}
                  className={styles.googleIcon}
                />
              </div>
              <span className={styles.googleButtonTextFull}>ממשיכים בקליק עם Google</span>
              <span className={styles.googleButtonTextShort}>מתחברים עם Google</span>
            </Button>

            <div className={styles.divider}>
              <div className={styles.dividerLine}>
                <span />
              </div>
              <div className={styles.dividerTextContainer}>
                <span className={styles.dividerText}>או</span>
              </div>
            </div>

            <form onSubmit={handleIdentify} className={styles.form}>
              <label htmlFor="email" className={styles.label}>ממשיכים עם דוא״ל</label>
              <div className={styles.inlineForm}>
                <div className={styles.inputGroup}>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('אנא הזינו כתובת אימייל תקינה')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    className={styles.input}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "אישור"}
                </Button>
              </div>

              {error && <p className={styles.error}>{error}</p>}
            </form>
          </>
        ) : (
          <>
            <div className={styles.header}>
              <h2 className={styles.title}>אימות חשבון</h2>
              <p className={styles.subtitle}>שלחנו קוד לכתובת {email}</p>
            </div>

            <form onSubmit={handleVerify} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="code" className={styles.label}>קוד אימות</label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="······"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('אנא הזינו את קוד האימות שקיבלתם')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className={`${styles.input} ${styles.codeInput}`}
                  maxLength={6}
                  required
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <Button
                type="submit"
                variant="outline"
                disabled={loading}
                fullWidth
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "אימות וכניסה"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("IDENTIFY");
                  setError(null);
                  onStepChange?.("IDENTIFY");
                }}
                className={styles.backButton}
              >
                <ArrowLeft className={styles.backIcon} />
                חזרה להזנת מייל
              </button>
            </form>
          </>
        )}
      </div>
      <div id="clerk-captcha" />
    </>
  );
}
