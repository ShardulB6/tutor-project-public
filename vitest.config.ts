import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

// Security tests exercise database queries in SQLite without starting Workers.
export default defineConfig({
  resolve: { alias: { "#": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["tests/**/*.test.{ts,tsx}"], environment: "node", clearMocks: true },
});
