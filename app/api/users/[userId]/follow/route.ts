import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { userId: followingId } = await params;
    const followerId = user.userId;

    if (followerId === followingId) {
      return NextResponse.json({ ok: false, error: "Tidak bisa follow diri sendiri" }, { status: 400 });
    }

    // Check if following
    const { rows } = await pool.query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
      [followerId, followingId]
    );

    if (rows.length > 0) {
      // Unfollow
      await pool.query(
        "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2",
        [followerId, followingId]
      );
      return NextResponse.json({ ok: true, following: false });
    } else {
      // Follow
      await pool.query(
        "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [followerId, followingId]
      );
      return NextResponse.json({ ok: true, following: true });
    }
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json({ ok: false, error: "Server Error" }, { status: 500 });
  }
}
