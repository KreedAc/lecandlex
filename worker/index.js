/**
 * Worker di Le CandLex.
 *
 * Fa due cose:
 *  1. serve il sito statico prodotto da `npm run build` (tramite assets);
 *  2. gestisce il login GitHub del pannello /admin su /auth e /callback.
 *
 * Tenerle insieme e' una scelta: con due Worker separati servirebbe
 * configurare i domini consentiti su entrambi, e ogni cambio di dominio
 * diventerebbe una manutenzione a due mani. Cosi' pannello e login stanno
 * sulla stessa origine e non c'e' niente da tenere allineato.
 *
 * Variabili da impostare su Cloudflare (Settings -> Variables):
 *   GITHUB_CLIENT_ID       normale
 *   GITHUB_CLIENT_SECRET   cifrata (Encrypt)
 */

const AUTORIZZA = 'https://github.com/login/oauth/authorize';
const TOKEN = 'https://github.com/login/oauth/access_token';

/** Cookie di stato: lega la richiesta di login alla risposta di GitHub. */
const COOKIE = 'lecandlex_oauth_state';

function testo(messaggio, stato = 400) {
  return new Response(messaggio, {
    status: stato,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/**
 * Pagina di chiusura del login.
 *
 * Il pannello apre /auth in una finestra separata e resta in ascolto: questa
 * pagina gli passa il token e si chiude. E' il protocollo che si aspettano
 * Sveltia CMS e Decap CMS.
 */
function paginaDiRitorno(payload, origine) {
  const dati = JSON.stringify(payload).replace(/</g, '\\u003c');

  return new Response(
    `<!doctype html>
<html lang="it">
  <head><meta charset="utf-8" /><title>Accesso in corso…</title></head>
  <body style="font-family: system-ui, sans-serif; padding: 2rem; color: #33241b">
    <p>Accesso completato. Puoi chiudere questa finestra.</p>
    <script>
      (function () {
        var dati = ${dati};
        var messaggio = 'authorization:github:' + dati.stato + ':' + JSON.stringify(dati.contenuto);

        function rispondi(evento) {
          window.removeEventListener('message', rispondi, false);
          window.opener.postMessage(messaggio, ${JSON.stringify(origine)});
        }

        if (window.opener) {
          window.addEventListener('message', rispondi, false);
          window.opener.postMessage('authorizing:github', ${JSON.stringify(origine)});
        }
      })();
    </script>
  </body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function cookieDiStato(valore, origine) {
  const base = `${COOKIE}=${valore}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  // Scadenza a zero per cancellarlo dopo l'uso.
  return valore ? `${base}; Max-Age=600` : `${base}; Max-Age=0`;
}

function leggiCookie(request, nome) {
  const grezzo = request.headers.get('Cookie') ?? '';
  for (const parte of grezzo.split(';')) {
    const [chiave, ...resto] = parte.trim().split('=');
    if (chiave === nome) return resto.join('=');
  }
  return null;
}

async function avviaLogin(request, env, url) {
  if (!env.GITHUB_CLIENT_ID) {
    return testo('Manca GITHUB_CLIENT_ID nelle variabili del Worker.', 500);
  }

  // Valore casuale che ritroveremo nella risposta di GitHub: se non
  // corrisponde, la richiesta non e' partita da qui.
  const stato = crypto.randomUUID();

  const destinazione = new URL(AUTORIZZA);
  destinazione.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  destinazione.searchParams.set('redirect_uri', `${url.origin}/callback`);
  destinazione.searchParams.set('scope', url.searchParams.get('scope') || 'repo,user');
  destinazione.searchParams.set('state', stato);

  return new Response(null, {
    status: 302,
    headers: {
      Location: destinazione.toString(),
      'Set-Cookie': cookieDiStato(stato),
    },
  });
}

async function concludiLogin(request, env, url) {
  const codice = url.searchParams.get('code');
  const stato = url.searchParams.get('state');
  const atteso = leggiCookie(request, COOKIE);

  if (!codice) return testo('GitHub non ha restituito il codice di accesso.');
  if (!stato || stato !== atteso) {
    return testo('Sessione di accesso non valida. Riprova dal pannello.', 403);
  }
  if (!env.GITHUB_CLIENT_SECRET) {
    return testo('Manca GITHUB_CLIENT_SECRET nelle variabili del Worker.', 500);
  }

  const risposta = await fetch(TOKEN, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: codice,
      redirect_uri: `${url.origin}/callback`,
    }),
  });

  const esito = await risposta.json().catch(() => ({}));

  const pagina = esito.access_token
    ? paginaDiRitorno(
        { stato: 'success', contenuto: { token: esito.access_token, provider: 'github' } },
        url.origin
      )
    : paginaDiRitorno(
        { stato: 'error', contenuto: { message: esito.error_description || 'Accesso rifiutato' } },
        url.origin
      );

  // Il cookie ha esaurito il suo scopo: lo cancelliamo.
  const headers = new Headers(pagina.headers);
  headers.append('Set-Cookie', cookieDiStato(''));
  return new Response(pagina.body, { status: pagina.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/auth') return avviaLogin(request, env, url);
    if (url.pathname === '/callback') return concludiLogin(request, env, url);

    // Tutto il resto e' il sito: pagine, immagini, fogli di stile.
    return env.ASSETS.fetch(request);
  },
};
