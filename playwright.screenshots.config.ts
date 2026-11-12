import { defineConfig } from "@playwright/test";
import base from "./playwright.config.ts";

export default defineConfig({ ...base, testDir: "tests/screenshots", retries: 0 });
