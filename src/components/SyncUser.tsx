import { syncUser } from "@/lib/user-auth";
import LeadPixelFire from "./LeadPixelFire";

export default async function SyncUser() {
  const dbUser = await syncUser();
  
  if (dbUser && 'isNewRecord' in dbUser && dbUser.isNewRecord) {
    return <LeadPixelFire />;
  }

  return null;
}
