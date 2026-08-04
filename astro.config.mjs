// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// L'unico posto in cui vive il dominio. Serve a sitemap, canonical URL,
// anteprime social e robots.txt.
//
// Il valore qui sotto e' solo il ripiego per lo sviluppo in locale: in
// produzione si imposta SITE_URL nelle variabili d'ambiente di Cloudflare
// Pages. Quando si passa dal dominio provvisorio .pages.dev a quello
// definitivo basta cambiare quella variabile e rilanciare il deploy —
// nessun file da toccare.
const site = process.env.SITE_URL ?? 'https://lecandlex.pages.dev';

export default defineConfig({
  site,
  integrations: [
    sitemap({
      // Le pagine di servizio hanno gia' il noindex: tenerle anche in
      // sitemap sarebbe un segnale contraddittorio per i motori.
      filter: (pagina) => !pagina.includes('/guida'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    // Di default Astro mette CSS, font e immagini in `_astro`. Il nome
    // inizia con underscore, e diverse piattaforme di hosting trattano in
    // modo speciale i percorsi che cominciano cosi'. Una cartella dal nome
    // normale toglie di mezzo un'intera classe di problemi di deploy.
    assets: 'risorse',
  },
  image: {
    // Le foto delle candele sono il contenuto principale: le serviamo
    // in AVIF/WebP responsive invece dei JPEG originali da 4 MB.
    responsiveStyles: true,
    layout: 'constrained',
  },
});
