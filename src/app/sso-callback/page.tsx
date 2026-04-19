import { Suspense } from "react";
import ClientCallback from "./ClientCallback";

export const dynamic = "force-dynamic";

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse w-8 h-8 rounded-full bg-slate-200"></div>
      </div>
    }>
      <ClientCallback />
    </Suspense>
  );
}
