import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { redis } from "@/lib/redis";

interface UnfollowBody {
  followerId: string;
  followingId: string;
}

interface UnfollowResponse {
  ok: boolean;
  status: "unfollowed" | "not_following";
  followerId: string;
  followingId: string;
  followersCount: number | null;
  followingCount: number | null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Partial<UnfollowBody> | null;

  const followerId = body?.followerId;
  const followingId = body?.followingId;

  if (!followerId || !followingId) {
    return NextResponse.json({ ok: false, error: "followerId & followingId wajib" }, { status: 400 });
  }
  if (followerId === followingId) {
    return NextResponse.json({ ok: false, error: "followerId dan followingId tidak boleh sama" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const del = await client.query(
      `
      DELETE FROM follows
      WHERE follower_id = $1::uuid AND following_id = $2::uuid
      RETURNING follower_id
      `,
      [followerId, followingId]
    );

    const removed = del.rowCount === 1;

    await client.query("COMMIT");

    const followingKey = `user:following:${followerId}`;
    const followersKey = `user:followers:${followingId}`;

    let followingCount: number | null = null;
    let followersCount: number | null = null;

    try {
      if (removed) {
        await redis.srem(followingKey, followingId);
        await redis.srem(followersKey, followerId);
      }
      // TTL (opsional)
      await redis.expire(followingKey, 60 * 60 * 6);
      await redis.expire(followersKey, 60 * 60 * 6);

      followingCount = await redis.scard(followingKey);
      followersCount = await redis.scard(followersKey);
    } catch {
      followingCount = null;
      followersCount = null;
    }

    const resp: UnfollowResponse = {
      ok: true,
      status: removed ? "unfollowed" : "not_following",
      followerId,
      followingId,
      followersCount,
      followingCount,
    };

    return NextResponse.json(resp);
  } catch (e) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : "Unknown error";
    const isUuidError = msg.toLowerCase().includes("invalid input syntax for type uuid");

    return NextResponse.json(
      { ok: false, error: msg },
      { status: isUuidError ? 400 : 500 }
    );
  } finally {
    client.release();
  }
}
