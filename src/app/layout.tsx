import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Heebo } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { heIL } from '@clerk/localizations'
import Navbar from "@/components/Navbar";
import { syncUser } from "@/lib/user-auth";
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
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Sync user with DB on every request (server-side)
  await syncUser();

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      localization={{
        ...heIL,
        unstable__errors: {
          ...heIL.unstable__errors,
          form_identifier_not_found: 'לא מצאנו חשבון שמחובר למייל הזה. ניתן להירשם בקלות על ידי לחיצה על כפתור הרשמה למטה.',
        },
      } as unknown as typeof heIL}
      appearance={{
        elements: {
          socialButtonsBlockButton: {
            marginBottom: "0.75rem",
            borderRadius: "14px",
            border: "1.5px solid #e5e7eb",
            height: "54px",
            fontSize: "1.1rem",
            fontWeight: "600",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            "&:hover": {
              backgroundColor: "#f9fafb",
              borderColor: "#d1d5db",
              transform: "translateY(-1px)",
              boxShadow: "0 4px 6px rgba(0,0,0,0.08)",
            }
          },
          socialButtonsBlockButtonText: {
            fontSize: "1.05rem",
            fontWeight: "600",
          },
          card: {
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            borderRadius: "24px",
          },
          headerTitle: {
            fontFamily: "var(--font-heebo)",
            fontWeight: "800",
            fontSize: "1.8rem",
            marginBottom: "0.5rem",
          },
          headerSubtitle: {
            display: "none",
          },
          formFieldErrorText: {
            textAlign: "right",
            width: "100%",
          },
          formButtonPrimary: {
            "& svg": {
              display: "none",
            },
            "& .cl-formButtonPrimaryIcon": {
              display: "none",
            }
          },
          formButtonPrimaryIcon: {
            display: "none",
          },
          footerActionText: {
            fontSize: "1.02rem",
          },
          footerActionLink: {
            fontSize: "1.02rem",
            fontWeight: "700",
          }
        }
      }}
    >
      <html lang="he" dir="rtl" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${heebo.variable} antialiased`}
        >
          <div className="heroBackground">
            <div className="blob blob1" />
            <div className="blob blob2" />
          </div>
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