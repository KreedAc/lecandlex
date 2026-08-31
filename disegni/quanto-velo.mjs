import sharp from '/home/user/lecandlex/node_modules/sharp/dist/index.mjs';

// Fin dove si puo' scendere col velo tenendo il testo leggibile, calcolato
// sulla foto vera invece che sul caso peggiore teorico (una foto nera).
const canale = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * canale(r) + 0.7152 * canale(g) + 0.0722 * canale(b);
const contrasto = (a, b) => {
  const [x, y] = [lum(a) + 0.05, lum(b) + 0.05].sort((p, q) => q - p);
  return x / y;
};

const crema = [255, 250, 246];
const testi = {
  fumo: [107, 90, 77],
  inchiostro: [51, 36, 27],
  salvia: [92, 105, 82],
  fiamma: [175, 76, 15],
};

const f = '/home/user/lecandlex/src/assets/sito/sfondo.jpg';
const { data, info } = await sharp(f).resize(400).raw().toBuffer({ resolveWithObject: true });
const C = info.channels;
const pixel = [];
for (let i = 0; i < info.width * info.height; i++) {
  const p = i * C;
  pixel.push([data[p], data[p + 1], data[p + 2]]);
}
const lumOrdinate = pixel.map(lum).sort((a, b) => a - b);
const perc = (q) => lumOrdinate[Math.floor(q * (lumOrdinate.length - 1))];

console.log('la foto: piu\' scuro', perc(0).toFixed(3),
  '| 1% piu\' scuro', perc(0.01).toFixed(3),
  '| meta\'', perc(0.5).toFixed(3),
  '| piu\' chiaro', perc(1).toFixed(3));

// il pixel piu' scuro davvero presente, in RGB
const scuro = pixel.reduce((a, p) => (lum(p) < lum(a) ? p : a));
console.log('pixel piu\' scuro della foto:', '#' + scuro.map((v) => v.toString(16).padStart(2, '0')).join(''));

console.log('\nvelo | fondo sotto il punto piu\' scuro |' +
  Object.keys(testi).map((k) => k.padStart(11)).join(''));
for (let velo = 100; velo >= 60; velo -= 4) {
  const v = velo / 100;
  const fondo = crema.map((c, i) => Math.round(c * v + scuro[i] * (1 - v)));
  const hex = '#' + fondo.map((x) => x.toString(16).padStart(2, '0')).join('');
  const riga = Object.values(testi).map((t) => {
    const c = contrasto(fondo, t);
    return (c.toFixed(2) + (c < 4.5 ? ' !' : '  ')).padStart(11);
  });
  console.log(String(velo).padStart(4) + '%  ' + hex.padEnd(31) + riga.join(''));
}
console.log('\n"!" = sotto la soglia di 4.5');
