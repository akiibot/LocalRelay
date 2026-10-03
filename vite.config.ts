import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icons/*.png", "models/v1/*", "data/operators/*.json"],
      manifest: {
        name: "LocalRelay",
        short_name: "LocalRelay",
        description:
          "Prepare and interpret supported requests offline; exchange them by SMS when cellular service is available.",
        theme_color: "#146b63",
        background_color: "#f7f5ee",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,json,bin,webmanifest,svg}"],
        navigateFallbackAllowlist: [
          /^\/$/,
          /^\/operators(?:\/[^/]+)?$/,
          /^\/request\/[^/]+$/,
          /^\/reply\/[^/]+$/,
          /^\/(?:outbox|evaluation|diagnostics|simulate)$/,
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.ts", "tests/component/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
  },
});
