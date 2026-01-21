import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get users that are NOT the current user
    // Also mark if following them
    const query = `
      SELECT 
        u.id, 
        u.username,
        u.profile_picture_url,
        EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = u.id) as is_following
      FROM users u
      WHERE u.id != $1
      LIMIT 10
    `;
    
    const { rows } = await pool.query(query, [user.userId]);
    return NextResponse.json({ ok: true, users: rows });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ ok: false, error: "Gagal mengambil user" }, { status: 500 });
  }
}
