import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Esto fuerza a usar la copia de React de tu nodo raíz
      react: path.resolve("./node_modules/react"),
      "react-dom": path.resolve("./node_modules/react-dom"),
    },
  },

  // === PROXY PARA BACKEND ===
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:2001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

