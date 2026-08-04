import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
// In Astro 7 `z` non si importa piu' da 'astro:content'.
import { z } from 'astro/zod';

/**
 * SCHEMA PERMISSIVO — E' UNA SCELTA, NON UNA DIMENTICANZA
 *
 * Questo sito viene aggiornato da chi non scrive codice e non ha nessuno
 * a cui chiedere aiuto. Se un campo mancante facesse fallire la build, il
 * sito smetterebbe di aggiornarsi senza che nessuno capisca perche'.
 *
 * Quindi: qui e' obbligatorio solo il nome. Tutto il resto ha un
 * comportamento sensato quando manca (foto segnaposto, "prezzo su
 * richiesta", prodotto raggruppato tra gli altri). La severita' sta nel
 * form del CMS, dove l'errore si vede subito e si corregge, non nella
 * build, dove l'errore e' invisibile e blocca tutto.
 */
const materiali = ['cera', 'ceramica', 'jesmonite', 'resina', 'vetro', 'misto'] as const;

const variante = z.object({
  nome: z.string().default('Formato unico'),
  prezzo: z.number().optional(),
  pesoGrammi: z.number().optional(),
  dimensioni: z.string().optional(),
});

const prodotti = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prodotti' }),
  schema: ({ image }) =>
    z.object({
      nome: z.string(),

      // Se la collezione viene rinominata o cancellata il prodotto non
      // sparisce e non rompe niente: finisce in fondo al catalogo.
      collezione: reference('collezioni').optional(),

      prezzo: z.number().optional(),
      varianti: z.array(variante).default([]),

      // Senza foto il prodotto mostra un segnaposto pulito.
      copertina: image().optional(),
      altCopertina: z.string().optional(),
      galleria: z
        .array(z.object({ file: image().optional(), alt: z.string().optional() }))
        .default([]),

      materiale: z.enum(materiali).default('cera'),
      pesoGrammi: z.number().optional(),
      // Sempre "base x altezza", come dichiarato nel catalogo.
      dimensioni: z.string().optional(),

      // Badge del catalogo: lo stampo e' disegnato e realizzato da
      // Le CandLex, non comprato.
      stampoEsclusivo: z.boolean().default(false),
      personalizzabile: z.boolean().default(false),
      profumabile: z.boolean().default(true),

      disponibile: z.boolean().default(true),
      inEvidenza: z.boolean().default(false),
      ordine: z.number().default(100),
      nota: z.string().optional(),
      // Nessun limite di lunghezza: un testo troppo lungo si tronca da
      // solo con le CSS, non deve far fallire la pubblicazione.
      estratto: z.string().optional(),
      paginaCatalogo: z.number().optional(),
    }),
});

const collezioni = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/collezioni' }),
  schema: ({ image }) =>
    z.object({
      nome: z.string(),
      descrizione: z.string().optional(),
      copertina: image().optional(),
      altCopertina: z.string().optional(),
      ordine: z.number().default(100),
    }),
});

export const collections = { prodotti, collezioni };
