import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { redis } from "@/lib/redis";

interface UnlikeResponse {
  ok: boolean;
  status: "unliked" | "not_liked";
  likesCount: number | null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  const { postId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as { userId?: string } | null;
  const userId = body?.userId;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId wajib" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const del = await client.query(
      `
      DELETE FROM likes
      WHERE post_id = $1::uuid AND user_id = $2::uuid
      RETURNING post_id
      `,
      [postId, userId]
    );

    const removed = del.rowCount === 1;

    await client.query("COMMIT");

    const counterKey = `post:likes:${postId}`;

    if (removed) {
      // jaga-jaga: jangan sampai minus
      const after = await redis.decr(counterKey);
      const likesCount = after < 0 ? 0 : after;
      if (after < 0) await redis.set(counterKey, "0", "EX", 60 * 60 * 6);

      const resp: UnlikeResponse = { ok: true, status: "unliked", likesCount };
      return NextResponse.json(resp);
    }

    const current = await redis.get(counterKey);
    const likesCount = current ? Number(current) : null;

    const resp: UnlikeResponse = { ok: true, status: "not_liked", likesCount };
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
