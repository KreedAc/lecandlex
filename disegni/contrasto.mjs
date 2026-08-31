// Quanto puo' essere trasparente il velo prima che il testo diventi
// faticoso da leggere. Il caso peggiore non e' questa foto: e' una foto
// tutta nera, perche' e' il fondo piu' scuro che possa capitare sotto.
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
  'fumo (testo secondario)': [107, 90, 77],
  'inchiostro (testo principale)': [51, 36, 27],
  'salvia (disponibile)': [92, 105, 82],
  'fiamma (link e accenti)': [175, 76, 15],
  'lino (numeri e bordi)': [216, 209, 203],
};

console.log('velo   fondo      ' + Object.keys(testi).map((k) => k.split(' ')[0].padStart(11)).join(''));
for (const velo of [1, 0.97, 0.96, 0.94, 0.92, 0.9, 0.88, 0.85]) {
  // foto nera sotto, velo crema sopra
  const fondo = crema.map((c) => Math.round(c * velo));
  const riga = Object.values(testi).map((t) => contrasto(fondo, t).toFixed(2).padStart(11));
  const hex = '#' + fondo.map((v) => v.toString(16).padStart(2, '0')).join('');
  console.log(String(Math.round(velo * 100)).padStart(4) + '%  ' + hex + riga.join(''));
}
console.log('\nsoglia AA per il testo normale: 4.5   (il lino e\' decorativo, non conta)');
