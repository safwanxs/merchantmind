import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", coverage: { provider: "v8", reporter: ["text", "html"], include: ["lib/**/*.ts", "app/api/**/*.ts"] } },
  resolve: { alias: { "@": path.resolve(__dirname, "."), "server-only": path.resolve(__dirname, "test/server-only.ts") } },
});
