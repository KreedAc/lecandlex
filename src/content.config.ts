import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
// In Astro 7 `z` non si importa piu' da 'astro:content'.
import { z } from 'astro/zod';

/**
 * SCHEMA TOLLERANTE — E' UNA SCELTA, NON UNA DIMENTICANZA
 *
 * Questo sito viene aggiornato da chi non scrive codice e non ha nessuno a
 * cui chiedere aiuto. Se un valore inatteso fa fallire la build, il sito
 * smette di aggiornarsi e nessuno capisce perche': si continua a premere
 * Pubblica e non succede niente.
 *
 * E' gia' successo. Il pannello, per un campo lasciato in bianco, non lo
 * omette: ci scrive dentro `null` o una stringa vuota. Lo schema accettava
 * "campo assente" ma non "campo presente e vuoto", e un prodotto con le
 * varianti — che per forza ha il prezzo singolo vuoto — ha bloccato tutto,
 * comprese le modifiche fatte dopo.
 *
 * Da qui la regola: prima di validare, ogni campo viene normalizzato e i
 * valori vuoti diventano "non compilato". Si usa `preprocess` e non
 * `transform` perche' deve accadere PRIMA del controllo di tipo: dopo
 * sarebbe troppo tardi, il valore vuoto e' gia' passato.
 *
 * La severita' sta nel form del CMS, dove l'errore si vede subito e si
 * corregge, non nella build, dove e' invisibile e ferma il sito.
 */

/** null, stringa vuota e spazi contano tutti come "non compilato". */
const svuota = (v: unknown) =>
  v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v;

/** Numero. Accetta anche i numeri scritti come testo, con la virgola. */
const numero = z.preprocess((v) => {
  const x = svuota(v);
  if (typeof x === 'string') {
    const n = Number(x.replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  }
  return typeof x === 'number' && Number.isFinite(x) ? x : undefined;
}, z.number().optional());

/** Numero con un valore predefinito quando manca. */
const numeroCon = (predefinito: number) =>
  z.preprocess((v) => {
    const x = svuota(v);
    if (typeof x === 'string') {
      const n = Number(x.replace(',', '.'));
      return Number.isFinite(n) ? n : predefinito;
    }
    return typeof x === 'number' && Number.isFinite(x) ? x : predefinito;
  }, z.number());

/** Testo. */
const testo = z.preprocess(svuota, z.string().optional());

/** Testo con un valore predefinito quando manca. */
const testoCon = (predefinito: string) =>
  z.preprocess((v) => svuota(v) ?? predefinito, z.string());

/** Interruttore: qualunque cosa non sia vero/falso vale il predefinito. */
const interruttore = (predefinito: boolean) =>
  z.preprocess((v) => (typeof v === 'boolean' ? v : predefinito), z.boolean());

/** Elenco: null e valori strani diventano un elenco vuoto. */
const elenco = <T extends z.ZodTypeAny>(voce: T) =>
  z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(voce));

const materiali = ['cera', 'ceramica', 'jesmonite', 'resina', 'vetro', 'misto'] as const;

const prodotti = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prodotti' }),
  schema: ({ image }) => {
    /** Immagine. Senza foto il prodotto mostra il segnaposto. */
    const immagine = z.preprocess(svuota, image().optional());

    const variante = z.object({
      nome: testoCon('Formato unico'),
      prezzo: numero,
      pesoGrammi: numero,
      dimensioni: testo,
    });

    return z.object({
      nome: testoCon('Senza nome'),

      // Se la collezione viene rinominata o cancellata il prodotto non
      // sparisce e non rompe niente: finisce in fondo al catalogo.
      collezione: z.preprocess(svuota, reference('collezioni').optional()),

      prezzo: numero,
      varianti: elenco(variante),

      copertina: immagine,
      altCopertina: testo,
      galleria: elenco(z.object({ file: immagine, alt: testo })),

      materiale: z.preprocess((v) => {
        const x = svuota(v);
        return typeof x === 'string' && (materiali as readonly string[]).includes(x) ? x : 'cera';
      }, z.enum(materiali)),

      pesoGrammi: numero,
      // Sempre "base x altezza", come dichiarato nel catalogo.
      dimensioni: testo,

      // Badge del catalogo: lo stampo e' disegnato e realizzato da
      // Le CandLex, non comprato.
      stampoEsclusivo: interruttore(false),
      personalizzabile: interruttore(false),
      profumabile: interruttore(true),

      disponibile: interruttore(true),
      inEvidenza: interruttore(false),
      ordine: numeroCon(100),
      nota: testo,
      estratto: testo,
      paginaCatalogo: numero,
    });
  },
});

const collezioni = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/collezioni' }),
  schema: ({ image }) =>
    z.object({
      nome: testoCon('Senza nome'),
      descrizione: testo,
      copertina: z.preprocess(svuota, image().optional()),
      altCopertina: testo,
      ordine: numeroCon(100),
    }),
});

export const collections = { prodotti, collezioni };
