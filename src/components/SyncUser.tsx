import { syncUser } from "@/lib/user-auth";

export default async function SyncUser() {
  await syncUser();
  return null;
}
