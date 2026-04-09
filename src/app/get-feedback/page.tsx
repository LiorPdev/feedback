import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserSongCount } from "@/app/actions/songs";
import GetFeedbackClient from "./GetFeedbackClient";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GetFeedbackPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  const params = await searchParams;
  const hideBack = params.hideBack === "true";  // we need to hide the back button when the user is coming from the login page so back wont return to the login page

  // If the user is logged in AND they didn't explicitly ask for a 'new' song upload
  // AND they arrived here via the landing page or a general direct link (no ?new=true)
  if (userId && params.new !== "true") {
    const songCountResult = await getUserSongCount(userId);

    // If they already have at least one song, send them to their dashboard
    if (songCountResult.success && songCountResult.count > 0) {
      redirect("/dashboard");
    }
  }

  return <GetFeedbackClient hideBack={hideBack} />;
}
