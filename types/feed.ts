export interface FeedPost {
  id: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  createdAt: string; // ISO
  createdAtScore: number; // epoch ms
}

export interface FeedResponse {
  source: "cache" | "db";
  items: FeedPost[];
  nextCursor: number | null;
}
