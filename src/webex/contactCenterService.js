export const contactCenterScopes = [
  'cjp:config_read',
  'cjp:config_write',
  'cjp:config',
  'cjp:user',
  'spark:webrtc_calling',
  'spark:calls_read',
  'spark:calls_write',
  'spark:xsi',
  'spark:kms'
].join(' ');

const waitForReady = (webex) => new Promise((resolve, reject) => {
  const timeout = window.setTimeout(() => {
    cleanup();
    reject(new Error('Webex SDK initialization timed out.'));
  }, 15000);

  const cleanup = () => {
    window.clearTimeout(timeout);
    webex.off('ready', handleReady);
    webex.off('ready.authorization', handleReady);
  };

  const handleReady = () => {
    cleanup();
    resolve(webex);
  };

  webex.on('ready', handleReady);
  webex.on('ready.authorization', handleReady);
});

const getOAuthDiagnostics = (redirectUri, href = window.location.href) => {
  const parsedUrl = new URL(href);
  const params = new URLSearchParams(parsedUrl.search);
  const hash = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
  const queryKeys = Array.from(params.keys());
  const hashKeys = Array.from(hash.keys());
  const authorizeRequest = JSON.parse(
    window.sessionStorage.getItem('wdihehr-webex-authorize-request') || 'null'
  );

  return {
    redirectUri,
    currentPath: `${parsedUrl.origin}${parsedUrl.pathname}`,
    hasAccessTokenHash: hash.has('access_token'),
    hasCodeQuery: params.has('code'),
    queryKeys,
    hashKeys,
    authorizeRequest
  };
};

const getCallbackIssue = (redirectUri, diagnostics = getOAuthDiagnostics(redirectUri)) => {
  if (diagnostics.hasAccessTokenHash) {
    return 'Webex returned an access token, but the SDK could not hydrate credentials from it. Try Reset Webex login once; if it repeats, the token may be missing required scopes or malformed.';
  }

  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const error = params.get('error') || hash.get('error');

  if (error) {
    return `Webex OAuth returned ${error}: ${params.get('error_description') || hash.get('error_description') || 'authorization failed'}.`;
  }

  if (params.get('code')) {
    return 'Webex OAuth returned an authorization code, but this browser app expects an access token. Use the public/implicit OAuth flow and make sure the redirect URI exactly matches this app.';
  }

  if (params.get('access_token')) {
    return 'Webex OAuth returned access_token in the query string, but the browser SDK expects it in the URL hash. Check that the OAuth integration is using implicit/public browser flow.';
  }

  return `No Webex access token was found after sign-in. Expected redirect URI: ${redirectUri}. Current page: ${window.location.origin}${window.location.pathname}.`;
};

