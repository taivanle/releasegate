import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // lib/releases.ts imports "server-only", which throws outside React Server Components.
    alias: { "server-only": new URL("./node_modules/server-only/empty.js", import.meta.url).pathname },
  },
});
