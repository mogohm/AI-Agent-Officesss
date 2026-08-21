import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";

const credsSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

/**
 * Raised when the credential check could not be COMPLETED — the database was
 * unreachable, timed out, etc. Distinct from a failed check.
 *
 * Without this, an infrastructure outage is indistinguishable from a bad
 * password: `authorize` returns null for every path, so a developer with a
 * perfectly correct password sees "invalid credentials" and hunts the wrong bug.
 */
export class AuthBackendUnavailable extends CredentialsSignin {
  code = "backend_unavailable";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;

        let user;
        try {
          user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
        } catch (e) {
          // Infrastructure failure — never report this as a credential problem.
          console.error(
            "[auth] cannot reach the database during sign-in.\n" +
            "       Check DATABASE_URL in apps/web/.env and that PostgreSQL is running.\n" +
            "      ", (e as Error).message,
          );
          throw new AuthBackendUnavailable();
        }

        // Below here the check genuinely ran. Return null for BOTH "no such user"
        // and "wrong password" so the response cannot be used to enumerate accounts.
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, email: user.email, name: user.name ?? undefined, globalRole: user.globalRole };
      },
    }),
  ],
});
