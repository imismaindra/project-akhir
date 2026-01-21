import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Silakan login terlebih dahulu" }, { status: 401 });
    }

    const { id: postId } = await params;

    if (!postId) {
      return NextResponse.json({ ok: false, error: "Invalid post ID" }, { status: 400 });
    }

    // Check if already liked
    const { rows: existingLike } = await pool.query(
      "SELECT * FROM likes WHERE user_id = $1 AND post_id = $2",
      [user.userId, postId]
    );

    if (existingLike.length > 0) {
      // Unlike
      await pool.query(
        "DELETE FROM likes WHERE user_id = $1 AND post_id = $2",
        [user.userId, postId]
      );
      return NextResponse.json({ ok: true, liked: false });
    } else {
      // Like
      await pool.query(
        "INSERT INTO likes (user_id, post_id) VALUES ($1, $2)",
        [user.userId, postId]
      );
      return NextResponse.json({ ok: true, liked: true });
    }
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ ok: false, error: "Terjadi kesalahan" }, { status: 500 });
  }
}
