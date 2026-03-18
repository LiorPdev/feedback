import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Heebo } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { heIL } from '@clerk/localizations'
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
    default: "פידבק-ספייס | מערכת לקבלת פידבקים",
    template: "%s | פידבק-ספייס",
  },
  description: "מערכת לקבלת פידבקים קלה ומהירה, מותאמת לאמנים ויוצרים.",
  icons: {
    icon: "/Logo.png",
    apple: "/Logo192.png",
  },
  openGraph: {
    title: "פידבק-ספייס | מערכת לקבלת פידבקים",
    description: "מערכת לקבלת פידבקים קלה ומהירה, מותאמת לאמנים ויוצרים.",
    url: "https://feedback.activitywiz.com",
    siteName: "פידבק-ספייס",
    images: [
      {
        url: "/og_image.png",
        width: 1200,
        height: 630,
        alt: "פידבק-ספייס | מערכת לקבלת פידבקים",
      },
    ],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "פידבק-ספייס | מערכת לקבלת פידבקים",
    description: "מערכת לקבלת פידבקים קלה ומהירה, מותאמת לאמנים ויוצרים.",
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
      localization={heIL as any}
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
            strategy="beforeInteractive"
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