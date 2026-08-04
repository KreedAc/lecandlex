import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
// In Astro 7 `z` non si importa piu' da 'astro:content'.
import { z } from 'astro/zod';

/**
 * Le note olfattive si leggono in tre tempi: quello che senti appena apri
 * il barattolo (testa), quello che resta mentre brucia (cuore) e quello
 * che rimane nella stanza dopo (fondo). E' il linguaggio della profumeria
 * ed e' il modo piu' credibile di descrivere una candela a parole.
 */
const noteOlfattive = z.object({
  testa: z.array(z.string()).default([]),
  cuore: z.array(z.string()).default([]),
  fondo: z.array(z.string()).default([]),
});

const candele = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/candele' }),
  schema: ({ image }) =>
    z.object({
      nome: z.string(),
      collezione: reference('collezioni').optional(),
      prezzo: z.number(),
      // Le foto passano da image() e non da una stringa: cosi' Astro le
      // converte in AVIF/WebP responsive invece di servire l'originale.
      copertina: image(),
      galleria: z
        .array(z.object({ file: image(), alt: z.string() }))
        .default([]),
      altCopertina: z.string(),
      note: noteOlfattive.default({ testa: [], cuore: [], fondo: [] }),
      cera: z.string().default('Cera di soia 100%'),
      stoppino: z.string().default('Cotone naturale'),
      pesoGrammi: z.number().optional(),
      durataOre: z.number().optional(),
      // Quando un lotto finisce la scheda resta online e mostra
      // "in preparazione". In artigianato l'attesa e' un segnale di
      // qualita', non un errore da nascondere.
      disponibile: z.boolean().default(true),
      inEvidenza: z.boolean().default(false),
      ordine: z.number().default(100),
      estratto: z.string().max(180),
    }),
});

const collezioni = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/collezioni' }),
  schema: z.object({
    nome: z.string(),
    descrizione: z.string(),
    ordine: z.number().default(100),
  }),
});

export const collections = { candele, collezioni };
