import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/api/eurostat/eurostat.live.ts"],
    testTimeout: 30_000,
    silent: false,
    reporters: ["verbose"],
  },
});
