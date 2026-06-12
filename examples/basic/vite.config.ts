import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/gameplay-tags/" : "/",
  resolve: {
    alias: {
      "@potionify/gameplay-tags": fileURLToPath(new URL("../../packages/gameplay-tags/src/index.ts", import.meta.url))
    }
  }
});
