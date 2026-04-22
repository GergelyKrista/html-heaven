import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  trustHost: true,
  callbacks: {
    // Eagerly create a user row + claim a handle as soon as someone
    // signs in. This is what makes clicking "AmbrusOrban" on a card
    // actually land on a profile page — without this, user rows are
    // only created on actions like submit/edit/follow, so a fresh
    // sign-in user has no handle and no /u/<handle> page.
    async signIn({ user, profile }) {
      if (!user?.email) return true;
      try {
        // Lazy-import to avoid pulling D1/Workers-only code into
        // environments where auth runs without a request (edge prerender).
        const { getDB } = await import("./db");
        const { ensureUserWithHandle } = await import("./users");
        const db = await getDB();
        const p = (profile || {}) as {
          login?: string;
          bio?: string | null;
          blog?: string | null;
          location?: string | null;
          twitter_username?: string | null;
        };
        await ensureUserWithHandle(
          db,
          user.email,
          user.name || user.email,
          user.image || null,
          p.login || null,
          {
            bio: p.bio || null,
            website: p.blog || null,
            location: p.location || null,
            twitter: p.twitter_username || null,
          }
        );
      } catch (err) {
        // Never block sign-in on a DB hiccup — the user can still
        // land on the site and the next authed action will retry.
        console.error("signIn ensureUserWithHandle failed:", err);
      }
      return true;
    },

    // Capture the public GitHub profile at sign-in so we can pre-fill
    // the user's HTML Heaven profile the first time they land on /profile.
    async jwt({ token, profile, account }) {
      if (account && profile) {
        const p = profile as {
          login?: string;
          avatar_url?: string;
          bio?: string | null;
          blog?: string | null;           // "blog" = personal website on GitHub
          location?: string | null;
          twitter_username?: string | null;
        };
        if (p.login) token.githubLogin = p.login;
        if (p.avatar_url) token.avatarUrl = p.avatar_url;
        if (p.bio) token.ghBio = p.bio;
        if (p.blog) token.ghWebsite = p.blog;
        if (p.location) token.ghLocation = p.location;
        if (p.twitter_username) token.ghTwitter = p.twitter_username;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose the github-derived fields on session.user for the server
      // components that read them.
      const extras = session.user as typeof session.user & {
        githubLogin?: string;
        ghBio?: string;
        ghWebsite?: string;
        ghLocation?: string;
        ghTwitter?: string;
      };
      if (token.githubLogin) extras.githubLogin = token.githubLogin as string;
      if (token.ghBio) extras.ghBio = token.ghBio as string;
      if (token.ghWebsite) extras.ghWebsite = token.ghWebsite as string;
      if (token.ghLocation) extras.ghLocation = token.ghLocation as string;
      if (token.ghTwitter) extras.ghTwitter = token.ghTwitter as string;
      if (token.avatarUrl && session.user) {
        session.user.image = token.avatarUrl as string;
      }
      return session;
    },
  },
});

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  githubLogin?: string;
  ghBio?: string;
  ghWebsite?: string;
  ghLocation?: string;
  ghTwitter?: string;
};

/** Pull the GitHub-derived fields off the session user for ensureUserWithHandle. */
export function githubFieldsFromSession(user: SessionUser) {
  return {
    githubLogin: user.githubLogin ?? null,
    gh: {
      bio: user.ghBio ?? null,
      website: user.ghWebsite ?? null,
      location: user.ghLocation ?? null,
      twitter: user.ghTwitter ?? null,
    },
  };
}

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
