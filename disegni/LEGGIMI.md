# Come si rifanno le icone della pagina Cura

Qui dentro c'è il foglio originale con i disegni e i due script che li
trasformano nei file che il sito usa davvero. Non serve mai toccarli per
aggiornare il sito: servono solo se cambiano i disegni.

## I file

- `set-icone.jpg` — il foglio come è stato consegnato, sei icone in due
  righe. Ha una casella in meno: manca la **04**, lo stoppino da tagliare.
- `ritaglia.mjs` — ritaglia le sei icone dal foglio, toglie lo sfondo di
  carta e le salva in `src/assets/cura/`.
- `stoppino.mjs` — disegna la **04** mancante, ricalcata sulle misure delle
  altre. Va buttata via appena arriva quella vera.

## Rifarle

Dalla cartella del progetto:

    node disegni/ritaglia.mjs
    node disegni/stoppino.mjs

Poi `npm run build` come sempre.

## Se arriva l'icona 04 vera

Salvala come `src/assets/cura/stoppino.png`, quadrata, 192 pixel di lato,
sfondo trasparente. Non serve altro: il nome nel codice resta quello.

Se invece arriva un foglio nuovo con tutte e sette, sostituisci
`set-icone.jpg`, aggiorna in `ritaglia.mjs` i riquadri della tabella
`celle` (sono le zone in cui cercare ogni disegno) e rilancia lo script.

## Perché non sono file SVG

Sono disegni fatti a immagine, non a vettori: non esiste una versione
SVG da cui partire. Il ritaglio automatico li isola per forma — riconosce
il disegno e lascia fuori il numero stampato sotto al cerchio — e li salva
come PNG a tavolozza, che su un disegno piatto a due colori pesa un quarto
del WebP. Tutte e sette insieme fanno 25 kB.
