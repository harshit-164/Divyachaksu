import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5181,
    strictPort: false,
    proxy: {
      "/api": "http://127.0.0.1:8800",
      "/ws": {
        target: "ws://127.0.0.1:8800",
        ws: true,
      },
    },
  },
});
