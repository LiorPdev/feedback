"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./BackButton.module.css";

interface BackButtonProps {
  href: string;
  title: string;
  className?: string;
  style?: React.CSSProperties;
  iconSize?: number;
}

export default function BackButton({ href, title, className = "", style, iconSize = 22 }: BackButtonProps) {
  return (
    <Link 
      href={href} 
      className={`${styles.backButton} ${className}`} 
      title={title}
      style={style}
    >
      <ArrowRight size={iconSize} />
    </Link>
  );
}
