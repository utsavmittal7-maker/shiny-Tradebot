import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// base is set for GitHub Pages project hosting (served under /shiny-Tradebot/).
// Override with VITE_BASE="/" for local/root deploys.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/shiny-Tradebot/",
  plugins: [react()],
});
