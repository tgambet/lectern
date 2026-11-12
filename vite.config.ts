import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, lazyPlugins } from "vite-plus";
import { brandWebAssets as brand } from "./config/brand.ts";
import { buildTarget } from "./config/targets.ts";
import { colorToken } from "./config/tokens.ts";
import { brandAssets, csp, themeColor, workerConditions } from "./config/vite-plugins.ts";

const paper = colorToken("paper");

export default defineConfig({
  build: {
    target: buildTarget,
    cssTarget: buildTarget,
    // The polyfill fetches modules, which `connect-src 'none'` forbids. Chrome needs none.
    modulePreload: { polyfill: false },
    rollupOptions: {
      // The design system for HTML documents is a second, CSS-only entry with a stable name.
      input: { index: "index.html", "lectern-doc": "src/styles/doc.css" },
      output: {
        assetFileNames: (asset) =>
          asset.names.some((n) => n === "lectern-doc.css")
            ? "lectern-doc.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
  fmt: {
    ignorePatterns: ["design/**", "THIRD_PARTY_LICENSES/**"],
  },
  lint: {
    ignorePatterns: ["design/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  worker: {
    format: "es",
    plugins: () => [workerConditions()],
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.ts"],
  },
  plugins: lazyPlugins(() => [
    preact(),
    csp(),
    brandAssets(),
    themeColor(paper),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src/sw",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
      // The virtual file server is needed in development too.
      devOptions: { enabled: true, type: "module" },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png,ico}"],
      },
      manifest: {
        id: "/",
        name: "Lectern",
        short_name: "Lectern",
        description: "Your docs, read where they live.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: paper.light,
        background_color: paper.light,
        icons: [
          { src: `/${brand.icon192}`, sizes: "192x192", type: "image/png" },
          { src: `/${brand.icon512}`, sizes: "512x512", type: "image/png" },
          {
            src: `/${brand.maskable512}`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ]),
});
