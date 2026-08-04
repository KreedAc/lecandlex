import sito from '../data/sito.json';
import datiFragranze from '../data/fragranze.json';

// Il file e' un oggetto e non un array puro perche' e' cosi' che il CMS
// serializza una lista modificabile da interfaccia.
const fragranze = datiFragranze.fragranze;

export { sito, fragranze };

/**
 * Costruisce un link WhatsApp con il messaggio gia' scritto.
 *
 * E' il pezzo che fa la differenza rispetto a un "contattaci": chi clicca
 * dalla scheda di un prodotto si ritrova la chat aperta con il nome gia'
 * dentro, quindi arrivano richieste concrete invece di "ciao info". Il
 * numero va in formato internazionale senza + e senza spazi.
 */
export function linkWhatsApp(messaggio?: string): string {
  const numero = sito.whatsapp.replace(/\D/g, '');
  const base = `https://wa.me/${numero}`;
  if (!messaggio) return base;
  return `${base}?text=${encodeURIComponent(messaggio)}`;
}

export function messaggioProdotto(nome: string, disponibile: boolean): string {
  return disponibile
    ? `Ciao Alessia! Sono interessato/a a "${nome}". È disponibile?`
    : `Ciao Alessia! Vorrei essere avvisato/a quando "${nome}" torna disponibile.`;
}

export const linkInstagram = `https://instagram.com/${sito.instagram}`;

/** I prezzi vengono dal CMS come numero: la formattazione sta qui, una volta sola. */
export function prezzo(valore: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: valore % 1 === 0 ? 0 : 2,
  }).format(valore);
}

type ConPrezzo = { prezzo?: number; varianti: { prezzo?: number }[] };

/**
 * Molti articoli esistono in piu' taglie. In griglia non ha senso stampare
 * tutti i prezzi: mostriamo "da 3 €" e i dettagli restano nella scheda.
 *
 * Se il prezzo manca del tutto non mostriamo "0 €" — che sarebbe un errore
 * visibile al cliente — ma un'indicazione che invita comunque a scrivere.
 */
export function prezzoEsposto(p: ConPrezzo): string {
  const daVarianti = p.varianti
    .map((v) => v.prezzo)
    .filter((v): v is number => typeof v === 'number');

  if (daVarianti.length > 0) {
    const minimo = Math.min(...daVarianti);
    // Con una taglia sola non serve il "da": e' semplicemente il prezzo.
    return daVarianti.length === 1 ? prezzo(minimo) : `da ${prezzo(minimo)}`;
  }
  if (typeof p.prezzo === 'number') return prezzo(p.prezzo);
  return 'Prezzo su richiesta';
}

/** Il prezzo piu' basso, per i dati strutturati. Undefined se non c'e'. */
export function prezzoMinimo(p: ConPrezzo): number | undefined {
  const tutti = [p.prezzo, ...p.varianti.map((v) => v.prezzo)].filter(
    (v): v is number => typeof v === 'number'
  );
  return tutti.length > 0 ? Math.min(...tutti) : undefined;
}

export const etichettaMateriale: Record<string, string> = {
  cera: 'Cera',
  ceramica: 'Ceramica',
  jesmonite: 'Jesmonite',
  resina: 'Resina',
  vetro: 'Vetro',
  misto: 'Materiali misti',
};