const hasAccessTokenCallback = () =>
  new URLSearchParams(window.location.hash.replace(/^#/, '')).has('access_token');

const tokenServiceEndpoints = {
  token: process.env.REACT_APP_WEBEX_TOKEN_ENDPOINT,
  login: process.env.REACT_APP_WEBEX_LOGIN_ENDPOINT,
  logout: process.env.REACT_APP_WEBEX_LOGOUT_ENDPOINT
};

const tokenServiceUrl = (path) => new URL(
  tokenServiceEndpoints[path] || `api/webex/${path}.php`,
  window.location.href
).toString();

const shouldUseTokenService = () => process.env.REACT_APP_WEBEX_AUTH_MODE !== 'implicit';

const waitForAuthorization = (webex, hadCallbackToken = false) => new Promise((resolve) => {
  if (webex.credentials?.canAuthorize || webex.canAuthorize) {
    resolve(true);
    return;
  }

  const startedAt = Date.now();
  const timeout = hadCallbackToken || hasAccessTokenCallback() ? 5000 : 1000;

  const check = () => {
    if (webex.credentials?.canAuthorize || webex.canAuthorize) {
      resolve(true);
      return;
    }

    if (Date.now() - startedAt >= timeout) {
      resolve(false);
      return;
    }

    window.setTimeout(check, 50);
  };

  check();
});

const fetchServerToken = async () => {
  let response;
  try {
    response = await fetch(tokenServiceUrl('token'), {
      credentials: 'same-origin',
      cache: 'no-store'
    });
  } catch (tokenError) {
    return {
      authenticated: false,
      loginUrl: tokenServiceUrl('login'),
      error: 'WEBEX_TOKEN_SERVICE_UNREACHABLE',
      message: tokenError.message || 'Unable to reach the Webex PHP token service.'
    };
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    return {
      authenticated: false,
      loginUrl: payload.loginUrl || tokenServiceUrl('login'),
      error: payload.error || '',
      message: payload.message || ''
    };
  }

  return {
    authenticated: true,
    accessToken: payload.access_token,
    tokenType: payload.token_type || 'Bearer',
    scope: payload.scope || '',
    expiresAt: payload.expires_at || null
  };
};

const baseContactCenterConfig = {
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    bufferLogLevel: 'warn'
  },
  cc: {
    allowMultiLogin: false,
    allowAutomatedRelogin: true,
    clientType: 'WhereDoesItHurtEHR',
    isKeepAliveEnabled: true,
    force: true,
    metrics: {
      clientName: 'WHERE_DOES_IT_HURT_EHR',
      clientType: 'WebexCCSDK'
    }
  }
};

export async function initializeContactCenter() {
  const clientId = process.env.REACT_APP_WEBEX_CLIENT_ID;
  const redirectUri =
    process.env.REACT_APP_WEBEX_REDIRECT_URI ||
    `${window.location.origin}${window.location.pathname}`;
  const preInitDiagnostics = getOAuthDiagnostics(redirectUri, window.location.href);
  const { default: Webex } = await import('@webex/contact-center');

  if (shouldUseTokenService()) {
    const token = await fetchServerToken();

    if (!token.authenticated) {
      return {
        configured: true,
        authMode: 'php',
        clientId,
        redirectUri,
        loginUrl: token.loginUrl,
        webex: null,
        canAuthorize: false,
        authIssue: token.message || 'Sign in through the Webex PHP token service.',
        authDiagnostics: {
          ...preInitDiagnostics,
          tokenService: tokenServiceUrl('token'),
          tokenServiceError: token.error || ''
        }
      };
    }

    const webex = Webex.init({
      credentials: {
        access_token: token.accessToken
      },
      config: {
        ...baseContactCenterConfig
      }
    });

    await waitForReady(webex);
    const canAuthorize = await waitForAuthorization(webex, false);

    return {
      configured: true,
      authMode: 'php',
      clientId,
      redirectUri,
      webex,
      canAuthorize,
      authIssue: canAuthorize ? '' : 'The PHP token service returned a token, but the Webex SDK could not authorize with it.',
      authDiagnostics: {
        ...getOAuthDiagnostics(redirectUri),
        tokenService: tokenServiceUrl('token'),
        tokenType: token.tokenType,
        tokenScope: token.scope,
        tokenExpiresAt: token.expiresAt
      }
    };
  }

  if (!clientId) {
    return {
      configured: false,
      clientId: '',
      redirectUri,
      webex: null
    };
  }

  const webex = Webex.init({
    config: {
      ...baseContactCenterConfig,
      credentials: {
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: contactCenterScopes
      }
    }
  });

  await waitForReady(webex);
  const canAuthorize = await waitForAuthorization(webex, preInitDiagnostics.hasAccessTokenHash);
  const postInitDiagnostics = getOAuthDiagnostics(redirectUri);

  return {
    configured: true,
    clientId,
    redirectUri,
    webex,
    canAuthorize,
    authIssue: canAuthorize ? '' : getCallbackIssue(redirectUri, preInitDiagnostics),
    authDiagnostics: {
      ...postInitDiagnostics,
      preInitHashKeys: preInitDiagnostics.hashKeys,
      preInitQueryKeys: preInitDiagnostics.queryKeys,
      hadAccessTokenBeforeSdk: preInitDiagnostics.hasAccessTokenHash
    }
  };
}

export const beginWebexLogin = (webex) => {
  if (shouldUseTokenService()) {
    window.location.href = tokenServiceUrl('login');
    return Promise.resolve();
  }

  try {
    const authorizeUrl = new URL(
      webex.credentials.buildLoginUrl({
        response_type: 'token',
        state: { source: 'where-does-it-hurt-ehr' }
      })
    );
    window.sessionStorage.setItem('wdihehr-webex-authorize-request', JSON.stringify({
      host: authorizeUrl.host,
      responseType: authorizeUrl.searchParams.get('response_type'),
      redirectUri: authorizeUrl.searchParams.get('redirect_uri'),
      scopes: authorizeUrl.searchParams.get('scope')?.split(' ') || []
    }));
  } catch {
    window.sessionStorage.removeItem('wdihehr-webex-authorize-request');
  }

  return webex.authorization.initiateLogin({
    state: {
      returnPath: window.location.pathname
    }
  });
};

export const resetWebexLogin = async (webex) => {
  await webex?.credentials?.invalidate?.();
  if (shouldUseTokenService()) {
    await fetch(tokenServiceUrl('logout'), {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store'
    }).catch(() => {});
  }
  window.sessionStorage.removeItem('oauth2-csrf-token');
  window.sessionStorage.removeItem('wdihehr-webex-authorize-request');
  [window.localStorage, window.sessionStorage].forEach((storage) => {
    Object.keys(storage)
      .filter((key) => /webex|cisco|spark|oauth|credential|token/i.test(key))
      .forEach((key) => storage.removeItem(key));
  });

  const url = new URL(window.location.href);
  ['code', 'state', 'error', 'error_description', 'access_token'].forEach((key) => url.searchParams.delete(key));
  url.hash = '';
  window.history.replaceState({}, '', url.toString());
};

export const registerContactCenterEvents = (webex, handlers) => {
  const subscriptions = [];
  const on = (eventName, handler) => {
    webex.cc.on(eventName, handler);
    subscriptions.push(() => webex.cc.off(eventName, handler));
  };

  on('agent:stateChange', handlers.onAgentState);
  on('agent:multiLogin', handlers.onAgentMultiLogin || (() => {}));
  on('agent:stationLoginSuccess', handlers.onStationLogin);
  on('agent:logoutSuccess', handlers.onStationLogout);
  on('task:incoming', (task) => handlers.onTask(task, 'incoming'));
  on('task:hydrate', (task) => handlers.onTask(task, 'hydrate'));

  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
};
