import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// One config for the dev server, the build and Vitest: tests see the same
// plugins and aliases as the app.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { tsconfigPaths: true },
  server: {
    // The browser only ever talks to its own origin, so the session cookie is
    // first-party and there is no CORS to configure. Vite forwards /api to Go.
    proxy: { "/api": "http://127.0.0.1:8080" },
  },
  preview: { port: 5173, strictPort: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
