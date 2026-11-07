import { getCollection, type CollectionEntry } from 'astro:content';

export type Prodotto = CollectionEntry<'prodotti'>;

/**
 * I prodotti che il sito mostra: tutti, tranne quelli che Alessia ha
 * nascosto dal pannello con "Nascondi dal sito".
 *
 * E' l'UNICO posto in cui il sito legge i prodotti. Un prodotto nascosto
 * deve sparire da tutto — catalogo, pagina della collezione, prima pagina,
 * "dalla stessa collezione", conteggi nella barra delle collezioni, e la
 * sua scheda, che non viene proprio costruita — e se ogni pagina lo
 * filtrasse per conto suo, basterebbe dimenticarsene una perche' ricompaia.
 * Per questo `script/controlla-prodotti.mjs` ferma la build se qualcuno
 * legge i prodotti in un altro modo.
 *
 * Nascosto non vuol dire cancellato: il file resta dov'e', con foto e
 * prezzi, e spegnendo l'interruttore torna tutto com'era.
 */
export function prodottiInVetrina(): Promise<Prodotto[]> {
  return getCollection('prodotti', ({ data }) => !data.nascosto);
}
