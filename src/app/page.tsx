"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50">
      <h1 className="text-5xl font-extrabold text-blue-600 mb-4 text-center">Feedback Flow</h1>
      <p className="text-slate-500 mb-12 text-xl text-center">מערכת הפידבקים של Activity Wizard</p>

      <div className="bg-white p-12 rounded-3xl shadow-2xl border border-slate-100 text-center max-w-md w-full">
        <SignedOut>
          <h2 className="text-2xl font-bold mb-4 text-slate-800">ברוכים הבאים</h2>
          <p className="mb-8 text-slate-600">כדי להתחיל להשתמש במערכת, אנא התחברו:</p>
          <SignInButton mode="modal">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg">
              התחברות למערכת
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <div className="flex flex-col items-center gap-6">
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold">
              מחובר בהצלחה
            </div>
            <p className="text-slate-800 text-lg">שלום לך!</p>
            <div className="scale-150 my-4">
              <UserButton />
            </div>
          </div>
        </SignedIn>
      </div>
    </main>
  );
}