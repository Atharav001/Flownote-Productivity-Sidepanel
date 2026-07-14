function handleIdentityError() {
  const err = chrome.runtime.lastError;
  return err ? err.message : null;
}

export function signIn() {
  return new Promise((resolve, reject) => {
    if (!chrome?.identity) {
      reject(new Error('chrome.identity not available (not running as extension)'));
      return;
    }
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      const error = handleIdentityError();
      if (error) {
        reject(new Error(error));
      } else if (!token) {
        reject(new Error('No token returned'));
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
      const error = handleIdentityError();
      resolve(error ? null : (token || null));
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
      const error = handleIdentityError();
      if (error || !currentToken) {
        resolve();
        return;
      }
      chrome.identity.removeCachedAuthToken({ token: currentToken }, () => {
        handleIdentityError();
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
      const error = handleIdentityError();
      resolve(!!token && !error);
    });
  });
}
