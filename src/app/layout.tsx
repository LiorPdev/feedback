import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Heebo } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { heIL } from '@clerk/localizations'
import Navbar from "@/components/Navbar";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://feedback.activitywiz.com"),
  title: {
    default: "פידבק-ספייס",
    template: "%s | פידבק-ספייס",
  },
  description: "קהילה לקבלת פידבקים קלה ומהירה, מותאמת לאמנים ויוצרים. בואו לקבל חוות דעת כנה על היצירות שלכם.",
  icons: {
    icon: [
      { url: "/Logo192.png", sizes: "192x192", type: "image/png" },
      { url: "/Logo512.png", sizes: "512x512", type: "image/png" },
      { url: "/Logo.webp", type: "image/webp" },
      { url: "/Logo.png", type: "image/png" },
    ],
    apple: "/Logo192.png",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: false,
    follow: true,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

import { Suspense } from "react";
import SourceTracker from "@/components/SourceTracker";
import { syncUser } from "@/lib/user-auth";
import { ADMIN_EMAIL } from "@/lib/constants";

async function NavbarWrapper() {
  const dbUser = await syncUser();
  return (
    <>
      <Navbar
        key={dbUser?.id || "guest"}
        isLoggedIn={!!dbUser}
        initialTokens={dbUser?.tokens ?? 0}
        isAdmin={dbUser?.email === ADMIN_EMAIL}
      />
    </>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={heIL}
    >
      <html lang="he" dir="rtl" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${heebo.variable} antialiased`}
        >
          <Suspense fallback={null}>
            <SourceTracker />
          </Suspense>
          <div className="heroBackground">
            <div className="blob blob1" />
            <div className="blob blob2" />
          </div>
          <NavbarWrapper />
          <div className="scroll-container">
            {children}
            <Script
              id="clarity-script"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  (function(c,l,a,r,i,t,y){
                      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                  })(window, document, "clarity", "script", "vxpptippoa");
                `,
              }}
            />
            <Script
              id="fb-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '665228664192222');
                  fbq('track', 'PageView');
                `,
              }}
            />
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src="https://www.facebook.com/tr?id=665228664192222&ev=PageView&noscript=1"
                alt=""
              />
            </noscript>
          </div>
          <Script
            id="sw-registration"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                if ("serviceWorker" in navigator) {
                  window.addEventListener("load", () => {
                    navigator.serviceWorker.register("/sw.js").catch(() => {
                      // Service worker registration failed - app will work without PWA features
                    });
                  });
                }
              `,
            }}
          />
          <Script
            id="dynamic-manifest"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.addEventListener('beforeinstallprompt', (e) => {
                  e.preventDefault();
                  window.deferredPrompt = e;
                });
              `,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}