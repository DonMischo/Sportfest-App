import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/students":    "http://localhost:8080",
      "/disciplines": "http://localhost:8080",
      "/results":     "http://localhost:8080",
      "/auswertung":  "http://localhost:8080",
    },
  },
});
