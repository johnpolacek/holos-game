import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@holos/protocol": fileURLToPath(
        new URL("../server/src/protocol.ts", import.meta.url),
      ),
    },
  },
  server: {
    host: true,
  },
});
