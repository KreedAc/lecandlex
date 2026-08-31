/**
 * Controlla che il file di configurazione del pannello sia leggibile.
 *
 * Serve perche' quel file ha una falla silenziosa: se ci si sbaglia a
 * scriverlo, il sito viene su lo stesso — Astro non lo guarda nemmeno — e
 * si rompe solo /admin, cioe' se ne accorge Alessia quando prova a
 * pubblicare, non chi ha fatto il danno. Un errore banale basta: due punti
 * dentro una frase non fra virgolette e il file non si legge piu'.
 *
 * Gira prima di ogni `npm run build` e ferma tutto se qualcosa non torna.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const percorso = 'public/admin/config.yml';
const fermati = (motivo) => {
  console.error(`\n  Il pannello non e' a posto: ${motivo}`);
  console.error(`  File: ${percorso}\n`);
  process.exit(1);
};

let config;
try {
  config = parse(readFileSync(percorso, 'utf8'));
} catch (errore) {
  fermati(`il file non si legge.\n  ${errore.message}`);
}

if (!config?.backend?.name) fermati('manca il backend.');
if (!Array.isArray(config.collections) || config.collections.length === 0) {
  fermati('non c’e’ nessuna sezione da modificare.');
}

for (const sezione of config.collections) {
  if (!sezione.name) fermati('una sezione non ha nome.');
  const gruppi = sezione.files ?? [sezione];
  for (const gruppo of gruppi) {
    for (const campo of gruppo.fields ?? []) {
      if (!campo.name) fermati(`un campo di "${sezione.name}" non ha nome.`);
      if (campo.widget === 'select') {
        const valori = (campo.options ?? []).map((o) => (typeof o === 'string' ? o : o.value));
        if (valori.length === 0) fermati(`il menu "${campo.name}" non ha scelte.`);
        if (campo.default !== undefined && !valori.includes(campo.default)) {
          fermati(
            `il menu "${campo.name}" parte da "${campo.default}", che non e’ fra le scelte.`
          );
        }
      }
    }
  }
}

console.log(`  Pannello a posto: ${config.collections.length} sezioni.`);
