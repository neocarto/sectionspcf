import { defineConfig } from "vite";

export default defineConfig({
  base: "/sectionspcf/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
});
