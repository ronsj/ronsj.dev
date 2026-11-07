// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ronsj.dev',
  adapter: cloudflare(),
  // Nothing uses sessions, and leaving them on makes the adapter add a SESSION KV binding that PR
  // Previews can't deploy without a namespace id (production auto-provisions one; Previews don't).
  session: false,
  build: {
    // One page, one 5 KB (gzipped) stylesheet that every section needs at once: inline it rather than
    // block first paint on a separate request.
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: {
    enabled: false,
  },

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Manrope',
      cssVariable: '--font-manrope',
      weights: [400, 500, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Helvetica', 'Arial', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Sora',
      cssVariable: '--font-sora',
      weights: [700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Helvetica', 'Arial', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'DM Mono',
      cssVariable: '--font-dm-mono',
      weights: [500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
    },
  ],

  integrations: [react(), sitemap()],
});
