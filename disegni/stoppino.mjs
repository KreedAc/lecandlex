import sharp from 'sharp';

// Il foglio consegnato ha sei icone: manca la 04, lo stoppino da tagliare.
// Questa e' disegnata qui e ricalcata sulle misure delle altre: stesso
// anello (diametro 482 su tela 512, spesso 14), stessi due colori, stessa
// scena "oggetto + gesto". E' stata approvata: fa parte del set a tutti
// gli effetti, non e' in attesa di essere sostituita.
const ANELLO = '#e4d4c7';
const SCURO = '#5c4b43';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="234" fill="none" stroke="${ANELLO}" stroke-width="14"/>

  <g fill="${SCURO}">
    <path d="M150 330h116v96a16 16 0 0 1-16 16h-84a16 16 0 0 1-16-16z"/>
    <ellipse cx="208" cy="330" rx="58" ry="17"/>
  </g>
  <path d="M208 318V196" fill="none" stroke="${SCURO}" stroke-width="13" stroke-linecap="round"/>

  <g fill="none" stroke="${SCURO}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round">
    <path d="M262 176 386 232"/>
    <path d="M262 232 386 176"/>
    <circle cx="404" cy="166" r="26"/>
    <circle cx="404" cy="242" r="26"/>
  </g>

</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, colours: 24, dither: 0, effort: 10 }).toFile('./src/assets/cura/stoppino.png');
console.log('stoppino.png creato');
