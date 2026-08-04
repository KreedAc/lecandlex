import type { APIRoute } from 'astro';

/**
 * robots.txt generato invece che scritto a mano.
 *
 * Conteneva l'URL della sitemap col dominio scritto dentro: al passaggio
 * dal dominio provvisorio a quello definitivo sarebbe rimasto quello
 * vecchio, indicando a Google una sitemap a un indirizzo morto. Cosi'
 * invece segue `site` in astro.config.mjs, che a sua volta legge la
 * variabile SITE_URL impostata su Cloudflare Pages.
 */
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site).href;

  return new Response(
    [
      'User-agent: *',
      'Allow: /',
      // Pagine di servizio: il pannello di gestione e le istruzioni.
      'Disallow: /admin/',
      'Disallow: /guida/',
      '',
      `Sitemap: ${sitemap}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
};
