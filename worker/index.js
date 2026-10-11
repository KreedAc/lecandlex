/**
 * Worker di Le CandLex.
 *
 * Fa due cose:
 *  1. serve il sito statico prodotto da `npm run build` (tramite assets);
 *  2. gestisce il login del pannello /admin su /auth (e /callback).
 *
 * Tenerle insieme e' una scelta: con due Worker separati servirebbe
 * configurare i domini consentiti su entrambi, e ogni cambio di dominio
 * diventerebbe una manutenzione a due mani. Cosi' pannello e login stanno
 * sulla stessa origine e non c'e' niente da tenere allineato.
 *
 * IL LOGIN HA DUE MODI, e si sceglie da solo in base a cosa e' impostato.
 *
 * A) Nome utente e password nostri — se c'e' PANNELLO_UTENTE.
 *    Il pulsante "Accedi con GitHub" del pannello apre una finestra con
 *    nome utente e password. Se sono giusti, il Worker passa al pannello
 *    una chiave GitHub che tiene lui. Chi entra non ha bisogno di un
 *    account GitHub, e niente scade finche' non scade la chiave.
 *
 *      PANNELLO_UTENTE        cifrata   il nome utente
 *      PANNELLO_PASSWORD      cifrata   almeno 12 caratteri, o si rifiuta
 *      PANNELLO_TOKEN_GITHUB  cifrata   token "fine-grained" del proprietario
 *                                       del repository: solo questo
 *                                       repository, Contents in lettura e
 *                                       scrittura, scadenza "No expiration"
 *
 *    Le modifiche salvate dal pannello risultano fatte dal proprietario
 *    del token: e' lui che GitHub vede.
 *
 * B) Account GitHub — se PANNELLO_UTENTE non c'e'.
 *    Il classico login OAuth: chi entra usa il suo account GitHub, che deve
 *    essere collaboratore del repository.
 *
 *      GITHUB_CLIENT_ID       normale
 *      GITHUB_CLIENT_SECRET   cifrata
 *
 * Tutte vanno in Settings -> Variables and Secrets (vedi mancaVariabile).
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
function mancaVariabile(
  nome,
  env,
  provenienza = ['I valori si prendono dalla OAuth App su GitHub:', 'Settings -> Developer settings -> OAuth Apps.']
) {
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
    'e non arrivano qui. Nel pannello ci sono due sezioni con lo stesso',
    'nome, ed e\' facile prendere quella sbagliata.',
    '',
    'Quella giusta:',
    '  Settings -> scorri SOTTO il riquadro "Build" -> Variables and Secrets',
    '',
    'Quella della build, da ignorare, e\' DENTRO il riquadro "Build",',
    'sotto Git repository e Branch control.',
    '',
    'Le variabili semplici non stanno tra i Bindings: quella lista contiene',
    'solo risorse esterne (database, code, AI).',
    '',
    'In alternativa va bene anche Bindings -> Secrets Store: il Worker',
    'legge entrambe le forme.',
    '',
    ...provenienza,
  ].join('\n');
}

/**
 * Legge una credenziale dall'ambiente.
 *
 * Cloudflare offre due modi per fornirla: una variabile o un segreto
 * normale, che arriva come stringa, oppure un binding al Secrets Store,
 * che arriva come oggetto da cui si estrae il valore con .get().
 * Il pannello li presenta insieme e non e' ovvio quale scegliere, quindi
 * li accettiamo entrambi invece di imporne uno.
 */
