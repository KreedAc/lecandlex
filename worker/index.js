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

/**
 * Un errore di configurazione lo legge chi sta sistemando il sito, non un
 * cliente: tanto vale spiegargli dove mettere le mani invece di dirgli
 * solo che manca qualcosa.
 */
function mancaVariabile(nome, env) {
  // Solo i NOMI di quello che il Worker riceve, mai i valori. Serve a
  // distinguere "l'ho messa nel posto sbagliato" da "ho sbagliato a
  // scrivere il nome", che dall'esterno sembrano lo stesso errore.
  const viste = Object.keys(env ?? {}).sort();

  return [
    `Manca la variabile ${nome}.`,
    '',
    'Quello che il Worker vede in questo momento:',
    viste.length ? viste.map((v) => `  - ${v}`).join('\n') : '  (niente)',
    '',
    "Se in quell'elenco non compare il nome che ti aspetti, le variabili",
    'sono state salvate tra quelle della BUILD: servono a costruire il sito',
    'e non arrivano qui. Le due sezioni si somigliano, ma sono diverse.',
    '',
    'Quelle giuste stanno nella scheda BINDINGS del Worker:',
    '',
    '  Workers & Pages -> lecandlex -> Bindings -> Add -> Secret',
    '',
    'Non in Settings, dove la sezione "Variables and secrets" e\' quella',
    'della build.',
    '',
    'Spunta "Encrypt" su entrambe: quelle in chiaro possono essere azzerate',
    'dal prossimo deploy, quelle cifrate no.',
    '',
    'I valori si prendono dalla OAuth App su GitHub:',
    'Settings -> Developer settings -> OAuth Apps.',
  ].join('\n');
}

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
    return testo(mancaVariabile('GITHUB_CLIENT_ID', env), 500);
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
    return testo(mancaVariabile('GITHUB_CLIENT_SECRET', env), 500);
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

/**
 * Le richieste che corrispondono a un file del sito vengono servite prima
 * di arrivare qui. Il Worker riceve solo il resto: le due rotte del login,
 * e gli indirizzi che non esistono.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/auth') return avviaLogin(request, env, url);
    if (url.pathname === '/callback') return concludiLogin(request, env, url);

    // Nessun file e nessuna rotta: mostriamo la pagina 404 del sito invece
    // di quella grigia di Cloudflare.
    const pagina404 = await env.ASSETS.fetch(new URL('/404.html', url.origin));
    return new Response(pagina404.body, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
