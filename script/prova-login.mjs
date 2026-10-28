/**
 * Prove del login del pannello (worker/index.js), senza Cloudflare e senza
 * GitHub: il Worker si carica in Node e le risposte di GitHub si simulano.
 *
 *   npm run prova:login
 *
 * Non gira durante la build: serve a chi tocca il login, per sapere in un
 * secondo se ha rotto qualcosa.
 */
import { fileURLToPath } from 'node:url';

// Il Worker usa una funzione che esiste solo su Cloudflare: la imitiamo.
crypto.subtle.timingSafeEqual ??= (a, b) => {
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.min(x.length, y.length); i++) d |= x[i] ^ y[i];
  return d === 0;
};

let rispostaGitHub = 200;
let chiamateGitHub = 0;
globalThis.fetch = async (url) => {
  if (!String(url).startsWith('https://api.github.com/')) throw new Error('fetch inattesa: ' + url);
  chiamateGitHub++;
  if (rispostaGitHub === 'rete') throw new Error('rete giu');
  return new Response('{}', { status: rispostaGitHub });
};

const percorso = fileURLToPath(new URL('../worker/index.js', import.meta.url));
const worker = (await import(percorso)).default;

const env = {
  PANNELLO_UTENTE: 'alessia',
  PANNELLO_PASSWORD: 'candele-di-cera-2026',
  PANNELLO_TOKEN_GITHUB: 'github_pat_PROVA',
};
const entra = (corpo, conEnv = env) =>
  worker.fetch(
    new Request('https://lecandlex.com/auth', {
      method: 'POST',
      body: new URLSearchParams(corpo),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
    conEnv
  );
const giusto = { utente: 'alessia', password: 'candele-di-cera-2026' };

let falliti = 0;
const verifica = (nome, ok) => {
  if (!ok) falliti++;
  console.log((ok ? '  ok   ' : '  NO   ') + nome);
};

let r = await entra(giusto);
let h = await r.text();
verifica('credenziali giuste -> consegna la chiave', r.status === 200 && h.includes('github_pat_PROVA') && h.includes('"stato":"success"'));
verifica('la chiave parte solo verso i nostri indirizzi, mai verso "*"', h.includes('"https://lecandlex.com"') && h.includes('workers.dev') && !/postMessage\([^)]*['"]\*['"]/.test(h));
verifica('la finestra si chiude da sola dopo la consegna', h.includes('window.close()'));
verifica('niente cache', r.headers.get('Cache-Control') === 'no-store');

r = await entra({ utente: ' Alessia ', password: 'candele-di-cera-2026' });
verifica('nome utente senza badare a maiuscole e spazi', r.status === 200);

rispostaGitHub = 'rete';
r = await entra(giusto);
verifica('GitHub irraggiungibile -> si entra lo stesso', r.status === 200);

rispostaGitHub = 401;
r = await entra(giusto);
h = await r.text();
verifica('chiave scaduta -> lo dice, non la consegna', r.status === 502 && h.includes('scaduta') && !h.includes('github_pat_PROVA'));

rispostaGitHub = 404;
r = await entra(giusto);
h = await r.text();
verifica('chiave senza accesso al repository -> lo dice, non la consegna', r.status === 502 && !h.includes('github_pat_PROVA'));

rispostaGitHub = 200;
const prima = chiamateGitHub;
const inizio = Date.now();
r = await entra({ utente: 'alessia', password: 'sbagliata' });
h = await r.text();
verifica('password sbagliata -> 401, niente chiave, GitHub non interrogato', r.status === 401 && !h.includes('github_pat_PROVA') && chiamateGitHub === prima);
verifica('password sbagliata -> almeno un secondo di attesa', Date.now() - inizio >= 950);

r = await entra({ utente: 'mario', password: 'candele-di-cera-2026' });
verifica('utente sbagliato -> 401', r.status === 401);

r = await entra({ utente: '"><script>x</script>', password: 'x' });
h = await r.text();
verifica('codice nel nome utente -> neutralizzato', !h.includes('<script>x</script>'));

r = await worker.fetch(new Request('https://lecandlex.com/auth'), { ...env, PANNELLO_PASSWORD: 'corta' });
h = await r.text();
verifica('password sul server sotto i 12 caratteri -> rifiutata', r.status === 500 && h.includes('troppo corta'));

r = await worker.fetch(new Request('https://lecandlex.com/auth'), { GITHUB_CLIENT_ID: 'x', ALTRA: 'y' });
h = await r.text();
verifica('variabili mancanti -> dice quale ed elenca quelle che vede', r.status === 500 && h.includes('PANNELLO_UTENTE') && h.includes('- ALTRA'));

r = await worker.fetch(new Request('https://lecandlex.com/auth'), env);
h = await r.text();
verifica('la finestra non si puo\' incorniciare', r.headers.get('X-Frame-Options') === 'DENY' && h.includes('autocomplete="current-password"'));

console.log(falliti ? `\n${falliti} prove fallite.` : '\nTutte le prove passano.');
process.exit(falliti ? 1 : 0);
