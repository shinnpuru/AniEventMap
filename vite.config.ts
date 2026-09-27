import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "/AniEventMap/",
  build: {
    rollupOptions: { output: { manualChunks: { map: ["maplibre-gl"] } } },
  },
});
