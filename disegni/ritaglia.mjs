import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const f = './disegni/set-icone.jpg';
const dest = './src/assets/cura';
mkdirSync(dest, { recursive: true });

const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const lum = new Float32Array(W * H);
for (let i = 0, p = 0; i < W * H; i++, p += C)
  lum[i] = data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114;

// La carta del foglio non scende mai sotto 240; l'anello chiaro sta a 214,
// l'inchiostro scuro a 79. Fra 228 e 238 si sfuma, cosi' i bordi restano
// morbidi invece che seghettati.
const SOGLIA = 238, OPACO = 228, TRASPARENTE = 238;

// --- Componenti connesse: serve a separare i disegni dai numeri stampati
// sotto, che altrimenti entrano nell'angolo del ritaglio quadrato. ---
const eti = new Int32Array(W * H).fill(-1);
const padre = [];
const trova = (a) => { while (padre[a] !== a) { padre[a] = padre[padre[a]]; a = padre[a]; } return a; };
const unisci = (a, b) => { a = trova(a); b = trova(b); if (a !== b) padre[b] = a; };
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (lum[i] >= SOGLIA) continue;
    const su = y > 0 && lum[i - W] < SOGLIA ? eti[i - W] : -1;
    const sx = x > 0 && lum[i - 1] < SOGLIA ? eti[i - 1] : -1;
    if (su < 0 && sx < 0) { const n = padre.length; padre.push(n); eti[i] = n; }
    else if (su >= 0 && sx >= 0) { eti[i] = su; unisci(su, sx); }
    else eti[i] = su >= 0 ? su : sx;
  }
}
const pezzi = new Map();
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  if (eti[i] < 0) continue;
  const r = trova(eti[i]);
  eti[i] = r;
  const b = pezzi.get(r);
  if (!b) pezzi.set(r, { x0: x, x1: x, y0: y, y1: y, n: 1 });
  else { if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; b.n++; }
}

// Riquadri di lavoro: tagliano i numeri a meta', cosi' i numeri non
// risultano "tutti dentro" e vengono scartati dal filtro qui sotto.
const celle = [
  { nome: 'attesa', x0: 100, x1: 660, y0: 190, y1: 650 },
  { nome: 'superficie', x0: 720, x1: 1290, y0: 190, y1: 650 },
  { nome: 'durata', x0: 1340, x1: 1900, y0: 190, y1: 650 },
  { nome: 'sorveglianza', x0: 100, x1: 660, y0: 870, y1: 1395 },
  { nome: 'lontananza', x0: 720, x1: 1290, y0: 870, y1: 1395 },
  { nome: 'portata', x0: 1340, x1: 1900, y0: 870, y1: 1395 },
];

// 192 = il doppio dei 96 px a cui si vedono in pagina, cioe' quanto basta
// su uno schermo fitto. Le altre misure le farebbe Astro, ma qui non
// servono: vedi il commento in IconaCura.astro.
const LATO = 192, ARIA = 0.06;

for (const c of celle) {
  // Nella cella, il pezzo piu' grande e' l'anello. Tutto il disegno ci sta
  // dentro — sole, fiammifero, cane, sveglia — mentre il numero stampato
  // sotto scavalca il bordo di sotto e resta fuori.
  const nellaCella = [...pezzi.entries()].filter(
    ([, b]) => b.n > 40 && b.x0 >= c.x0 && b.x1 <= c.x1 && b.y0 >= c.y0 && b.y1 <= c.y1
  );
  const [, anello] = nellaCella.reduce((a, p) =>
    (p[1].x1 - p[1].x0) * (p[1].y1 - p[1].y0) > (a[1].x1 - a[1].x0) * (a[1].y1 - a[1].y0) ? p : a
  );
  const dentro = nellaCella.filter(
    ([, b]) => b.x0 >= anello.x0 && b.x1 <= anello.x1 && b.y0 >= anello.y0 && b.y1 <= anello.y1
  );
  const ids = new Set(dentro.map(([id]) => id));
  const x0 = Math.min(...dentro.map(([, b]) => b.x0));
  const x1 = Math.max(...dentro.map(([, b]) => b.x1));
  const y0 = Math.min(...dentro.map(([, b]) => b.y0));
  const y1 = Math.max(...dentro.map(([, b]) => b.y1));
  const w = x1 - x0 + 1, h = y1 - y0 + 1;

  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y0 + y) * W + (x0 + x);
      const d = (y * w + x) * 4;
      if (!ids.has(eti[i])) continue; // fuori dal disegno: resta trasparente
      const s = i * C;
      const l = lum[i];
      let a = 255;
      if (l >= TRASPARENTE) a = 0;
      else if (l > OPACO) a = Math.round((255 * (TRASPARENTE - l)) / (TRASPARENTE - OPACO));
      rgba[d] = data[s]; rgba[d + 1] = data[s + 1]; rgba[d + 2] = data[s + 2]; rgba[d + 3] = a;
    }
  }

  // Gli anelli del foglio non sono tutti tondi: le prime tre caselle sono
  // cerchi (419x420), le ultime tre no — la 06 e' 469x499 e la 07 452x483,
  // cioe' ovali del 6-7%. In pagina, uno accanto all'altro, si vede.
  //
  // Si rimettono in tondo schiacciando il ritaglio nel quadrato: il
  // disegno dentro si comprime di quel 6-7%, che su una mano o un cane non
  // si nota, mentre un anello ovale accanto a uno tondo si nota subito.
  const interno = Math.round(LATO / (1 + ARIA));
  const bordo = LATO - interno;
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .resize(interno, interno, { fit: 'fill' })
    .extend({
      top: Math.floor(bordo / 2), bottom: Math.ceil(bordo / 2),
      left: Math.floor(bordo / 2), right: Math.ceil(bordo / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, palette: true, colours: 24, dither: 0, effort: 10 })
    .toFile(`${dest}/${c.nome}.png`);

  const ovale = (((h / w) - 1) * 100).toFixed(1);
  console.log(
    c.nome.padEnd(14),
    `${dentro.length} pezzi  ${w}x${h} (ovale ${ovale}%) -> ${LATO}px tondo`
  );
}
