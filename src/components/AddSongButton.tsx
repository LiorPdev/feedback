"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OctagonPause } from "lucide-react";
import Button from "./ui/Button";
import PopupMsg from "./PopupMsg";
import { MAX_ACTIVE_SONGS } from "@/lib/constants";

interface AddSongButtonProps {
  activeSongsCount: number;
  isBackHome?: boolean;
  className?: string;
  variant?: "primary" | "outline" | "headerActionBtn";
}

export default function AddSongButton({
  activeSongsCount,
  isBackHome,
  className,
  variant = "primary",
}: AddSongButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleClick = () => {
    if (activeSongsCount >= MAX_ACTIVE_SONGS) {
      setIsPopupOpen(true);
    } else {
      const backHomeParam = isBackHome || searchParams.get("backHome") === "true" ? "&backHome=true" : "";
      router.push(`/get-feedback?new=true${backHomeParam}`);
    }
  };

  if (variant === "headerActionBtn") {
    return (
      <>
        <button onClick={handleClick} className={className} type="button">
          הוספת שיר
        </button>
        <LimitPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Button
        variant={variant === "outline" ? "outline" : "primary"}
        className={className}
        onClick={handleClick}
      >
        הוספת שיר
      </Button>
      <LimitPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} />
    </>
  );
}

function LimitPopup({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <PopupMsg
      isOpen={isOpen}
      onClose={onClose}
      title="רגע, יש לך לא מעט שירים פעילים 👑"
      buttonText="אישור"
      message={
        <div style={{ textAlign: "right", direction: "rtl", lineHeight: "1.6" }}>
          ניתן להריץ עד {MAX_ACTIVE_SONGS} שירים במקביל.<br />
          רוצה להעלות משהו חדש? פשוט לחצו על <OctagonPause size={18} style={{ display: "inline-block", verticalAlign: "middle", margin: "0 4px", color: "var(--brand-primary)" }} /> כדי להשהות זמנית שיר קיים, והדרך תתפנה!
        </div>
      }
    />
  );
}
