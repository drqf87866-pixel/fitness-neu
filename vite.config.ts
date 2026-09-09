import path from "node:path";
import { rmSync } from "node:fs";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

function omitDevVarsFromBuild(): Plugin {
  return {
    name: "omit-dev-vars-from-build-output",
    apply: "build",
    writeBundle() {
      rmSync(path.join(this.environment.config.build.outDir, ".dev.vars"), { force: true });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    omitDevVarsFromBuild(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Fitness Neu",
        short_name: "Fitness",
        description: "Cloudflare Fitness Tracker",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        lang: "de",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          // Eigenes maskable-Icon: bei "any maskable" auf einem Icon beschneiden
          // Android-Launcher das Motiv, weil die Safe-Zone fehlt.
          {
            src: "/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,svg,ico,woff2,png,jpg,jpeg,webp}"],
        // Nur lesende Katalog-Requests cachen. Auth/Sessions/Analytics bleiben
        // immer NetworkOnly, sonst liefert der SW bei langsamem Netz (>4s)
        // 24h alte /me-/open-/Volumen-Stände zurück.
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" && url.pathname.startsWith("/api/exercises"),
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "exercises-cache",
              networkTimeoutSeconds: 4,
              cacheableResponse: {
                statuses: [200],
              },
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/client"),
      "@shared": path.resolve(__dirname, "./src/shared"),
    },
  },
});
