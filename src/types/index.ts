export type HostingType = "bundled" | "external";

export interface AppMeta {
  title: string;
  slug: string;
  description: string;
  author: string;
  tags: string[];
  dateAdded: string;
  featured: boolean;

  /**
   * Where the app lives. Missing values are treated as "bundled" by
   * callers so legacy entries (predate this field) keep working.
   */
  hostingType?: HostingType;

  /** Bundled apps: filename inside apps/<slug>/ used as the card image. */
  thumbnail?: string;

  /** External apps: full https URL the launcher opens in a new tab. */
  externalUrl?: string;
}

/** Type-narrowing helper — defaults missing hostingType to "bundled". */
export function isExternal(app: AppMeta): boolean {
  return app.hostingType === "external";
}

export interface Comment {
  id: number;
  userName: string;
  userAvatar: string | null;
  appSlug: string;
  text: string;
  createdAt: string;
  /** Sum of votes on this comment (upvotes − downvotes). */
  score: number;
  /** Current viewer's vote: 1 (up), -1 (down), or 0 (no vote / signed out). */
  userVote: -1 | 0 | 1;
  /**
   * Parent comment id when this comment is a reply, otherwise null.
   * The model only allows one level of nesting — replies' parents are
   * always top-level comments.
   */
  parentId: number | null;
  /** Replies to this comment, chronological. Only present on top-level comments. */
  replies?: Comment[];
}

export interface AppStats {
  likeCount: number;
  favoriteCount: number;
  liked: boolean;
  favorited: boolean;
}
