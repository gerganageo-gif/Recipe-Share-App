function currentLocation() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function loginPathname() {
  return new URL('./login.html', window.location.href).pathname;
}

function sanitizeReturnTo(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin) {
      return null;
    }

    if (url.pathname === loginPathname()) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function buildLoginRedirectUrl(returnTo = currentLocation()) {
  const loginUrl = new URL('./login.html', window.location.href);
  const safeReturnTo = sanitizeReturnTo(returnTo);

  if (safeReturnTo) {
    loginUrl.searchParams.set('returnTo', safeReturnTo);
  } else {
    loginUrl.searchParams.delete('returnTo');
  }

  return `${loginUrl.pathname}${loginUrl.search}`;
}

export function getPostLoginRedirectUrl(fallback = './index.html') {
  const params = new URLSearchParams(window.location.search);
  const returnTo = sanitizeReturnTo(params.get('returnTo'));

  return returnTo || fallback;
}
