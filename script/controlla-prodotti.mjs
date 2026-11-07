/**
 * Ferma la build se una pagina legge i prodotti senza passare da
 * prodottiInVetrina() (src/lib/prodotti.ts).
 *
 * Quella funzione e' cio' che toglie dal sito i prodotti nascosti dal
 * pannello. Una pagina che leggesse i prodotti per conto suo li
 * mostrerebbe tutti, nascosti compresi, e nessuno se ne accorgerebbe
 * finche' un cliente non vede un pezzo che Alessia credeva tolto.
 *
 * Gira prima di ogni `npm run build`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const radice = 'src';
const permesso = join('src', 'lib', 'prodotti.ts');
const letturaDiretta = /\bget(?:Collection|Entry|Entries)\s*\(\s*['"`]prodotti['"`]/;

function file(cartella) {
  return readdirSync(cartella).flatMap((nome) => {
    const percorso = join(cartella, nome);
    if (statSync(percorso).isDirectory()) return file(percorso);
    return /\.(astro|ts|js|mjs|tsx|jsx)$/.test(nome) ? [percorso] : [];
  });
}

const colpevoli = file(radice)
  .filter((f) => f !== permesso)
  .filter((f) => letturaDiretta.test(readFileSync(f, 'utf8')));

if (colpevoli.length) {
  console.error('\n  Questi file leggono i prodotti senza passare da prodottiInVetrina():');
  for (const f of colpevoli) console.error(`    - ${relative('.', f).split(sep).join('/')}`);
  console.error(
    "\n  Cosi' mostrerebbero anche i prodotti nascosti dal pannello. Usa\n" +
      "  prodottiInVetrina() da src/lib/prodotti.ts al posto di getCollection('prodotti').\n"
  );
  process.exit(1);
}

console.log('  Prodotti nascosti: tutte le pagine passano dal filtro.');
