import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  trustHost: true,
  callbacks: {
    // Attach GitHub profile info (login, avatar) to the JWT once at sign-in.
    async jwt({ token, profile, account }) {
      if (account && profile) {
        const p = profile as { login?: string; avatar_url?: string };
        if (p.login) token.githubLogin = p.login;
        if (p.avatar_url) token.avatarUrl = p.avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      // Surface the github login and avatar on session.user
      const extras = session.user as typeof session.user & {
        githubLogin?: string;
      };
      if (token.githubLogin) extras.githubLogin = token.githubLogin as string;
      if (token.avatarUrl && session.user) {
        session.user.image = token.avatarUrl as string;
      }
      return session;
    },
  },
});

/**
 * Returns true if the given email is the site admin.
 * Admin is set via the ADMIN_EMAIL env var.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}
