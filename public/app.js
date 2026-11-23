(function () {
  function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `notice notice--${type || 'info'}`;
    element.hidden = !message;
  }

  function setLoading(button, loading, label) {
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = label || 'Please wait…';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
      delete button.dataset.originalText;
    }
  }

  function queryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function safeText(value) {
    return String(value ?? '');
  }

  function formatDate(value, options) {
    if (!value) return 'Date not provided';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date not provided';
    return new Intl.DateTimeFormat(undefined, options || { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  async function requireRole(roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!window.api.getToken()) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/login.html?returnTo=${encodeURIComponent(returnTo)}`;
      return null;
    }

    try {
      const user = await window.api.currentUser();
      if (!user || !allowedRoles.includes(user.role)) {
        showMessage(document.querySelector('[data-page-message]'), 'This page is not available for your account role.', 'error');
        return null;
      }
      return user;
    } catch (error) {
      window.location.href = `/login.html?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return null;
    }
  }

  async function renderHeader() {
    const account = document.querySelector('[data-account]');
    if (!account) return;

    const cachedUser = window.api.getCachedUser();
    const name = cachedUser?.name || 'Your account';
    if (cachedUser?.role === 'admin') {
      const nav = document.querySelector('.primary-nav');
      if (nav && !nav.querySelector('a[href="/admin.html"]')) {
        nav.insertAdjacentHTML('beforeend', '<a href="/admin.html">Admin</a>');
      }
    }
    if (window.api.getToken()) {
      account.innerHTML = `<span class="account-label">${escapeHtml(name)}</span><button class="button button--quiet button--small" type="button" data-logout>Log out</button>`;
      account.querySelector('[data-logout]').addEventListener('click', () => {
        window.api.clearSession();
        window.location.href = '/';
      });
    } else {
      account.innerHTML = '<a class="button button--quiet button--small" href="/login.html">Log in</a><a class="button button--primary button--small" href="/register.html">Join</a>';
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  document.addEventListener('DOMContentLoaded', renderHeader);
  window.ui = { showMessage, setLoading, queryParam, safeText, formatDate, requireRole, escapeHtml };
})();
