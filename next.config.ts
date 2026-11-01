import type { NextConfig } from "next";
import path from "node:path";

const netlify = process.env.FOUNDIT_DEPLOY_TARGET === "netlify";
const nextConfig: NextConfig = {
  distDir: netlify ? ".next-netlify" : ".next",
  ...(netlify ? { env: { FOUNDIT_DEPLOY_TARGET: "netlify" } } : {}),
  outputFileTracingRoot: process.cwd(),
  webpack(config, { webpack }) {
    if (netlify) config.plugins.push(new webpack.NormalModuleReplacementPlugin(
      /^@\/lib\/server\/runtime$/, path.resolve("lib/server/netlify/runtime.ts"),
    ));
    return config;
  },
};

export default nextConfig;
