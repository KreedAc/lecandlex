import sharp from '/home/user/lecandlex/node_modules/sharp/dist/index.mjs';

// Sotto una riga di testo non conta il singolo pixel piu' scuro: conta
// quanto e' scura la zona. Per questo si guarda la foto rimpicciolita, dove
// ogni pixel e' la media di un'area larga come una parola.
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
const testi = { fumo: [107, 90, 77], inchiostro: [51, 36, 27], salvia: [92, 105, 82], fiamma: [175, 76, 15] };

const f = process.argv[2];
const risultati = [];
for (const larghezza of [1, 8, 24, 60, 150]) {
  const { data, info } = await sharp(f).resize(larghezza).raw().toBuffer({ resolveWithObject: true });
  const C = info.channels;
  let peggio = null;
  for (let i = 0; i < info.width * info.height; i++) {
    const p = i * C;
    const px = [data[p], data[p + 1], data[p + 2]];
    if (!peggio || lum(px) < lum(peggio)) peggio = px;
  }
  risultati.push({ larghezza, peggio });
  console.log(
    `zona larga 1/${larghezza} della foto  ->  piu' scura  #${peggio.map((v) => v.toString(16).padStart(2, '0')).join('')}`
  );
}

// Il compromesso: zone larghe come una parola (60 tacche sulla larghezza).
const { peggio } = risultati.find((r) => r.larghezza === 60);
console.log('\nvelo | fondo sotto la zona piu\' scura |' + Object.keys(testi).map((k) => k.padStart(11)).join(''));
for (let velo = 100; velo >= 56; velo -= 4) {
  const v = velo / 100;
  const fondo = crema.map((c, i) => Math.round(c * v + peggio[i] * (1 - v)));
  const hex = '#' + fondo.map((x) => x.toString(16).padStart(2, '0')).join('');
  const riga = Object.values(testi).map((t) => {
    const c = contrasto(fondo, t);
    return (c.toFixed(2) + (c < 4.5 ? ' !' : '  ')).padStart(11);
  });
  console.log(String(velo).padStart(4) + '%  ' + hex.padEnd(30) + riga.join(''));
}
