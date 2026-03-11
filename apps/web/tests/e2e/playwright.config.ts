import { defineConfig } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: path.resolve(__dirname),
  testMatch: ["**/*.spec.ts"],
  timeout: 60_000,
  outputDir: "/tmp/illuvrse-playwright",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    browserName: (process.env.PLAYWRIGHT_BROWSER as "chromium" | "firefox" | "webkit") ?? "firefox",
    launchOptions: {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-zygote",
        "--single-process"
      ]
    },
    trace: "retain-on-failure"
  }
});