async function credenziale(valore) {
  if (!valore) return null;
  if (typeof valore === 'string') return valore;
  if (typeof valore.get === 'function') return await valore.get();
  return null;
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
  const clientId = await credenziale(env.GITHUB_CLIENT_ID);
  if (!clientId) {
    return testo(mancaVariabile('GITHUB_CLIENT_ID', env), 500);
  }

  // Valore casuale che ritroveremo nella risposta di GitHub: se non
  // corrisponde, la richiesta non e' partita da qui.
  const stato = crypto.randomUUID();

  const destinazione = new URL(AUTORIZZA);
  destinazione.searchParams.set('client_id', clientId);
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
  const clientId = await credenziale(env.GITHUB_CLIENT_ID);
  const clientSecret = await credenziale(env.GITHUB_CLIENT_SECRET);
  if (!clientSecret) {
    return testo(mancaVariabile('GITHUB_CLIENT_SECRET', env), 500);
  }

  const risposta = await fetch(TOKEN, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
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

/* ------------------------------------------------------------------------
 * Login con nome utente e password (modo A)
 * --------------------------------------------------------------------- */

/** Il repository su cui la chiave deve funzionare: lo stesso di admin/config.yml. */
const REPOSITORY = 'KreedAc/lecandlex';

/**
 * Sotto questa lunghezza la password non si accetta nemmeno se e' giusta.
 *
 * Il login non ha un contatore dei tentativi: tenerne uno vorrebbe dire
 * aggiungere un database al Worker, cioe' un pezzo in piu' da mantenere.
 * La difesa e' che la password sia impossibile da indovinare per forza
 * bruta, e una password lunga lo e'. Meglio un errore chiaro il giorno in
 * cui si imposta che una porta debole per sempre.
 */
const LUNGHEZZA_MINIMA = 12;

const INTESTAZIONI_ACCESSO = {
  'Content-Type': 'text/html; charset=utf-8',
  // Mai in cache: dentro passano credenziali.
  'Cache-Control': 'no-store',
  // La finestra non si puo' incorniciare in un altro sito, quindi nessuno
  // puo' farla compilare a Alessia sotto un travestimento.
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

function sfuggi(testo) {
  return String(testo).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/**
 * La finestra di accesso. Stessi colori del sito, e i campi dichiarano
 * cosa sono (`autocomplete`), cosi' il telefono propone di ricordare la
 * password e dalla volta dopo basta un tocco.
 */
function paginaDiAccesso({ errore = '', utente = '', stato = 200 } = {}) {
  const avviso = errore
    ? `<p class="avviso" role="alert">${sfuggi(errore)}</p>`
    : '';

  return new Response(
    `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Accedi al pannello — Le CandLex</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: #fffaf6; color: #33241b; padding: 1.5rem;
        font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      main { width: 100%; max-width: 22rem; }
      h1 { font: 500 1.75rem/1.2 Georgia, "Times New Roman", serif; margin: 0 0 .25rem; }
      .sotto { color: #6b5a4d; margin: 0 0 1.75rem; font-size: .95rem; }
      label { display: block; font-size: .9rem; margin: 1rem 0 .35rem; }
      input {
        width: 100%; font: inherit; padding: .75rem .9rem; border-radius: .6rem;
        border: 1px solid #d8d1cb; background: #fff; color: inherit;
      }
      input:focus { outline: 2px solid #af4c0f; outline-offset: 1px; border-color: transparent; }
      button {
        width: 100%; margin-top: 1.5rem; font: inherit; font-weight: 500;
        padding: .85rem; border: 0; border-radius: 999px; cursor: pointer;
        background: #33241b; color: #fffaf6;
      }
      button:hover { background: #4a3529; }
      .avviso {
        margin: 0 0 1rem; padding: .75rem .9rem; border-radius: .6rem;
        background: #f6ece6; color: #8d3c0b; font-size: .92rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Le CandLex</h1>
      <p class="sotto">Accesso al pannello</p>
      ${avviso}
      <form method="post">
        <label for="utente">Nome utente</label>
        <input id="utente" name="utente" autocomplete="username" autocapitalize="none"
               autocorrect="off" spellcheck="false" required value="${sfuggi(utente)}" />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
        <button type="submit">Entra</button>
      </form>
    </main>
  </body>
</html>`,
    { status: stato, headers: INTESTAZIONI_ACCESSO }
  );
}

/**
 * Confronto che impiega lo stesso tempo comunque vada.
 *
 * Un confronto normale si ferma alla prima lettera diversa, e misurando
 * quanto ci mette si potrebbe indovinare la password un carattere alla
 * volta. Si confrontano le impronte SHA-256, che hanno sempre la stessa
 * lunghezza, con la funzione apposita del Worker.
 */
async function uguali(a, b) {
  const codifica = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', codifica.encode(String(a))),
    crypto.subtle.digest('SHA-256', codifica.encode(String(b))),
  ]);
  return crypto.subtle.timingSafeEqual(x, y);
}

/**
 * Prova la chiave GitHub prima di consegnarla.
 *
 * Se e' scaduta o revocata, il pannello da solo mostrerebbe errori
 * incomprensibili a ogni salvataggio. Meglio dirlo qui, in italiano, nel
 * momento in cui si entra. Se GitHub non risponde affatto non si blocca
 * nessuno: la prova serve a spiegare, non a fare da guardia.
 */
async function problemaConLaChiave(token) {
  let risposta;
  try {
    risposta = await fetch(`https://api.github.com/repos/${REPOSITORY}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'lecandlex-pannello',
      },
    });
  } catch {
    return null;
  }
  if (risposta.ok) return null;
  if (risposta.status === 401) {
    return 'La chiave che collega il pannello a GitHub è scaduta o è stata revocata. Avvisa chi gestisce il sito: va rifatta e aggiornata su Cloudflare.';
  }
  if (risposta.status === 404 || risposta.status === 403) {
    return 'La chiave che collega il pannello a GitHub non ha accesso al sito. Avvisa chi gestisce il sito: va controllato il repository scelto per la chiave.';
  }
  return null;
}

async function accessoConPassword(request, env, url) {
  const utenteGiusto = await credenziale(env.PANNELLO_UTENTE);
  const passwordGiusta = await credenziale(env.PANNELLO_PASSWORD);
  const token = await credenziale(env.PANNELLO_TOKEN_GITHUB);

  const istruzioniToken = [
    'La chiave si crea su GitHub, dall\'account proprietario del repository:',
    'Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens.',
    `Solo il repository ${REPOSITORY}, permesso Contents: Read and write.`,
  ];
  // La configurazione si controlla prima ancora di mostrare il modulo:
  // chi la sta impostando vede subito cosa manca aprendo la finestra,
  // invece di scoprirlo solo dopo aver provato a entrare.
  if (!utenteGiusto) return testo(mancaVariabile('PANNELLO_UTENTE', env, []), 500);
  if (!passwordGiusta) return testo(mancaVariabile('PANNELLO_PASSWORD', env, []), 500);
  if (!token) return testo(mancaVariabile('PANNELLO_TOKEN_GITHUB', env, istruzioniToken), 500);

  if (passwordGiusta.length < LUNGHEZZA_MINIMA) {
    return paginaDiAccesso({
      stato: 500,
      errore: `La password impostata sul server è troppo corta: ne servono almeno ${LUNGHEZZA_MINIMA} caratteri. Avvisa chi gestisce il sito.`,
    });
  }

  if (request.method !== 'POST') return paginaDiAccesso();

  const modulo = await request.formData().catch(() => null);
  const utente = (modulo?.get('utente') ?? '').toString().trim();
  const password = (modulo?.get('password') ?? '').toString();

  // Tutti e due i confronti, sempre: fermarsi al primo direbbe se il nome
  // utente era giusto.
  const [okUtente, okPassword] = await Promise.all([
    uguali(utente.toLowerCase(), utenteGiusto.trim().toLowerCase()),
    uguali(password, passwordGiusta),
  ]);

  if (!okUtente || !okPassword) {
    // Un secondo di attesa a ogni errore: per una persona non cambia
    // niente, per chi prova migliaia di password e' un muro.
    await new Promise((fatto) => setTimeout(fatto, 1000));
    return paginaDiAccesso({ stato: 401, utente, errore: 'Nome utente o password non corretti.' });
  }

  const problema = await problemaConLaChiave(token);
  if (problema) return paginaDiAccesso({ stato: 502, utente, errore: problema });

  const pagina = paginaDiRitorno(
    { stato: 'success', contenuto: { token, provider: 'github' } },
    url.origin
  );
  const headers = new Headers(pagina.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(pagina.body, { status: 200, headers });
}

/**
 * Le richieste che corrispondono a un file del sito vengono servite prima
 * di arrivare qui. Il Worker riceve solo il resto: le due rotte del login,
 * e gli indirizzi che non esistono.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Se c'e' un nome utente impostato, il login e' quello nostro con la
    // password; altrimenti resta quello con l'account GitHub. Cosi' il
    // passaggio dall'uno all'altro e' solo questione di variabili: finche'
    // non sono impostate, tutto funziona come prima.
    if (url.pathname === '/auth') {
      return env.PANNELLO_UTENTE
        ? accessoConPassword(request, env, url)
        : avviaLogin(request, env, url);
    }
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
