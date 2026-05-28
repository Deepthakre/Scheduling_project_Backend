import app from "./app";
import { connectDB } from "./config/db";
import redis from "./config/redis";
import { ENV } from "./config/env";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const startServer = async () => {
  try {
    // 🔹 1. DB connect
    await connectDB();

    // 🔹 2. Redis connect (optional but recommended)
    try {
      await redis.connect();
    } catch (err) {
      console.error(" Redis connection failed — app will run without cache");
    }


  app.listen(ENV.PORT, () => {
    console.log(` Server running on http://localhost:${ENV.PORT}`);
    console.log(` Environment: ${ENV.NODE_ENV}`);
    console.log(`\n Available Routes:`);
    console.log(`   POST   /auth/register`);
    console.log(`   POST   /auth/verify-email`);
    console.log(`   POST   /auth/resend-code`);
    console.log(`   POST   /auth/login`);
    console.log(`   POST   /auth/refresh-token`);
    console.log(`   POST   /auth/logout`);
    console.log(`   POST   /auth/forgot-password`);
    console.log(`   POST   /auth/reset-password`);
    console.log(`   GET    /auth/profile`);
    console.log(`   GET    /auth/google`);
    console.log(`   GET    /auth/google/callback`);
    console.log(`   GET    /admin/users`);
    console.log(`   GET    /health`);
  });
   } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1); // app band ho jayega agar DB fail hua
  }
};

startServer();
