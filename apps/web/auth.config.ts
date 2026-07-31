import type { NextAuthConfig } from "next-auth";

// Edge-safe base config (no database/node imports) — used by middleware for
// route protection and shared with the full auth setup.
const PUBLIC_PREFIXES = ["/login", "/forgot-password", "/api/auth", "/api/health", "/api/ready", "/api/live"];

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p))) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id?: string }).id;
        token.globalRole = (user as { globalRole?: string }).globalRole;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid as string;
        session.user.globalRole = token.globalRole as string;
      }
      return session;
    },
  },
};
