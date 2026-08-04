# LeCandleX

Vetrina per candele artigianali. Sito statico: catalogo con schede prodotto,
contatto diretto via WhatsApp, contenuti modificabili da browser senza toccare
il codice.

Niente carrello: gli ordini passano da WhatsApp.

## Come funziona

- **Astro 7** genera HTML statico — il browser non riceve nemmeno un byte di JavaScript
- **Tailwind 4** per lo stile, con la palette centralizzata in un solo punto
- **Sveltia CMS** per far aggiornare i contenuti a chi non scrive codice
- **Cloudflare Pages** per l'hosting (gratuito a questi volumi)

## Comandi

```bash
npm install
npm run dev      # anteprima su http://localhost:4321
npm run build    # genera il sito in dist/
npm run check    # controllo dei tipi
```

## Dove si cambiano le cose

| Cosa | Dove |
|---|---|
| Colori e font | `src/styles/global.css`, blocco `@theme` |
| Numero WhatsApp, Instagram, spedizioni | `src/data/sito.json` |
| Le candele | `src/content/candele/*.md` |
| Le collezioni | `src/content/collezioni/*.md` |
| Foto dei prodotti | `src/assets/candele/` |
| Testo della pagina "La storia" | `src/pages/storia.astro` |
| Regole di cura e FAQ | `src/pages/cura.astro`, `src/pages/contatti.astro` |

### La palette

Tutti i colori del sito vengono da otto variabili in `src/styles/global.css`.
Nessun altro file contiene un colore scritto a mano: per cambiare l'identità
visiva si modificano quelle e basta.

I valori attuali sono un segnaposto caldo e neutro. Tutte le combinazioni
testo/sfondo rispettano il contrasto WCAG AA.

### Le foto

Vanno in `src/assets/candele/` e **non** in `public/`: solo da lì Astro le
converte in WebP/AVIF responsive. Una foto da 4 MB caricata dal telefono viene
servita a circa 20 kB.

Formato consigliato: verticale 4:5, lato lungo almeno 1200 px.

## Contenuto di esempio

Le quattro candele, i testi e le foto attualmente nel repo sono **segnaposto**.
Servono a far vedere la struttura e a mostrare come vanno scritte le schede
reali. Le immagini sono gradienti generati, non fotografie.

## Deploy su Cloudflare Pages

1. Su [Cloudflare Pages](https://pages.cloudflare.com), *Create project* →
   *Connect to Git* → seleziona questo repository
2. Impostazioni di build:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. Variabile d'ambiente: `SITE_URL` con il dominio definitivo
   (es. `https://lecandlex.it`). Serve a sitemap, canonical e anteprime social.

Ogni push su `main` ridistribuisce il sito automaticamente.

Dopo aver collegato un dominio personalizzato, aggiorna l'URL della sitemap in
`public/robots.txt`.

## Attivare il CMS

Il pannello sta su `/admin`. Per farlo funzionare serve un piccolo Worker che
gestisca il login GitHub — è gratuito e si configura una volta sola.

1. **GitHub OAuth App** — su GitHub, *Settings* → *Developer settings* →
   *OAuth Apps* → *New OAuth App*.
   - *Homepage URL*: l'indirizzo del sito
   - *Authorization callback URL*: `https://IL-TUO-WORKER.workers.dev/callback`
   - Annota **Client ID** e **Client Secret**

2. **Worker** — clona
   [`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) e
   distribuiscilo su Cloudflare Workers. Imposta come variabili d'ambiente
   (cifrate) `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` e `ALLOWED_DOMAINS`
   con il dominio del sito.

3. **Collega** — in `public/admin/config.yml` sostituisci `base_url` con
   l'indirizzo del Worker, e verifica che `repo` e `branch` siano corretti.

4. **Accesso** — l'account GitHub di chi gestisce il sito va aggiunto come
   collaboratore del repository. Da quel momento può modificare tutto da
   `/admin`, anche dal telefono: ogni salvataggio è un commit, e il sito si
   ricostruisce da solo in un paio di minuti.

## Da sistemare prima di andare online

- [ ] Sostituire la palette in `src/styles/global.css` con i colori reali
- [ ] Sostituire le foto segnaposto in `src/assets/candele/`
- [ ] Compilare `src/data/sito.json` con numero WhatsApp, Instagram ed email veri
- [ ] Riscrivere `src/pages/storia.astro` con le parole della titolare
- [ ] Verificare prezzi, pesi e durate di ogni candela
- [ ] Aggiungere privacy policy e cookie policy se si attivano statistiche
- [ ] Controllare che le etichette dei barattoli riportino gli allergeni
      richiesti dal regolamento CLP (CE 1272/2008) per le candele profumate
