const SCOPES = ['https://www.googleapis.com/auth/tasks'];
const TOKEN_KEY = 'flownote_google_tokens';
const CLIENT_ID_KEY = 'flownote_google_client_id';

function getRedirectUri() {
  return chrome?.runtime?.id
    ? `https://${chrome.runtime.id}.chromiumapp.org/`
    : null;
}

function base64UrlEncode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generatePKCE() {
  const verifier = new Uint8Array(64);
  crypto.getRandomValues(verifier);
  const codeVerifier = base64UrlEncode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return { codeVerifier, codeChallenge: base64UrlEncode(new Uint8Array(hash)) };
}

function chromeStorage() {
  return chrome?.storage?.local || { get: (k, cb) => cb({}), set: (d, cb) => cb?.() };
}

function getStoredTokens() {
  return new Promise(resolve => {
    chromeStorage().get([TOKEN_KEY], result => {
      try { resolve(result[TOKEN_KEY] || null); } catch { resolve(null); }
    });
  });
}

function setStoredTokens(tokens) {
  return new Promise(resolve => {
    chromeStorage().set({ [TOKEN_KEY]: tokens }, resolve);
  });
}

function removeStoredTokens() {
  return new Promise(resolve => {
    chromeStorage().set({ [TOKEN_KEY]: null }, resolve);
  });
}

export function getStoredClientId() {
  return new Promise(resolve => {
    chromeStorage().get([CLIENT_ID_KEY], result => {
      resolve(result[CLIENT_ID_KEY] || '');
    });
  });
}

export function setStoredClientId(clientId) {
  return new Promise(resolve => {
    chromeStorage().set({ [CLIENT_ID_KEY]: clientId }, resolve);
  });
}

export function getExtensionId() {
  return chrome?.runtime?.id || null;
}

export async function signIn(clientId) {
  if (!chrome?.identity?.launchWebAuthFlow) {
    throw new Error('chrome.identity.launchWebAuthFlow not available');
  }

  const redirectUri = getRedirectUri();
  if (!redirectUri) throw new Error('Extension ID not available');

  if (clientId) {
    await setStoredClientId(clientId);
  } else {
    clientId = await getStoredClientId();
  }
  if (!clientId) throw new Error('No OAuth client ID configured');

  const { codeVerifier, codeChallenge } = await generatePKCE();

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  const resultUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl.href, interactive: true }, (url) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(url);
    });
  });

  const url = new URL(resultUrl);
  const code = url.searchParams.get('code');
  if (!code) throw new Error('No authorization code received');

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok) throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);

  tokens.expires_at = Date.now() + (tokens.expires_in || 3600) * 1000;
  await setStoredTokens(tokens);

  return tokens.access_token;
}

export async function getToken() {
  const tokens = await getStoredTokens();
  if (!tokens?.access_token) return null;

  if (Date.now() < (tokens.expires_at || 0)) {
    return tokens.access_token;
  }

  if (tokens.refresh_token) {
    const clientId = await getStoredClientId();
    if (!clientId) return null;

    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: tokens.refresh_token,
        client_id: clientId,
        grant_type: 'refresh_token',
      }),
    });

    const refreshed = await refreshResponse.json();
    if (!refreshResponse.ok) {
      await removeStoredTokens();
      return null;
    }

    refreshed.refresh_token = refreshed.refresh_token || tokens.refresh_token;
    refreshed.expires_at = Date.now() + (refreshed.expires_in || 3600) * 1000;
    await setStoredTokens(refreshed);
    return refreshed.access_token;
  }

  await removeStoredTokens();
  return null;
}

export async function signOut() {
  await removeStoredTokens();
}

export async function isSignedIn() {
  const tokens = await getStoredTokens();
  if (!tokens?.access_token) return false;
  if (Date.now() < (tokens.expires_at || 0)) return true;
  if (tokens.refresh_token) {
    const token = await getToken();
    return !!token;
  }
  return false;
}
