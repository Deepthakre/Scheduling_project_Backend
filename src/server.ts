import app from "./app";
import { connectDB } from "./config/db";
import { ENV } from "./config/env";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const startServer = async () => {
  await connectDB();

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
};

startServer();
