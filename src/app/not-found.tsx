import Link from "next/link";
import { MoveLeft, HelpCircle } from "lucide-react";
import styles from "./landing.module.css";

export default function NotFound() {
  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      gap: "24px",
      textAlign: "center",
      padding: "20px",
      background: "var(--background)",
      fontFamily: "var(--font-heebo), sans-serif",
      color: "var(--text-main)"
    }}>
      <div style={{ 
        width: "80px", 
        height: "80px", 
        background: "rgba(64, 192, 208, 0.1)", 
        borderRadius: "24px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "#40C0D0",
        marginBottom: "8px"
      }}>
        <HelpCircle size={40} />
      </div>

      <h1 style={{ fontSize: "2.5rem", fontWeight: "900", margin: 0 }}>הדף לא נמצא</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", maxWidth: "400px", lineHeight: "1.6" }}>
        מצטערים, לא הצלחנו למצוא את הדף שחיפשת. ייתכן שהקישור שבור או שהשיר הוסר.
      </p>

      <Link href="/" style={{ 
        marginTop: "12px",
        padding: "1rem 2rem",
        background: "var(--brand-primary)",
        color: "white",
        textDecoration: "none",
        borderRadius: "14px",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.3s ease"
      }}>
        <MoveLeft size={18} /> חזרה לדף הבית
      </Link>
    </div>
  );
}
