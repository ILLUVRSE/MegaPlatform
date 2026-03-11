export const dynamic = "force-dynamic";

/**
 * Auth route for NextAuth.
 * Handles GET/POST for sign-in/out and session callbacks.
 */
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
