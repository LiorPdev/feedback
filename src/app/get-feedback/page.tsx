import { syncUser } from "@/lib/user-auth";
import { redirect } from "next/navigation";
import { getUserSongCount } from "@/app/actions/songs";
import GetFeedbackClient from "./GetFeedbackClient";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GetFeedbackPage({ searchParams }: PageProps) {
  const dbUser = await syncUser();
  const params = await searchParams;
  const backHome = params.backHome === "true"; 
  
  let initialHasSongs = false;
  let initialTokens = 0;

  if (dbUser) {
    const songCountResult = await getUserSongCount();
    initialHasSongs = (songCountResult.success && songCountResult.count > 0);
    initialTokens = dbUser.tokens || 0;

    // Redirect to dashboard if they already have songs and didn't ask for "new"
    if (initialHasSongs && params.new !== "true") {
      redirect(`/dashboard${backHome ? "?backHome=true" : ""}`);
    }
  }

  return (
    <GetFeedbackClient 
      backHome={backHome} 
      isLoggedIn={!!dbUser} 
      initialHasSongs={initialHasSongs}
      initialTokens={initialTokens}
    />
  );
}
