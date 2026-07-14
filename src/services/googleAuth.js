function consumeLastError() {
  try { void chrome.runtime.lastError; } catch {}
}

export function signIn() {
  return new Promise((resolve, reject) => {
    if (!chrome?.identity) {
      reject(new Error('chrome.identity not available (not running as extension)'));
      return;
    }
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      consumeLastError();
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

export function getToken() {
  return new Promise((resolve) => {
    if (!chrome?.identity) {
      resolve(null);
      return;
    }
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      consumeLastError();
      resolve(!chrome.runtime.lastError && token ? token : null);
    });
  });
}

export function clearAllCachedTokens() {
  return new Promise((resolve) => {
    if (!chrome?.identity) {
      resolve();
      return;
    }
    chrome.identity.getAuthToken({ interactive: false }, (currentToken) => {
      consumeLastError();
      if (chrome.runtime.lastError || !currentToken) {
        resolve();
        return;
      }
      chrome.identity.removeCachedAuthToken({ token: currentToken }, () => {
        consumeLastError();
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${currentToken}`)
          .catch(() => {})
          .finally(() => resolve());
      });
    });
  });
}

export function signOut() {
  return clearAllCachedTokens();
}

export function isSignedIn() {
  return new Promise((resolve) => {
    if (!chrome?.identity) {
      resolve(false);
      return;
    }
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      consumeLastError();
      resolve(!!token && !chrome.runtime.lastError);
    });
  });
}
