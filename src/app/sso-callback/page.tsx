import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <AuthenticateWithRedirectCallback />
      <div id="clerk-captcha" />
    </div>
  );
}
