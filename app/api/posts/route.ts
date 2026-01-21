import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    
    // Joint with users to get username
    // Also check if current user has liked the post
    const query = `
      SELECT 
        p.*, 
        u.username,
        u.profile_picture_url,
        EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $1) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `;
    
    const { rows } = await pool.query(query, [user?.userId || null]);
    return NextResponse.json({ ok: true, posts: rows });
  } catch (error) {
    console.error("Fetch posts error:", error);
    return NextResponse.json({ ok: false, error: "Gagal mengambil data posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Silakan login terlebih dahulu" }, { status: 401 });
    }

    const { content } = await req.json();
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "Konten tidak boleh kosong" }, { status: 400 });
    }

    const { rows } = await pool.query(
      "INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING *",
      [user.userId, content]
    );

    return NextResponse.json({ ok: true, post: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ ok: false, error: "Gagal membuat post" }, { status: 500 });
  }
}
