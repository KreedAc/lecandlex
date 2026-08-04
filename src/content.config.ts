import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
// In Astro 7 `z` non si importa piu' da 'astro:content'.
import { z } from 'astro/zod';

/**
 * Il catalogo non e' fatto di candele profumate in barattolo: sono
 * soprattutto candele scultura e complementi d'arredo. Quindi niente note
 * olfattive per prodotto — le fragranze sono un elenco unico da cui il
 * cliente sceglie (src/data/fragranze.json) e valgono per tutto.
 *
 * Quello che identifica davvero un pezzo e': materiale, peso, ingombro.
 */
const materiali = ['cera', 'ceramica', 'jesmonite', 'resina', 'vetro', 'misto'] as const;

/**
 * Molti articoli esistono in piu' taglie con prezzi diversi (Dolce Cuore
 * L/S, Bubble Cube Max/Med/Min). Quando c'e' una sola taglia si compila
 * `prezzo` sul prodotto e si lascia vuoto questo elenco.
 */
const variante = z.object({
  nome: z.string(),
  prezzo: z.number(),
  pesoGrammi: z.number().optional(),
  dimensioni: z.string().optional(),
});

const prodotti = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prodotti' }),
  schema: ({ image }) =>
    z
      .object({
        nome: z.string(),
        collezione: reference('collezioni'),
        prezzo: z.number().optional(),
        varianti: z.array(variante).default([]),

        copertina: image(),
        altCopertina: z.string(),
        galleria: z.array(z.object({ file: image(), alt: z.string() })).default([]),

        materiale: z.enum(materiali).default('cera'),
        pesoGrammi: z.number().optional(),
        // Sempre "base x altezza", come dichiarato nel catalogo.
        dimensioni: z.string().optional(),

        // Badge del catalogo: lo stampo e' disegnato e realizzato da
        // Le CandLex, non comprato. E' il pezzo di differenziazione piu'
        // forte che ha e va mostrato.
        stampoEsclusivo: z.boolean().default(false),
        personalizzabile: z.boolean().default(false),
        profumabile: z.boolean().default(true),

        disponibile: z.boolean().default(true),
        inEvidenza: z.boolean().default(false),
        ordine: z.number().default(100),
        // Vincoli e supplementi: "solo in ceramica", "piedistallo +1€".
        nota: z.string().optional(),
        estratto: z.string().max(180).optional(),
        paginaCatalogo: z.number().optional(),
      })
      .refine((p) => p.prezzo !== undefined || p.varianti.length > 0, {
        message: 'Serve un prezzo, oppure almeno una variante con un prezzo.',
        path: ['prezzo'],
      }),
});

const collezioni = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/collezioni' }),
  schema: ({ image }) =>
    z.object({
      nome: z.string(),
      descrizione: z.string(),
      copertina: image().optional(),
      altCopertina: z.string().optional(),
      ordine: z.number().default(100),
    }),
});

export const collections = { prodotti, collezioni };
