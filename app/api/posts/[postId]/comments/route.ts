import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { redis } from "@/lib/redis";

interface CreateCommentBody {
  userId: string;
  text: string;
}

interface CreateCommentResponse {
  ok: boolean;
  comment: {
    id: string;
    postId: string;
    userId: string;
    text: string;
    createdAt: string;
  };
  commentsCount: number | null; // dari Redis kalau tersedia
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  const { postId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as Partial<CreateCommentBody> | null;
  const userId = body?.userId;
  const text = body?.text;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId wajib" }, { status: 400 });
  }
  if (!text || text.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "text wajib" }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json({ ok: false, error: "text maksimal 1000 karakter" }, { status: 400 });
  }

  // Insert comment di SQL
  const client = await pool.connect();
  try {
    const result = await client.query<{
      id: string;
      post_id: string;
      user_id: string;
      text: string;
      created_at: Date;
    }>(
      `
      INSERT INTO comments (post_id, user_id, text)
      VALUES ($1::uuid, $2::uuid, $3::text)
      RETURNING id, post_id, user_id, text, created_at
      `,
      [postId, userId, text.trim()]
    );

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ ok: false, error: "gagal insert comment" }, { status: 500 });
    }

    // (Opsional) Update counter comment di Redis
    const counterKey = `post:comments_count:${postId}`;
    let commentsCount: number | null = null;
    try {
      commentsCount = await redis.incr(counterKey);
      await redis.expire(counterKey, 60 * 30); // 30 menit
    } catch {
      // Kalau Redis lagi down, comment tetap sukses (source of truth SQL)
      commentsCount = null;
    }

    const resp: CreateCommentResponse = {
      ok: true,
      comment: {
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        text: row.text,
        createdAt: row.created_at.toISOString(),
      },
      commentsCount,
    };

    return NextResponse.json(resp, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";

    // FK violation biasanya: user_id / post_id tidak ditemukan
    // UUID invalid juga sering muncul
    const lower = msg.toLowerCase();
    const isUuidError = lower.includes("invalid input syntax for type uuid");
    const isFkError = lower.includes("violates foreign key constraint");

    return NextResponse.json(
      { ok: false, error: msg },
      { status: isUuidError || isFkError ? 400 : 500 }
    );
  } finally {
    client.release();
  }
}
