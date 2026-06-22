import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import path from "node:path";

// Load env vars from frontend/.env.local since the canonical file lives there
// but `next` is invoked from this directory. CI provides env via repo
// secrets, so this is a no-op when the file is absent.
loadEnv({ path: path.join(__dirname, "frontend", ".env.local") });

const ignoreBuildErrors = process.env.NEXT_IGNORE_BUILD_ERRORS === "true";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: ignoreBuildErrors ? { ignoreBuildErrors: true } : undefined,
};

export default nextConfig;
