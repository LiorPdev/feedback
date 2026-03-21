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
    default: "פידבק-ספייס | קהילה לקבלת פידבקים אמיתיים",
    template: "%s | פידבק-ספייס",
  },
  description: "קהילה לקבלת פידבקים קלה ומהירה, מותאמת לאמנים ויוצרים. בואו לקבל חוות דעת כנה על היצירות שלכם.",
  icons: {
    icon: [
      { url: "/Logo.webp", type: "image/webp" },
      { url: "/Logo.png", type: "image/png" },
    ],
    apple: "/Logo192.png",
  },
  openGraph: {
    title: "פידבק-ספייס | קהילה לקבלת פידבקים אמיתיים",
    description: "קהילה לקבלת פידבקים קלה ומהירה, מותאמת לאמנים ויוצרים. בואו לקבל חוות דעת כנה על היצירות שלכם.",
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
    description: "קהילה לקבלת פידבקים קלה ומהירה, מותאמת לאמנים ויוצרים.",
    images: ["/og_image.png"],
  },
  robots: {
    index: true,
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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      localization={heIL as unknown as typeof heIL}
      appearance={{
        elements: {
          footerAction: { display: "none" }
        }
      }}
    >
      <html lang="he" dir="rtl">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${heebo.variable} antialiased`}
        >
          <Navbar />
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