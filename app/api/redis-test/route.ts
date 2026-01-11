import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET() {
  const key = "hello:redis";
  const value = await redis.incr(key);

  return NextResponse.json({
    ok: true,
    value,
  });
}
