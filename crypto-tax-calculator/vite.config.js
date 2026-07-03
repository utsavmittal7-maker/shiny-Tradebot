import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// Defaults to "/" for root-domain hosts (Vercel, Netlify, Cloudflare, local).
// The GitHub Pages workflow sets VITE_BASE="/shiny-Tradebot/" for project hosting.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
});
