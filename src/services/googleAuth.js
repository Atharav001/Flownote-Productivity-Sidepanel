const CLIENT_ID = '1046339328650-50liuojlu4agkscq3gvh188mbn8m2m17.apps.googleusercontent.com';
const SCOPES = encodeURIComponent('https://www.googleapis.com/auth/tasks');

function handleIdentityError() {
  const err = chrome.runtime.lastError;
  return err ? err.message : null;
}

function isBrave() {
  return navigator.brave !== undefined;
}

async function braveWebAuthFlow(interactive) {
  return new Promise((resolve, reject) => {
    const redirectUri = chrome.identity.getRedirectURL();
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${SCOPES}${interactive ? '&prompt=select_account' : ''}`;
    
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive }, (redirectUrl) => {
      const err = handleIdentityError();
      if (err) return reject(new Error(err));
      if (!redirectUrl) return reject(new Error('No redirect URL returned.'));
      
      try {
        const url = new URL(redirectUrl);
        const params = new URLSearchParams(url.hash.substring(1));
        const token = params.get('access_token');
        if (token) {
          chrome.storage.local.set({ flownote_brave_token: token, flownote_brave_token_time: Date.now() });
          resolve(token);
        } else {
          reject(new Error('Failed to parse access token.'));
        }
      } catch(e) {
        reject(e);
      }
    });
  });
}

async function getBraveTokenCached() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['flownote_brave_token', 'flownote_brave_token_time'], (res) => {
      if (res.flownote_brave_token && res.flownote_brave_token_time) {
        const elapsed = Date.now() - res.flownote_brave_token_time;
        if (elapsed < 3000 * 1000) {
          resolve(res.flownote_brave_token);
          return;
        }
      }
      resolve(null);
    });
  });
}

export async function signIn() {
  if (!chrome?.identity) throw new Error('chrome.identity not available');
  
  if (isBrave()) {
    return braveWebAuthFlow(true);
  }

  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      const error = handleIdentityError();
      if (error) {
        if (error.includes('OAuth2') || error.includes('invalid_request')) {
          console.warn("getAuthToken failed with OAuth error, falling back to WebAuthFlow");
          return braveWebAuthFlow(true).then(resolve).catch(reject);
        }
        reject(new Error(error));
      }
      else if (!token) reject(new Error('No token returned'));
      else resolve(token);
    });
  });
}

export async function getToken() {
  if (!chrome?.identity) return null;
  
  if (isBrave()) {
    const cached = await getBraveTokenCached();
    if (cached) return cached;
    try {
      return await braveWebAuthFlow(false);
    } catch(e) {
      return null;
    }
  }

  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      const error = handleIdentityError();
      if (error) {
        getBraveTokenCached().then(cached => {
            if (cached) resolve(cached);
            else braveWebAuthFlow(false).then(resolve).catch(() => resolve(null));
        });
      } else {
        resolve(token || null);
      }
    });
  });
}

export async function clearAllCachedTokens() {
  if (!chrome?.identity) return;
  
  if (isBrave()) {
    const token = await getBraveTokenCached();
    chrome.storage.local.remove(['flownote_brave_token', 'flownote_brave_token_time']);
    if (token) {
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`).catch(() => {});
    }
    return;
  }

  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (currentToken) => {
      const error = handleIdentityError();
      chrome.storage.local.remove(['flownote_brave_token', 'flownote_brave_token_time']);
      if (error || !currentToken) return resolve();
      chrome.identity.removeCachedAuthToken({ token: currentToken }, () => {
        handleIdentityError();
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${currentToken}`)
          .catch(() => {})
          .finally(() => resolve());
      });
    });
  });
}

export async function signOut() {
  return clearAllCachedTokens();
}

export async function isSignedIn() {
  const token = await getToken();
  return !!token;
}
