export interface AppMeta {
  title: string;
  slug: string;
  description: string;
  author: string;
  tags: string[];
  dateAdded: string;
  thumbnail: string;
  featured: boolean;
}

export interface Comment {
  id: number;
  userName: string;
  userAvatar: string | null;
  appSlug: string;
  text: string;
  createdAt: string;
}

export interface AppStats {
  likeCount: number;
  favoriteCount: number;
  liked: boolean;
  favorited: boolean;
}
