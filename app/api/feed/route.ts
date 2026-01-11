import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { pool } from "@/lib/db";
import type { FeedPost, FeedResponse } from "@/types/feed";

interface DbPostRow {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: Date;
}

function toFeedPost(row: DbPostRow): FeedPost {
  const ms = row.created_at.getTime();
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    imageUrl: row.image_url,
    createdAt: row.created_at.toISOString(),
    createdAtScore: ms,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const viewerId = searchParams.get("viewerId");
  if (!viewerId) {
    return NextResponse.json({ error: "viewerId wajib" }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "20"), 1), 50);
  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? Number(cursorParam) : null;

  const feedKey = `feed:${viewerId}`;

  // 1) Cache-first: ambil list postId dari Redis (ZSET)
  let postIds: string[] = [];
  if (cursor === null) {
    postIds = await redis.zrevrange(feedKey, 0, limit - 1);
  } else {
    if (!Number.isFinite(cursor)) {
      return NextResponse.json({ error: "cursor harus angka epoch ms" }, { status: 400 });
    }
    postIds = await redis.zrevrangebyscore(feedKey, `(${cursor}`, "-inf", "LIMIT", 0, limit);
  }

  // Kalau cache ada, kita ambil detail post dari DB (simple & aman).
  // (Nanti bisa dioptimasi dengan cache post detail di Redis HASH)
  if (postIds.length > 0) {
    const { rows } = await pool.query<DbPostRow>(
      `
      SELECT id, user_id, content, image_url, created_at
      FROM posts
      WHERE id = ANY($1::uuid[])
      `,
      [postIds]
    );

    // Penting: hasil query ANY() tidak menjamin urutan sama dengan postIds
    const byId = new Map<string, FeedPost>();
    for (const r of rows) byId.set(r.id, toFeedPost(r));

    const items: FeedPost[] = postIds
      .map((id) => byId.get(id))
      .filter((x): x is FeedPost => x !== undefined);

    const nextCursor = items.length > 0 ? items[items.length - 1].createdAtScore : null;

    return NextResponse.json<FeedResponse>({
      source: "cache",
      items,
      nextCursor,
    });
  }

  // 2) Cache miss -> fallback SQL
  // Ambil post dari following + post sendiri, terbaru dulu.
  // Pagination pakai cursor created_at (keyset) biar lebih efisien dari OFFSET.
  const cursorDate = cursor !== null ? new Date(cursor) : null;

  const { rows } = await pool.query<DbPostRow>(
    `
    SELECT p.id, p.user_id, p.content, p.image_url, p.created_at
    FROM posts p
    WHERE
      (
        p.user_id = $1
        OR EXISTS (
          SELECT 1
          FROM follows f
          WHERE f.follower_id = $1 AND f.following_id = p.user_id
        )
      )
      AND ($2::timestamptz IS NULL OR p.created_at < $2::timestamptz)
    ORDER BY p.created_at DESC
    LIMIT $3
    `,
    [viewerId, cursorDate, limit]
  );

  const items = rows.map(toFeedPost);

  // 3) Isi Redis cache ZSET
  if (items.length > 0) {
    const zaddArgs: Array<string | number> = [];
    for (const p of items) {
      zaddArgs.push(p.createdAtScore, p.id);
    }
    await redis.zadd(feedKey, ...zaddArgs);
    await redis.expire(feedKey, 60 * 10); // 10 menit
  }

  const nextCursor = items.length > 0 ? items[items.length - 1].createdAtScore : null;

  return NextResponse.json<FeedResponse>({
    source: "db",
    items,
    nextCursor,
  });
}
