import type { NextConfig } from "next";

const config: NextConfig = {
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  distDir: process.env.E2E_TEST === "1" ? ".next-e2e"
    : process.env.BUILD_CHECK === "1" ? ".next-build" : ".next",
};

export default config;
