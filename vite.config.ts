import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { classicTripPages } from "./classic-trips.plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), classicTripPages()],
  base: process.env.BASE_PATH || "/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
