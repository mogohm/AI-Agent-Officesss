import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Route protection via the edge-safe config (JWT check only; no DB access).
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)"],
};
