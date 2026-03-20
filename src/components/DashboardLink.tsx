import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./DashboardLink.module.css";

interface DashboardLinkProps {
  href?: string;
  text?: string;
  className?: string;
}

export default function DashboardLink({ 
  href = "/dashboard", 
  text = "חזרה למרחב האישי",
  className = ""
}: DashboardLinkProps) {
  return (
    <Link href={href} className={`${styles.dashboardLink} ${className}`}>
      <ArrowRight size={16} /> {text}
    </Link>
  );
}
