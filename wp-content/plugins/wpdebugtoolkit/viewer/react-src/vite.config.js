import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/index.js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          if (ext === "css") {
            return `assets/style.css`;
          }
          // Put images in the assets/images directory
          if (/\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name)) {
            return `assets/images/[name][extname]`;
          }
          return `assets/[name][extname]`;
        },
      },
    },
    cssCodeSplit: false,
  },
  server: {
    proxy: {
      "/api.php": {
        // Use relative URL for production, specific URL only for development
        target:
          process.env.NODE_ENV === "production" ? "/" : "http://localhost",
        changeOrigin: true,
      },
    },
  },
});
