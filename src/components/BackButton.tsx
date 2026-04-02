"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import styles from "./BackButton.module.css";

interface BackButtonProps {
  className?: string;
  style?: React.CSSProperties;
  iconSize?: number;
}

export default function BackButton({ className = "", style, iconSize = 22 }: BackButtonProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    router.back();
  };

  return (
    <button 
      onClick={handleBack}
      className={`${styles.backButton} ${className}`} 
      style={style}
      type="button"
    >
      <ArrowRight size={iconSize} />
    </button>
  );
}
