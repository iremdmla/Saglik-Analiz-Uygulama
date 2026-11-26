import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Geliştirmede /api istekleri yerel backend'e yönlendirilir (Docker'da nginx aynı işi yapar)
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8000" } },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: { mui: ["@mui/material", "@emotion/react", "@emotion/styled"], charts: ["recharts"] },
      },
    },
  },
});
