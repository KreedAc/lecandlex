import sito from '../data/sito.json';

export { sito };

/**
 * Costruisce un link WhatsApp con il messaggio gia' scritto.
 *
 * E' il pezzo che fa la differenza rispetto a un "contattaci": chi clicca
 * dalla scheda di una candela si ritrova la chat aperta con il nome del
 * prodotto gia' dentro, quindi arrivano richieste concrete invece di "ciao
 * info". Il numero va in formato internazionale senza + e senza spazi.
 */
export function linkWhatsApp(messaggio?: string): string {
  const numero = sito.whatsapp.replace(/\D/g, '');
  const base = `https://wa.me/${numero}`;
  if (!messaggio) return base;
  return `${base}?text=${encodeURIComponent(messaggio)}`;
}

export function messaggioCandela(nome: string, disponibile: boolean): string {
  return disponibile
    ? `Ciao! Sono interessato/a alla candela "${nome}". È disponibile?`
    : `Ciao! Vorrei essere avvisato/a quando "${nome}" torna disponibile.`;
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
