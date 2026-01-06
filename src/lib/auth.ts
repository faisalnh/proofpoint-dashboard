import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { query, queryOne } from "@/lib/db";

interface DbUser {
    id: string;
    email: string;
    password_hash: string;
}

interface DbProfile {
    full_name: string | null;
    department_id: string | null;
}

interface DbRole {
    role: "admin" | "staff" | "manager" | "director";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log("[Auth] authorize called with email:", credentials?.email);

                if (!credentials?.email || !credentials?.password) {
                    console.log("[Auth] Missing credentials");
                    return null;
                }

                const email = credentials.email as string;
                const password = credentials.password as string;

                // Find user by email
                console.log("[Auth] Looking up user:", email);
                const user = await queryOne<DbUser>(
                    "SELECT id, email, password_hash FROM users WHERE email = $1",
                    [email]
                );

                if (!user) {
                    console.log("[Auth] User not found:", email);
                    return null;
                }
                console.log("[Auth] User found:", user.id, "hash exists:", !!user.password_hash);

                // Verify password
                const isValid = await bcrypt.compare(password, user.password_hash);
                console.log("[Auth] Password validation result:", isValid);
                if (!isValid) {
                    console.log("[Auth] Invalid password for user:", email);
                    return null;
                }

                // Get profile info
                const profile = await queryOne<DbProfile>(
                    "SELECT full_name, department_id FROM profiles WHERE user_id = $1",
                    [user.id]
                );

                // Get user roles
                const roles = await query<DbRole>(
                    "SELECT role FROM user_roles WHERE user_id = $1",
                    [user.id]
                );

                return {
                    id: user.id,
                    email: user.email,
                    name: profile?.full_name ?? null,
                    roles: roles.map((r) => r.role),
                    departmentId: profile?.department_id ?? null,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.roles = (user as { roles?: string[] }).roles ?? [];
                token.departmentId = (user as { departmentId?: string }).departmentId ?? null;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                (session.user as { roles?: string[] }).roles = token.roles as string[];
                (session.user as { departmentId?: string | null }).departmentId = token.departmentId as string | null;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth",
        error: "/auth",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
});
