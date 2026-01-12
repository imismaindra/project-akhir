import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";

interface RegisterBody {
  username: string;
  email?: string;
  password: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Partial<RegisterBody> | null;

  const username = body?.username?.trim();
  const email = body?.email?.trim() ?? null;
  const password = body?.password;

  if (!username || username.length < 3 || username.length > 30) {
    return NextResponse.json({ ok: false, error: "username 3–30 karakter" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ ok: false, error: "password minimal 6 karakter" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const { rows } = await pool.query<{ id: string; username: string; email: string | null }>(
      `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email
      `,
      [username, email, passwordHash]
    );

    return NextResponse.json({ ok: true, user: rows[0] }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const lower = msg.toLowerCase();

    // Unique violation
    if (lower.includes("duplicate key value") || lower.includes("unique")) {
      return NextResponse.json({ ok: false, error: "username/email sudah dipakai" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
