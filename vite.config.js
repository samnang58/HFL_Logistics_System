
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/hfl/",
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [
      "brave-creation-production-4836.up.railway.app",
    ],
  },
});

