import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { redis } from "@/lib/redis";

interface LikeResponse {
  ok: boolean;
  status: "liked" | "already_liked";
  likesCount: number | null; // dari Redis kalau ada
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  const { postId } = await ctx.params;

  // Untuk prototype UAS: ambil userId dari body.
  // Nanti kalau sudah ada auth, userId dari session/JWT.
  const body = (await req.json().catch(() => null)) as { userId?: string } | null;
  const userId = body?.userId;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId wajib" }, { status: 400 });
  }

  // 1) Coba insert like ke SQL (anti double-like by PRIMARY KEY)
  // Jika sukses insert -> INCR Redis
  // Jika konflik (sudah like) -> jangan INCR
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insert = await client.query(
      `
      INSERT INTO likes (post_id, user_id)
      VALUES ($1::uuid, $2::uuid)
      ON CONFLICT (post_id, user_id) DO NOTHING
      RETURNING post_id
      `,
      [postId, userId]
    );

    const isNewLike = insert.rowCount === 1;

    await client.query("COMMIT");

    let likesCount: number | null = null;

    const counterKey = `post:likes:${postId}`;

    if (isNewLike) {
      // Real-time counter
      likesCount = await redis.incr(counterKey);
      // TTL biar aman
      await redis.expire(counterKey, 60 * 60 * 6); // 6 jam
      const resp: LikeResponse = { ok: true, status: "liked", likesCount };
      return NextResponse.json(resp);
    }

    // Sudah pernah like: jangan ubah counter
    const current = await redis.get(counterKey);
    likesCount = current ? Number(current) : null;

    const resp: LikeResponse = { ok: true, status: "already_liked", likesCount };
    return NextResponse.json(resp);
  } catch (e) {
    await client.query("ROLLBACK");

    // Kalau postId/userId bukan UUID valid, Postgres akan error.
    // Kita kembalikan 400 biar jelas.
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
