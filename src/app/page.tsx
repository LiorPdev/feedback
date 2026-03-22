import type { Metadata } from "next";
import LandingClient from "@/components/LandingClient";

export const metadata: Metadata = {
  title: "פידבק-ספייס | קהילה לקבלת פידבקים",
  description: "קהילה לקבלת פידבקים, מותאמת לאמנים ויוצרים. בואו לקבל חוות דעת כנה על היצירות שלכם.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "פידבק-ספייס | קהילה לקבלת פידבקים אמיתיים",
    description: "קהילה לקבלת פידבקים, מותאמת לאמנים ויוצרים. בואו לקבל חוות דעת כנה על היצירות שלכם.",
    url: "https://feedback.activitywiz.com",
    siteName: "פידבק-ספייס",
    images: [
      {
        url: "/og_image.png",
        width: 1200,
        height: 630,
        alt: "פידבק-ספייס | קהילה לקבלת פידבקים",
      },
    ],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "פידבק-ספייס | קהילה לקבלת פידבקים",
    description: "קהילה לקבלת פידבקים, מותאמת לאמנים ויוצרים.",
    images: ["/og_image.png"],
  },
};

export default function Home() {
  return <LandingClient />;
}