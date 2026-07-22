import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // These two suites intentionally use node:test and run through `vp test:node`.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.open-next/**",
      "lib/oracle/responseSafety.test.ts",
      "src/lib/oracle/astroIntel.test.ts",
    ],
  },
});
