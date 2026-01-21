import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { redis } from "@/lib/redis";

interface UserProfileResponse {
  ok: boolean;
  user: {
    id: string;
    username: string;
    full_name: string | null;
    bio: string | null;
    profilePictureUrl: string | null;
    website: string | null;
    location: string | null;
    createdAt: string;
  };
  stats: {
    postCount: number;
    likesReceivedCount: number;
    followersCount: number;
    followingCount: number;
    source: "db" | "mixed";
  };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params;

  try {
    // 1) Ambil profil user
    const userRes = await pool.query<{
      id: string;
      username: string;
      full_name: string | null;
      bio: string | null;
      profile_picture_url: string | null;
      website: string | null;
      location: string | null;
      created_at: Date;
    }>(
      `
      SELECT id, username, full_name, bio, profile_picture_url, website, location, created_at
      FROM users
      WHERE id = $1::uuid
      `,
      [userId]
    );

    const userRow = userRes.rows[0];
    if (!userRow) {
      return NextResponse.json({ ok: false, error: "user tidak ditemukan" }, { status: 404 });
    }

    // 2) Stats via SQL (akurat)
    // postCount: count posts milik user
    // likesReceivedCount: jumlah like yang diterima semua post user
    // followersCount: count follows where following_id = user
    // followingCount: count follows where follower_id = user
    const statsRes = await pool.query<{
      post_count: string; // pg COUNT(*) balik text
      likes_received_count: string;
      followers_count: string;
      following_count: string;
    }>(
      `
      SELECT
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = $1::uuid) AS post_count,
        (SELECT COUNT(*)
         FROM posts p
         JOIN likes l ON l.post_id = p.id
         WHERE p.user_id = $1::uuid
        ) AS likes_received_count,
        (SELECT COUNT(*) FROM follows f WHERE f.following_id = $1::uuid) AS followers_count,
        (SELECT COUNT(*) FROM follows f WHERE f.follower_id = $1::uuid) AS following_count
      `,
      [userId]
    );

    const s = statsRes.rows[0];
    const dbStats = {
      postCount: Number(s?.post_count ?? "0"),
      likesReceivedCount: Number(s?.likes_received_count ?? "0"),
      followersCount: Number(s?.followers_count ?? "0"),
      followingCount: Number(s?.following_count ?? "0"),
    };

    // 3) (Opsional) mixed: coba ambil follower/following count dari Redis (lebih cepat)
    // Kalau Redis ada datanya, pakai itu. Kalau tidak, fallback DB.
    let source: "db" | "mixed" = "db";
    try {
      const followingKey = `user:following:${userId}`;
      const followersKey = `user:followers:${userId}`;

      const [followingCard, followersCard] = await Promise.all([
        redis.scard(followingKey),
        redis.scard(followersKey),
      ]);

      // Kalau set Redis kosong karena belum pernah dipopulate, angka 0 bisa misleading.
      // Jadi kita hanya pakai Redis jika salah satu key benar-benar ada.
      const [hasFollowingKey, hasFollowersKey] = await Promise.all([
        redis.exists(followingKey),
        redis.exists(followersKey),
      ]);

      const followersCount = hasFollowersKey === 1 ? followersCard : dbStats.followersCount;
      const followingCount = hasFollowingKey === 1 ? followingCard : dbStats.followingCount;

      if (hasFollowersKey === 1 || hasFollowingKey === 1) source = "mixed";

      const resp: UserProfileResponse = {
        ok: true,
        user: {
          id: userRow.id,
          username: userRow.username,
          full_name: userRow.full_name,
          bio: userRow.bio,
          profilePictureUrl: userRow.profile_picture_url,
          website: userRow.website,
          location: userRow.location,
          createdAt: userRow.created_at.toISOString(),
        },
        stats: {
          postCount: dbStats.postCount,
          likesReceivedCount: dbStats.likesReceivedCount,
          followersCount,
          followingCount,
          source,
        },
      };

      return NextResponse.json(resp);
    } catch {
      // Redis down / not configured -> tetap return DB
    }

    const resp: UserProfileResponse = {
      ok: true,
      user: {
        id: userRow.id,
        username: userRow.username,
        full_name: userRow.full_name,
        bio: userRow.bio,
        profilePictureUrl: userRow.profile_picture_url,
        website: userRow.website,
        location: userRow.location,
        createdAt: userRow.created_at.toISOString(),
      },
      stats: {
        postCount: dbStats.postCount,
        likesReceivedCount: dbStats.likesReceivedCount,
        followersCount: dbStats.followersCount,
        followingCount: dbStats.followingCount,
        source: "db",
      },
    };

    return NextResponse.json(resp);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const isUuidError = msg.toLowerCase().includes("invalid input syntax for type uuid");
    return NextResponse.json({ ok: false, error: msg }, { status: isUuidError ? 400 : 500 });
  }
}
