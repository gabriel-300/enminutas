import { defineConfig } from "vitest/config";
import path from "node:path";

// Sólo tests unitarios de lógica pura (lib/): no hace falta jsdom ni el plugin de React.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
