// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Cambia questo con il dominio definitivo prima del deploy in produzione.
// Serve a sitemap, canonical URL e Open Graph.
const site = process.env.SITE_URL ?? 'https://lecandlex.pages.dev';

export default defineConfig({
  site,
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // Le foto delle candele sono il contenuto principale: le serviamo
    // in AVIF/WebP responsive invece dei JPEG originali da 4 MB.
    responsiveStyles: true,
    layout: 'constrained',
  },
});
