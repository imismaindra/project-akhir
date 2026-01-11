import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { redis } from "@/lib/redis";

interface FollowBody {
  followerId: string;
  followingId: string;
}

interface FollowResponse {
  ok: boolean;
  status: "followed" | "already_following";
  followerId: string;
  followingId: string;
  followersCount: number | null; // dari Redis kalau ada
  followingCount: number | null; // dari Redis kalau ada
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Partial<FollowBody> | null;

  const followerId = body?.followerId;
  const followingId = body?.followingId;

  if (!followerId || !followingId) {
    return NextResponse.json({ ok: false, error: "followerId & followingId wajib" }, { status: 400 });
  }
  if (followerId === followingId) {
    return NextResponse.json({ ok: false, error: "tidak boleh follow diri sendiri" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert follow idempotent
    const ins = await client.query(
      `
      INSERT INTO follows (follower_id, following_id)
      VALUES ($1::uuid, $2::uuid)
      ON CONFLICT (follower_id, following_id) DO NOTHING
      RETURNING follower_id
      `,
      [followerId, followingId]
    );

    const isNew = ins.rowCount === 1;

    await client.query("COMMIT");

    // Update Redis cache (best effort)
    const followingKey = `user:following:${followerId}`;
    const followersKey = `user:followers:${followingId}`;

    let followingCount: number | null = null;
    let followersCount: number | null = null;

    try {
      if (isNew) {
        await redis.sadd(followingKey, followingId);
        await redis.sadd(followersKey, followerId);
      }
      // Set TTL biar cache tidak membengkak (optional)
      await redis.expire(followingKey, 60 * 60 * 6); // 6 jam
      await redis.expire(followersKey, 60 * 60 * 6);

      followingCount = await redis.scard(followingKey);
      followersCount = await redis.scard(followersKey);
    } catch {
      followingCount = null;
      followersCount = null;
    }

    const resp: FollowResponse = {
      ok: true,
      status: isNew ? "followed" : "already_following",
      followerId,
      followingId,
      followersCount,
      followingCount,
    };

    return NextResponse.json(resp, { status: 200 });
  } catch (e) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : "Unknown error";
    const lower = msg.toLowerCase();
    const isUuidError = lower.includes("invalid input syntax for type uuid");
    const isFkError = lower.includes("violates foreign key constraint");
    const isCheckError = lower.includes("violates check constraint");

    return NextResponse.json(
      { ok: false, error: msg },
      { status: isUuidError || isFkError || isCheckError ? 400 : 500 }
    );
  } finally {
    client.release();
  }
}
