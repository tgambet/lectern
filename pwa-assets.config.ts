import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";
import { colorToken } from "./config/tokens.ts";

// Used by scripts/logo-alt-icons.ts only.
// The raster icons are a paper-colored mark on an accent square: the mark stays
// readable on any launcher or tab background, light or dark. The generator only
// paints a background on maskable and apple icons, so the 64/192/512 icons come
// from the maskable pipeline (mark inside the central 80%, per the brand book).
const background = colorToken("accent").light;

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    transparent: { sizes: [], favicons: [[48, "favicon.ico"]] },
    maskable: { sizes: [64, 192, 512], padding: 0.2, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, padding: 0.15, resizeOptions: { background } },
    assetName: (type, size) => {
      if (type === "maskable") {
        return size.width === 512
          ? "maskable-icon-512x512.png"
          : `pwa-${size.width}x${size.height}.png`;
      }
      return `apple-touch-icon-${size.width}x${size.height}.png`;
    },
  },
});
