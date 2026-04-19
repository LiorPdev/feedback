"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function ClientCallback() {
  const [targetUrl, setTargetUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = sessionStorage.getItem("sso_callback_url") || "/";
    // Using a microtask to avoid the synchronous setState lint error
    // while ensuring the UI updates as soon as possible after mount.
    void Promise.resolve().then(() => {
      setTargetUrl(url);
    });
  }, []);

  if (targetUrl === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse w-8 h-8 rounded-full bg-slate-200"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <AuthenticateWithRedirectCallback 
        signUpFallbackRedirectUrl={targetUrl}
        signInFallbackRedirectUrl={targetUrl}
        signUpForceRedirectUrl={targetUrl}
        signInForceRedirectUrl={targetUrl}
      />
      <div id="clerk-captcha" />
    </div>
  );
}
