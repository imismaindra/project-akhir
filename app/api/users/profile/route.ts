import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = authUser;
    const body = await req.json();
    const { username, full_name, bio, profile_picture_url, website, location } = body;

    // Optional: Validation for username
    if (username && (username.length < 3 || username.length > 30)) {
       return NextResponse.json({ ok: false, error: "Username must be 3-30 characters" }, { status: 400 });
    }

    const query = `
      UPDATE users
      SET 
        username = COALESCE($1, username),
        full_name = COALESCE($2, full_name),
        bio = COALESCE($3, bio),
        profile_picture_url = COALESCE($4, profile_picture_url),
        website = COALESCE($5, website),
        location = COALESCE($6, location),
        updated_at = NOW()
      WHERE id = $7::uuid
      RETURNING id, username, full_name, bio, profile_picture_url, website, location;
    `;

    const { rows } = await pool.query(query, [
      username || null,
      full_name || null,
      bio || null,
      profile_picture_url || null,
      website || null,
      location || null,
      userId
    ]);

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user: rows[0] });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ ok: false, error: "Failed to update profile" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = authUser;
    const { rows } = await pool.query(
      "SELECT id, username, email, full_name, bio, profile_picture_url, website, location FROM users WHERE id = $1::uuid",
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, user: rows[0] });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}
