import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/api/eurostat/eurostat.live.ts"],
  },
});
