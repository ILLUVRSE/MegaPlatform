import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const axeCorePath = require.resolve("axe-core", {
  paths: [path.resolve(__dirname, "../../../packages/design-system")]
});

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    include: [
      "tests/accessibility/**/*.test.ts",
      "tests/accessibility/**/*.test.tsx",
      "tests/chaos/**/*.test.ts",
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
      "tests/perf/**/*.test.ts",
      "tests/e2e/**/*.test.ts"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "coverage"
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".."),
      "@illuvrse/db": path.resolve(__dirname, "../../../packages/db/src/index.ts"),
      "@illuvrse/world-state": path.resolve(__dirname, "../../../packages/world-state/src/index.ts"),
      "@illuvrse/media-corp-core": path.resolve(__dirname, "../../../packages/media-corp-core/src/index.ts"),
      "@illuvrse/media-corp-canon": path.resolve(__dirname, "../../../packages/media-corp-canon/src/index.ts"),
      "@illuvrse/media-corp-memory": path.resolve(__dirname, "../../../packages/media-corp-memory/src/index.ts"),
      "@illuvrse/media-corp-scoring": path.resolve(__dirname, "../../../packages/media-corp-scoring/src/index.ts"),
      "@illuvrse/media-corp-workflows": path.resolve(__dirname, "../../../packages/media-corp-workflows/src/index.ts"),
      "@illuvrse/media-corp-agents": path.resolve(__dirname, "../../../packages/media-corp-agents/src/index.ts"),
      "@illuvrse/media-corp-orchestrator": path.resolve(__dirname, "../../../packages/media-corp-orchestrator/src/index.ts"),
      "@illuvrse/observability": path.resolve(__dirname, "../../../packages/observability/opentelemetry-init.ts"),
      "axe-core": axeCorePath
    }
  }
});
