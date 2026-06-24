import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Agent doctrine is read from disk at runtime; force the files into the
  // serverless bundle for the agent cron routes (they are not statically
  // imported, so Next's tracer would otherwise miss them).
  // Agent doctrine is read from disk at runtime; force the files into the
  // serverless bundle for every route that runs an agent (cron job, the AI-Team
  // Run-now action, and the content pipeline's Draft action).
  outputFileTracingIncludes: {
    "/api/cron/agents/content": ["./doctrine/**/*"],
    "/ai-team": ["./doctrine/**/*"],
    "/gtm/content": ["./doctrine/**/*"],
  },
};

export default nextConfig;
