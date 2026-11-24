document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.querySelector('#register-form');
  const loginForm = document.querySelector('#login-form');
  const message = document.querySelector('#form-message');

  if (new URLSearchParams(window.location.search).get('registered') === '1' && message) {
    ui.showMessage(message, 'Your account is ready. Log in to continue.', 'success');
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = registerForm.querySelector('button[type="submit"]');
      const values = new FormData(registerForm);
      const payload = Object.fromEntries(values.entries());
      if (!payload.phone) delete payload.phone;
      ui.showMessage(message, '', 'info');
      ui.setLoading(button, true, 'Creating account…');
      try {
        await api.post('/auth/register', payload);
        window.location.href = '/login.html?registered=1';
      } catch (error) {
        ui.showMessage(message, error.message, 'error');
        ui.setLoading(button, false);
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = loginForm.querySelector('button[type="submit"]');
      const payload = Object.fromEntries(new FormData(loginForm).entries());
      ui.showMessage(message, '', 'info');
      ui.setLoading(button, true, 'Signing in…');
      try {
        const result = await api.post('/auth/login', payload);
        api.setSession(result.data.token, result.data.user);
        const returnTo = new URLSearchParams(window.location.search).get('returnTo');
        const safeReturnTo = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '';
        const defaultPage = result.data.user.role === 'admin'
          ? '/admin.html'
          : result.data.user.role === 'worker'
            ? '/worker-profile.html'
            : '/my-jobs.html';
        window.location.href = safeReturnTo || defaultPage;
      } catch (error) {
        ui.showMessage(message, error.message, 'error');
        ui.setLoading(button, false);
      }
    });
  }
});
