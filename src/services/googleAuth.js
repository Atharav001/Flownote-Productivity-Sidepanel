export function signIn() {
  return new Promise((resolve, reject) => {
    if (!chrome?.identity) {
      reject(new Error('chrome.identity not available'));
      return;
    }
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
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
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(token);
      }
    });
  });
}

export function signOut() {
  return new Promise((resolve) => {
    if (!chrome?.identity) {
      resolve();
      return;
    }
    chrome.identity.getAuthToken({ interactive: false }, (currentToken) => {
      if (chrome.runtime.lastError || !currentToken) {
        resolve();
        return;
      }
      chrome.identity.removeCachedAuthToken({ token: currentToken }, () => {
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${currentToken}`)
          .catch(() => {})
          .finally(() => resolve());
      });
    });
  });
}

export function isSignedIn() {
  return new Promise((resolve) => {
    if (!chrome?.identity) {
      resolve(false);
      return;
    }
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      resolve(!!token && !chrome.runtime.lastError);
    });
  });
}
