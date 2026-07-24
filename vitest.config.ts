import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup-env.ts"],
    // Integration tests share ONE real Postgres test DB — run files serially.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
  resolve: {
    // "@" matches "@/..." only (not "@prisma/..."), per @rollup/plugin-alias boundary rules.
    alias: { "@": path.resolve(__dirname) },
  },
});
