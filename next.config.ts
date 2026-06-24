import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Agent doctrine is read from disk at runtime; force the files into the
  // serverless bundle for the agent cron routes (they are not statically
  // imported, so Next's tracer would otherwise miss them).
  outputFileTracingIncludes: {
    "/api/cron/agents/content": ["./doctrine/**/*"],
  },
};

export default nextConfig;
