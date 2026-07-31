import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      globalRole: string;
    } & DefaultSession["user"];
  }
  interface User {
    globalRole?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    globalRole?: string;
  }
}
