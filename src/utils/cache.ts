// src/utils/cache.ts
// Cache ke liye helper functions

import redis from "../config/redis";

// Cache time constants (seconds mein)
export const CACHE_TTL = {
  PUBLIC_MEETING: 300,   // 5 minutes
  SLOTS:          60,    // 1 minute
  MY_MEETINGS:    120,   // 2 minutes
};

// ── Cache se data lo ──────────────────────────
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    // Redis fail hone par null return karo
    // App band nahi honi chahiye
    console.error("Cache GET error:", err);
    return null;
  }
};

// ── Cache mein data save karo ─────────────────
export const setCache = async (
  key: string,
  data: unknown,
  ttl: number = CACHE_TTL.PUBLIC_MEETING
): Promise<void> => {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    // setex = set + expire
    // ttl seconds ke baad automatically delete ho jaayega
  } catch (err) {
    console.error("Cache SET error:", err);
  }
};

// ── Cache delete karo ─────────────────────────
export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redis.del(key);
  } catch (err) {
    console.error("Cache DELETE error:", err);
  }
};

// ── Pattern se multiple keys delete karo ──────
// Example: "meeting:*" se saari meeting keys hatao
export const deleteCacheByPattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑 Cache cleared: ${keys.length} keys (${pattern})`);
    }
  } catch (err) {
    console.error("Cache DELETE PATTERN error:", err);
  }
};

// ── Cache keys banane ke helpers ──────────────
export const CACHE_KEYS = {
  // Public meeting by slug
  publicMeeting: (slug: string) => `public:meeting:${slug}`,

  // Slots by slug + date
  slots: (slug: string, date: string) => `slots:${slug}:${date}`,

  // Host ki saari meetings
  myMeetings: (userId: string) => `meetings:user:${userId}`,

  // Ek specific meeting
  meeting: (meetingId: string) => `meeting:${meetingId}`,
};