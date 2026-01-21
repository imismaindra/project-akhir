import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret-key";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "Username and password are required" }, { status: 400 });
    }

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json({ ok: false, error: "Username atau password salah" }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json({ ok: false, error: "Username atau password salah" }, { status: 401 });
    }

    // Create JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Set cookie
    const cookie = serialize("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, email: user.email },
    });

    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ ok: false, error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}
