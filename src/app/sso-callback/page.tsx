import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SSOCallbackPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <AuthenticateWithRedirectCallback />
      <div id="clerk-captcha" />
    </div>
  );
}
