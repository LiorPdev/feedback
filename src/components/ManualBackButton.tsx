"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

interface ManualBackButtonProps {
  className?: string;
  url?: string;
}

export default function ManualBackButton({ className, url }: ManualBackButtonProps) {
  const router = useRouter();

  return (
    <button 
      onClick={() => url ? router.push(url) : router.back()}
      className={className}
      aria-label="חזרה"
    >
      <ArrowRight size={24} />
    </button>
  );
}
