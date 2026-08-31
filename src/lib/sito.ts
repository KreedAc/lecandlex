import type { ImageMetadata } from 'astro';
import sito from '../data/sito.json';
import datiFragranze from '../data/fragranze.json';
import segnaposto from '../assets/segnaposto.jpg';

// Il file e' un oggetto e non un array puro perche' e' cosi' che il CMS
// serializza una lista modificabile da interfaccia.
//
// L'ordine alfabetico si fa qui e non nel file: dal pannello le fragranze
// nuove finiscono in fondo alla lista, ed e' giusto cosi' — chi le
// aggiunge non deve stare a cercare il punto in cui infilarle. A metterle
// in fila ci pensa il sito, a ogni pubblicazione.
//
// Il confronto e' quello italiano: cosi' "È" sta con "E" e le maiuscole
// non passano davanti alle minuscole, come farebbe un ordinamento fatto
// sui codici delle lettere.
const fragranze = [...datiFragranze.fragranze].sort((a, b) =>
  a.localeCompare(b, 'it', { sensitivity: 'base' })
);

export { sito, fragranze };

/**
 * Le foto del sito che non appartengono a un prodotto — per ora solo il
 * ritratto di "Chi sono".
 *
 * Il pannello salva un percorso, tipo "/src/assets/sito/alessia.jpg", non
 * un'immagine. Questo elenco fa da ponte: trasforma quel testo
 * nell'immagine vera, quella che Astro sa ridimensionare e convertire in
 * WebP. Senza, la foto verrebbe servita com'e' uscita dal telefono.
 *
 * La cartella e' solo `sito`, non tutta `assets`: qui dentro finiscono
 * pochi file, mentre le duecento foto dei prodotti resterebbero attaccate
 * a ogni pagina che importa questo modulo.
 */
const fotoDelSito = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/sito/**/*.{jpg,jpeg,png,webp,avif}',
  { eager: true }
);

/**
 * Nota: tutte le foto della cartella finiscono nella cartella pubblicata,
 * anche quelle non piu' usate — provata la versione "pigra" del glob, non
 * cambia niente, gli originali vengono emessi lo stesso. Non pesano su
 * chi visita il sito, perche' nessuna pagina le richiama; occupano solo
 * spazio nel deposito. Per tenere pulito basta cancellare la vecchia
 * dalla libreria del pannello quando se ne carica una nuova.
 *
 * Se il percorso non porta a niente — campo svuotato, file rinominato a
 * mano, refuso — si ripiega sul segnaposto invece di fermare la
 * pubblicazione. Una foto sbagliata si vede e si cambia dal pannello; un
 * sito che non si aggiorna piu' no.
 */
function fotoDelSitoOppure(percorso: unknown, ripiego: ImageMetadata): ImageMetadata {
  if (typeof percorso !== 'string') return ripiego;
  return fotoDelSito[percorso.trim()]?.default ?? ripiego;
}

/** Il ritratto di "Chi sono", in home e nella pagina Chi sono. */
export const ritratto = fotoDelSitoOppure((sito as { ritratto?: string }).ritratto, segnaposto);

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

/**
 * Dove il sito puo' mostrare i prezzi.
 *
 * `pubblici`    — ovunque, come in un catalogo normale.
 * `solo-scheda` — non nelle griglie; solo aprendo il singolo prodotto.
 * `nascosti`    — mai: ovunque si legge "Prezzo su richiesta".
 *
 * Sta in sito.json e non nel codice perche' e' una scelta destinata a
 * cambiare: si sposta dal pannello, come tutto il resto.
 *
 * Un valore non riconosciuto — campo svuotato per sbaglio, refuso —
 * ricade su `nascosti`. Fra i due modi di sbagliare, un prezzo che non
 * si vede si nota e si sistema; uno che compare quando non doveva, no.
 */
export type ModoPrezzi = 'pubblici' | 'solo-scheda' | 'nascosti';

const modiPrezzi: readonly ModoPrezzi[] = ['pubblici', 'solo-scheda', 'nascosti'];

const scelto = (sito as { prezzi?: string }).prezzi;
export const modoPrezzi: ModoPrezzi = modiPrezzi.includes(scelto as ModoPrezzi)
  ? (scelto as ModoPrezzi)
  : 'nascosti';

/**
 * Se una cifra in euro puo' comparire nel testo del sito: griglie,
 * intestazioni di collezione, tabella dei formati, costo di spedizione,
 * soglia dell'omaggio. Vero solo a prezzi pubblici.
 *
 * Le due eccezioni sono la riga sotto il nome del prodotto e la foto a
 * schermo intero, che hanno una regola loro qui sotto.
 */
export const prezziInGriglia = modoPrezzi === 'pubblici';

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

/**
 * Il prezzo per la griglia, oppure niente.
 *
 * Quando non si mostra, la riga sparisce del tutto invece di lasciare al
 * suo posto una scritta: nessun cartello che spieghi dove sia finito il
 * numero. Le card restano allineate perche' la riga cade per tutte
 * insieme, mai per una si' e una no.
 */
export function prezzoInGriglia(p: ConPrezzo): string | null {
  return prezziInGriglia ? prezzoEsposto(p) : null;
}

/**
 * Il prezzo sotto il nome del prodotto, oppure niente.
 *
 * A `solo-scheda` non compare qui: sta nella foto a schermo intero, che si
 * apre toccando l'immagine. A `nascosti` resta "Prezzo su richiesta", che
 * e' l'unico modo onesto di dire che un prezzo esiste ma non si pubblica.
 */
export function prezzoSottoIlNome(p: ConPrezzo): string | null {
  if (modoPrezzi === 'pubblici') return prezzoEsposto(p);
  if (modoPrezzi === 'nascosti') return 'Prezzo su richiesta';
  return null;
}

/** Il prezzo dentro la foto a schermo intero. Solo dove serve davvero. */
export function prezzoNellaFoto(p: ConPrezzo): string | null {
  return modoPrezzi === 'solo-scheda' ? prezzoEsposto(p) : null;
}

/** Una cifra in euro scritta in mezzo a una frase: "15 €", "€ 15", "15 euro". */
const cifraInEuro = /(?:€\s*\d|\d[\d.,]*\s*(?:€|eur(?:o|os)?\b))/i;

/**
 * La nota del prodotto, senza le frasi che contengono un prezzo.
 *
 * La nota e' testo libero: "Con piattino 3,50 €", "La coppia 20 €". Sono
 * prezzi a tutti gli effetti, e nessun interruttore sui campi numerici li
 * avrebbe intercettati. Si tolgono a frasi intere invece che a parole,
 * cosi' quello che resta e' ancora italiano: da "La coppia 15 €. Alberello
 * da 25 g." sopravvive la seconda meta', che non parla di soldi.
 *
 * Vale anche per quello che verra' scritto domani: se il prezzo torna
 * dentro una nota mentre i prezzi sono spenti, sparisce da solo.
 */
export function notaVisibile(nota?: string): string | undefined {
  if (!nota || prezziInGriglia) return nota;

  const rimaste = nota
    .split(/(?<=[.!?])\s+/)
    .filter((frase) => !cifraInEuro.test(frase))
    .join(' ')
    .trim();

  return rimaste === '' ? undefined : rimaste;
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
