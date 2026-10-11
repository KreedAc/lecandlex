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

1. Cloudflare → il Worker → *Domains & Routes* → aggiungi il dominio
2. Cambia la variabile `SITE_URL` con il nuovo indirizzo e rilancia il deploy
3. Aggiorna `base_url` e `site_url` in `public/admin/config.yml`

Il dominio vive in `SITE_URL`: sitemap, canonical, anteprime social e
`robots.txt` lo seguono da soli. Le uniche righe da cambiare a mano sono
quelle in `public/admin/config.yml`, perché è un file statico letto dal
browser e non passa dalla build.

## Attivare il CMS

Il pannello sta su `/admin`. Si entra con **nome utente e password**, gestiti
dallo stesso Worker che serve il sito (`worker/index.js`): non serve
distribuire nulla di separato, e chi entra non ha bisogno di un account
GitHub.

1. **Chiave GitHub** — dal tuo account (il proprietario del repository):
   *Settings* → *Developer settings* → *Personal access tokens* →
   *Fine-grained tokens* → *Generate new token*.
   - *Repository access*: solo `KreedAc/lecandlex`
   - *Permissions*: *Contents: Read and write*
   - *Expiration*: *No expiration*

   Serve perché il sito vive su GitHub: ogni «Pubblica» del pannello è una
   modifica scritta nel repository. Nome e password dicono al sito chi sei;
   la chiave è come il sito si presenta a GitHub. Chi entra non la vede mai.

2. **Segreti** — su Cloudflare, nel Worker: *Settings* → scorri **sotto** il
   riquadro «Build» → *Variables and Secrets*. Tre voci, tutte di tipo
   **Secret**:
   - `PANNELLO_UTENTE` — il nome utente
   - `PANNELLO_PASSWORD` — almeno 12 caratteri, altrimenti il login si
     rifiuta di partire. Non c'è un contatore dei tentativi: la difesa è la
     lunghezza.
   - `PANNELLO_TOKEN_GITHUB` — la chiave del punto 1

   Attenzione a non metterli nel riquadro «Build»: lì servono solo a
   costruire il sito e il Worker non li vede. Se succede, la finestra di
   accesso lo dice ed elenca i nomi che il Worker vede davvero.

3. **Collega** — in `public/admin/config.yml` verifica che `base_url` sia
   l'indirizzo del sito e che `repo` e `branch` siano corretti.

Da quel momento si modifica tutto da `/admin`, anche dal telefono: ogni
salvataggio è un commit, e il sito si ricostruisce da solo.

Da sapere:

- le modifiche salvate dal pannello risultano fatte dal proprietario della
  chiave, perché è lui che GitHub vede;
- se la chiave scade o viene revocata, la finestra di accesso lo dice in
  chiaro invece di far fallire il pannello in silenzio;
- per cambiare password basta aggiornare `PANNELLO_PASSWORD` su Cloudflare;
- il pulsante del pannello si chiamerebbe «Accedi con GitHub»: lo rinomina
  in «Accedi» un piccolo script in `public/admin/index.html`, che nasconde
  anche l'accesso con token.

Il Worker espone solo `/auth`; tutto il resto viene servito come sito
statico. Nessuna credenziale sta nel repository.

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
