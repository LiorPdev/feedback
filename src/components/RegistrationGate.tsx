"use client";

import React from "react";
import AuthOverlay from "./AuthOverlay";
import styles from "./RegistrationGate.module.css";

export type GateType = "give-feedback" | "get-feedback" | "complete-registration" | "minimal";

interface RegistrationGateProps {
  isOpen: boolean;
  type: GateType;
  onClose: () => void;
  onDismiss?: () => void;
  isModal?: boolean;
  userEmail?: string;
  redirectUrl?: string;
}

export default function RegistrationGate({
  isOpen,
  type,
  onClose,
  isModal = true,
  userEmail,
  redirectUrl
}: RegistrationGateProps) {
  if (!isOpen) return null;

  const messages: Record<GateType, React.ReactNode> = {
    "give-feedback": (
      <>
        <strong>הפידבק שלך ממש חשוב לנו</strong>{"\n\n"}
        אבל כדי שלא נציג לך שוב ושוב שירים שכבר דירגת, בואו נתחבר בקליק.{"\n\n"}
        הדירוגים שלך אנונימיים לחלוטין.
      </>
    ),
    "get-feedback": (
      <>
        <strong className={styles.fullText}>אנחנו יודעים, להירשם זה מבאס...</strong>
        <strong className={styles.shortText}>יודעים, להירשם זה מבאס...</strong>
        {"\n\n"}
        אבל בלי זה, אין לנו דרך לשייך את השיר אליך או לשלוח לך את התגובות שהקהילה תכתוב. מתחברים בקלות וממשיכים.{"\n"}
      </>
    ),
    "complete-registration": (
      <>
        <strong>אנא הקפידו להתחבר עם המייל</strong>{"\n"}
        <strong>אשר איתו נרשמתם</strong>{"\n"}
        {userEmail && <span style={{ color: '#b5b5b5', fontWeight: 'normal', fontSize: '0.9rem', display: 'block' }}>{userEmail}</span>}
      </>
    ),
    "minimal": "\n",
  };

  const message = messages[type];

  return (
    <AuthOverlay
      isModal={isModal}
      message={message}
      onClose={onClose}
      redirectUrl={redirectUrl}
    />
  );
}
