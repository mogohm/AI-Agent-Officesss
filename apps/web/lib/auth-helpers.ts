import "server-only";
import { auth } from "@/auth";
import { AuthenticationError } from "./errors";

export type SessionUser = { id: string; email: string; name?: string | null; globalRole: string };

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    globalRole: session.user.globalRole,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  return user;
}

export function isSuperAdmin(user: { globalRole: string }): boolean {
  return user.globalRole === "SUPER_ADMIN";
}
