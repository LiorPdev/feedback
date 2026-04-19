"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

interface ManualBackButtonProps {
  className?: string;
  url?: string;
  fallbackUrl?: string;
}

export default function ManualBackButton({ className, url, fallbackUrl = "/dashboard" }: ManualBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (url) {
      router.push(url);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl);
    }
  };

  return (
    <button 
      onClick={handleBack}
      className={className}
      aria-label="חזרה"
    >
      <ArrowRight size={24} />
    </button>
  );
}
