import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@illuvrse/db";
import { assertAuthSecurityConfig, isDevCredentialsAuthAllowed } from "@/lib/env";

assertAuthSecurityConfig();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@illuvrse.local" }
      },
      async authorize(credentials) {
        if (!isDevCredentialsAuthAllowed()) {
          return null;
        }

        const email = credentials?.email?.toLowerCase();
        if (!email) return null;

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user || user.disabled) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      const userId = (user as { id?: string } | undefined)?.id ?? (token.userId as string | undefined) ?? token.sub;
      if (!userId) return token;

      token.sub = userId;
      token.userId = userId;

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, disabled: true }
      });

      if (!dbUser || dbUser.disabled) {
        token.disabled = true;
        token.role = "user";
        token.permissions = [];
        return token;
      }

      const role = await prisma.role.findUnique({
        where: { name: dbUser.role },
        select: { permissions: true }
      });
      const permissions = Array.isArray(role?.permissions)
        ? role.permissions.filter((value): value is string => typeof value === "string")
        : [];

      token.disabled = false;
      token.role = dbUser.role;
      token.permissions = permissions;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? token.sub ?? "";
        session.user.role = (token.role as string) ?? "user";
        session.user.permissions = (token.permissions as string[] | undefined) ?? [];
        session.user.disabled = (token.disabled as boolean | undefined) ?? false;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin"
  }
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role?: string | null;
      permissions?: string[];
      disabled?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    userId?: string;
    permissions?: string[];
    disabled?: boolean;
  }
}
