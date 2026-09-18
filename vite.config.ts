import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * API-et (innlogging, programmer og tale-til-tekst) ligger i server/ og kjører
 * på egen port. Alt under /api videresendes dit, også i utvikling.
 */
const apiTarget = process.env.FORM_API_URL || "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: false,
      },
    },
  },
});
