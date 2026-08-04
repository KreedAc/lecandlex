# Le CandLex

Vetrina per **Le CandLex** di Alessia Vanni — candele scultura, arredo in
ceramica e bomboniere. Sito statico: catalogo diviso per collezioni, contatto
diretto via WhatsApp, contenuti modificabili da browser senza toccare il codice.

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
| Contatti, claim, preavvisi | `src/data/sito.json` |
| Elenco fragranze | `src/data/fragranze.json` |
| I prodotti | `src/content/prodotti/*.md` |
| Le collezioni | `src/content/collezioni/*.md` |
| Foto dei prodotti | `src/assets/prodotti/` |
| Testo "Chi sono" | `src/pages/storia.astro` |
| Avvertenze e refill | `src/pages/cura.astro` |
| Bomboniere e bouquet | `src/pages/eventi.astro` |
| FAQ | `src/pages/contatti.astro` |

### La palette

Tutti i colori vengono da otto variabili in `src/styles/global.css`. Tre sono
ripresi dal catalogo Canva originale (`#af4c0f`, `#33241b`, `#d8d1cb`); gli altri
sono derivati o scuriti per rispettare il contrasto WCAG AA. Il rapporto
verificato è annotato accanto a ciascuna variabile.

### Il modello di un prodotto

Il catalogo non è fatto di candele profumate in barattolo, quindi lo schema
segue quello che identifica davvero un pezzo:

- **materiale** — cera, ceramica, Jesmonite, resina, vetro, misto
- **peso in grammi** e **dimensioni** (sempre base × altezza, come nel catalogo)
- **varianti** — per gli articoli che esistono in più taglie con prezzi diversi
- **stampo esclusivo** — badge per i pezzi il cui stampo è creato da Le CandLex
- **personalizzabile** — colori e composizione su richiesta

Le fragranze non stanno sul singolo prodotto: sono un elenco unico da cui il
cliente sceglie, in `src/data/fragranze.json`.

### Le foto

Vanno in `src/assets/prodotti/` e **non** in `public/`: solo da lì Astro le
converte in WebP/AVIF responsive. Una foto da 4 MB caricata dal telefono viene
servita a circa 20 kB.

Le foto attualmente nel repo sono **ritagli dalle pagine del catalogo Canva**.
Sono utilizzabili ma non ottimali: la risoluzione è quella dell'export, non
dell'originale. Vanno sostituite con le foto sorgente appena disponibili.

## Deploy su Cloudflare Pages

1. Su [Cloudflare Pages](https://pages.cloudflare.com), *Create project* →
   *Connect to Git* → seleziona questo repository
2. Impostazioni di build:
   - **Framework preset**: Astro
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. Variabile d'ambiente: `SITE_URL` con l'indirizzo del sito.

Ogni push sul branch di produzione ridistribuisce il sito automaticamente.

### Passare dal dominio provvisorio a quello definitivo

Si parte con il `.pages.dev` gratuito e si collega il dominio comprato quando
si vuole, senza rifare niente. Al momento del passaggio:

1. Cloudflare Pages → *Custom domains* → aggiungi il dominio
2. Cambia la variabile `SITE_URL` con il nuovo indirizzo e rilancia il deploy
3. Aggiorna `ALLOWED_DOMAINS` nel Worker OAuth, altrimenti il pannello
   `/admin` smette di far entrare

Il dominio vive solo in `SITE_URL`: sitemap, canonical, anteprime social e
`robots.txt` lo seguono da soli. L'unica eccezione è `site_url` in
`public/admin/config.yml`, che serve al link "vedi il sito" dentro il pannello.

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

4. **Accesso** — l'account GitHub di Alessia va aggiunto come collaboratore del
   repository. Da quel momento può modificare tutto da `/admin`, anche dal
   telefono: ogni salvataggio è un commit, e il sito si ricostruisce da solo.

## Da sistemare prima di andare online

- [ ] **Verificare l'handle Instagram** in `src/data/sito.json`: nel catalogo
      poteva essere `le_candlex_lab` o `le__candlex_lab` (uno o due underscore)
- [ ] **Compilare i dati di spedizione**, ora segnati `DA CONFERMARE`: costo,
      soglia di gratuità e tempi non erano nel catalogo
- [ ] Trascrivere i prodotti delle collezioni ancora vuote (vedi sotto)
- [ ] Sostituire le foto ritagliate con gli originali
- [ ] Aggiungere privacy policy e cookie policy se si attivano statistiche
- [ ] Controllare che le etichette riportino gli allergeni richiesti dal
      regolamento CLP (CE 1272/2008) per i prodotti profumati

## Stato del catalogo

Le collezioni sono tutte create. I prodotti sono stati trascritti dal catalogo
Canva a 77 pagine solo per **Collezione Preziosa**; le altre sono elencate sul
sito come «in arrivo online» finché non vengono popolate.

Le pagine del catalogo di partenza sono numerate: il campo `paginaCatalogo` in
ogni prodotto indica da quale pagina provengono i dati, per poterli verificare.
