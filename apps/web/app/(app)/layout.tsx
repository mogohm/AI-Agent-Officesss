import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { AppShellClient } from "@/components/app/AppShellClient";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppShellClient user={user}>{children}</AppShellClient>;
}
