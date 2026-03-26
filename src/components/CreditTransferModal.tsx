"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Download, Copy, Check, AlertCircle, Music, Loader2 } from "lucide-react";
import { generateCreditCode, redeemCreditCode } from "@/app/actions/user";
import { logAction } from "@/app/actions/logs";
import styles from "./CreditTransferModal.module.css";

interface CreditTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTokens: number;
}

export default function CreditTransferModal({
  isOpen,
  onClose,
  currentTokens,
}: CreditTransferModalProps) {
  const [activeTab, setActiveTab] = useState<"send" | "receive">("send");
  const [amount, setAmount] = useState<string>("10");
  const [code, setCode] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("send");
      setAmount("10");
      setCode("");
      setGeneratedCode(null);
      setLoading(false);
      setMessage(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleGenerateCode = async () => {
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > currentTokens) {
      setMessage({ text: "כמות לא תקינה או שאין לך מספיק קרדיטים", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await generateCreditCode(numAmount);
      if (result.success && result.code) {
        setGeneratedCode(result.code);
        setMessage({ text: `נוצר קוד על סך ${numAmount} קרדיטים`, type: "success" });
        // Trigger navbar update
        window.dispatchEvent(new CustomEvent("tokens-updated"));
      } else {
        setMessage({ text: result.error || "לא ניתן לייצר קוד כרגע", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "לא ניתן לייצר קוד כרגע", type: "error" });
      logAction({
        message: "Credit generation failure",
        data: { error: err instanceof Error ? err.message : String(err), amount: numAmount },
        source: "CreditTransferModal:handleGenerateCode"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!code || code.length < 4) {
      setMessage({ text: "אנא הזן קוד תקין", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await redeemCreditCode(code);
      if (result.success) {
        // Trigger navbar update
        window.dispatchEvent(new CustomEvent("tokens-updated"));

        // Close immediately as requested
        onClose();
      } else {
        setMessage({ text: result.error || "לא ניתן לממש את הקוד כרגע", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "לא ניתן לממש את הקוד כרגע", type: "error" });
      logAction({
        message: "Credit redemption failure",
        data: { error: err instanceof Error ? err.message : String(err), code },
        source: "CreditTransferModal:handleRedeemCode"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <motion.div
        className={styles.modalContent}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>שלח/קבל תווי קרדיט</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "send" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("send");
              setMessage(null);
              setGeneratedCode(null);
            }}
          >
            <Gift size={18} />
            שלח
          </button>
          <button
            className={`${styles.tab} ${activeTab === "receive" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("receive");
              setMessage(null);
            }}
          >
            <Download size={18} />
            קבל
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === "send" ? (
            <div className={styles.sendSection}>
              <div className={styles.tokenBalance}>
                הקרדיטים שלך: <span>{currentTokens}</span>
              </div>
              <div className={styles.inputGroup}>
                <label>כמות קרדיטים לשליחה</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    max={currentTokens}
                    placeholder="כמות"
                  />
                  <Music className={styles.inputIcon} size={18} />
                </div>
              </div>

              {!generatedCode ? (
                <button
                  className={styles.actionButton}
                  onClick={handleGenerateCode}
                  disabled={loading || !amount || parseInt(amount) <= 0 || parseInt(amount) > currentTokens}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "צור קוד לשליחה"}
                </button>
              ) : (
                <div className={styles.resultArea}>
                  <div className={styles.codeDisplay}>{generatedCode}</div>
                  <button className={styles.copyButton} onClick={copyToClipboard}>
                    {copied ? (
                      <>
                        <Check size={16} /> הועתק!
                      </>
                    ) : (
                      <>
                        <Copy size={16} /> העתק קוד
                      </>
                    )}
                  </button>
                  <button
                    style={{ fontSize: '0.8rem', background: 'none', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setGeneratedCode(null)}
                  >
                    שלח שוב
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.receiveSection}>
              <div className={styles.inputGroup}>
                <label>הזינו את הקוד שקיבלתם</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="XXXXX..."
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
              </div>
              <button
                className={styles.actionButton}
                onClick={handleRedeemCode}
                disabled={loading || !code}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : "מימוש הקוד"}
              </button>
            </div>
          )}

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`${styles.message} ${message.type === "success" ? styles.success : styles.error}`}
              >
                {message.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
