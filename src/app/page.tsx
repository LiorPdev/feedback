import type { Metadata } from "next";
import LandingClient from "@/components/LandingClient";
import { syncUser } from "@/lib/user-auth";
import { getUserSongCount } from "@/app/actions/songs";
import { getMyGivenFeedbacksCount } from "@/app/actions/feedback";

export const dynamic = "force-dynamic";

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
  const dbUser = await syncUser();
  let initialHasSongs = false;
  let initialGenre = "";
  let initialHasFeedbacksGiven = false;


  if (dbUser) {
    const [songResult, feedbackCount] = await Promise.all([
      getUserSongCount(),
      getMyGivenFeedbacksCount(),
    ]);
    
    if (songResult.success && songResult.count > 0) {
      initialHasSongs = true;
    }
    if (dbUser.userGenre) {
      initialGenre = dbUser.userGenre;
    }
    if (feedbackCount > 0) {
      initialHasFeedbacksGiven = true;
    }
  }

  return (
    <LandingClient 
      isLoggedIn={!!dbUser}
      isClerkUser={!!dbUser?.clerkId}
      initialHasSongs={initialHasSongs} 
      initialGenre={initialGenre} 
      initialHasFeedbacksGiven={initialHasFeedbacksGiven}
    />
  );
}