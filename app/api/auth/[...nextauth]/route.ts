import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";

type DbUser = {
  id: string;
  username: string;
  email: string | null;
  password_hash: string | null;
};

export const authOptions = {
  session: { strategy: "jwt" as const },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        usernameOrEmail: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<{ id: string; name: string; email: string | null } | null> {
        const usernameOrEmail = credentials?.usernameOrEmail?.trim();
        const password = credentials?.password;

        if (!usernameOrEmail || !password) return null;

        const { rows } = await pool.query<DbUser>(
          `
          SELECT id, username, email, password_hash
          FROM users
          WHERE username = $1 OR email = $1
          LIMIT 1
          `,
          [usernameOrEmail]
        );

        const user = rows[0];
        if (!user?.password_hash) return null;

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;

        return { id: user.id, name: user.username, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: Record<string, unknown>; user?: { id: string } }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }: { session: { user?: { name?: string | null; email?: string | null } }; token: Record<string, unknown> }) {
      const userId = typeof token.userId === "string" ? token.userId : null;
      return {
        ...session,
        user: {
          ...(session.user ?? {}),
          id: userId, // kita tambahin id biar enak dipakai API
        },
      } as typeof session & { user: { id: string | null; name?: string | null; email?: string | null } };
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies Parameters<typeof NextAuth>[0];

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
