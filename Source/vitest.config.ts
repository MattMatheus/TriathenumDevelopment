import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "app/**/*.test.ts",
      "app/**/*.test.tsx",
      "server/**/*.test.ts",
      "retrieval/**/*.test.ts",
      "world/**/*.test.ts",
      "../Tools/**/*.test.ts",
    ],
    exclude: [
      "e2e/**",
      "dist/**",
      "node_modules/**",
    ],
  },
});
