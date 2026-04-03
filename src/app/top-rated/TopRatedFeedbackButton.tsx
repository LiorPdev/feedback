"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./top-rated.module.css";
import PopupMsg from "@/components/PopupMsg";
import { AlertCircle } from "lucide-react";

interface TopRatedFeedbackButtonProps {
  songSlug: string;
  songUserId: string;
  currentUserId: string | null;
}

export default function TopRatedFeedbackButton({
  songSlug,
  songUserId,
  currentUserId,
}: TopRatedFeedbackButtonProps) {
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (currentUserId && songUserId === currentUserId) {
      setShowPopup(true);
      return;
    }

    router.push(`/give-feedback?song=${songSlug}&from=top-rated`);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={styles.giveFeedbackBtn}
        title="תנו פידבק לשיר"
      >
        <Image
          src="/Logo.png"
          alt="פידבק ספייס"
          width={20}
          height={20}
          className={styles.miniLogo}
        />
      </button>

      <PopupMsg
        isOpen={showPopup}
        onClose={() => setShowPopup(false)}
        icon={<AlertCircle size={40} color="var(--brand-primary)" />}
        title="המממ..."
        message="אי אפשר לדרג שיר שאתם העלתם :)"
        buttonText="הבנתי"
      />
    </>
  );
}
