(function () {
  const TOKEN_KEY = 'serategna.token';
  const USER_KEY = 'serategna.user';

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getCachedUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (_error) {
      clearSession();
      return null;
    }
  }

  async function request(path, options) {
    const requestOptions = options || {};
    const headers = new Headers(requestOptions.headers || {});
    const token = getToken();

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    let response;
    try {
      response = await fetch(path.startsWith('/api/') ? path : `/api${path}`, {
        ...requestOptions,
        headers
      });
    } catch (_error) {
      throw new Error('Could not reach the server. Check that the API is running and try again.');
    }

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && token) {
        clearSession();
      }
      const validationMessages = result?.data?.errors || result?.data;
      const detail = Array.isArray(validationMessages)
        ? validationMessages.map((item) => item.msg || item.message).filter(Boolean).join(' ')
        : '';
      const error = new Error(detail || result?.message || `Request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }

    return result;
  }

  async function currentUser() {
    if (!getToken()) return null;
    try {
      const result = await request('/auth/me');
      const user = result.data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  window.api = {
    request,
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' }),
    getToken,
    getCachedUser,
    setSession,
    clearSession,
    currentUser
  };
})();
