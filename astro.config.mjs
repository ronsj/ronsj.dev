// @ts-check
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://ronsj.dev",
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: {
    enabled: false,
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Manrope",
      cssVariable: "--font-manrope",
      weights: [400, 500, 800],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["Helvetica", "Arial", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "Sora",
      cssVariable: "--font-sora",
      weights: [700, 800],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["Helvetica", "Arial", "sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "DM Mono",
      cssVariable: "--font-dm-mono",
      weights: [500],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "SF Mono", "Menlo", "monospace"],
    },
  ],
});
