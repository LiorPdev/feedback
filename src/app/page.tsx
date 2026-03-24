import type { Metadata } from "next";
import LandingClient from "@/components/LandingClient";
import { auth } from "@clerk/nextjs/server";
import { getUserSongCount } from "@/app/actions/songs";
import { getUserData } from "@/app/actions/user";

export const metadata: Metadata = {
  title: "פידבק-ספייס | קהילה לקבלת פידבקים",
  description: "מותאמת לאמנים ויוצרים. בואו לקבל חוות דעת כנה על היצירות שלכם.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "פידבק-ספייס | קהילה לקבלת פידבקים",
    description: "מותאמת לאמנים ויוצרים. בואו לקבל חוות דעת כנה על היצירות שלכם.",
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
    description: "מותאמת לאמנים ויוצרים.",
    images: ["/og_image.png"],
  },
};

export default async function Home() {
  const { userId } = await auth();
  let initialHasSongs = false;
  let initialGenre = "";

  if (userId) {
    const [songResult, userResult] = await Promise.all([
      getUserSongCount(userId),
      getUserData(userId)
    ]);
    
    if (songResult.success && songResult.count > 0) {
      initialHasSongs = true;
    }
    if (userResult.success && userResult.userGenre) {
      initialGenre = userResult.userGenre;
    }
  }

  return <LandingClient initialHasSongs={initialHasSongs} initialGenre={initialGenre} />;
}