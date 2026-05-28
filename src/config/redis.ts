// src/config/redis.ts

import Redis from "ioredis";
import { ENV } from "./env";

// Redis client banao
const redis = new Redis(ENV.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,    // 3 baar retry karo
  enableReadyCheck: true,     // Connection check karo
  lazyConnect: true,          // Zarurat pe connect karo
});

// Connected hone par log karo
redis.on("connect", () => {
  console.log("✅ Redis Connected");
});

// Error aane par log karo
redis.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
});

export default redis;