import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // No proxy needed — frontend calls backend directly (CORS is open on the backend)
  // In the packaged .exe the React build is served by FastAPI itself (BASE = "")
});
