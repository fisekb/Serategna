document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#customer-profile-form');
  const loading = document.querySelector('#profile-loading');
  const message = document.querySelector('#form-message');
  const pageMessage = document.querySelector('#page-message');
  const saveButton = document.querySelector('#save-profile');

  const user = await ui.requireRole('customer');
  if (!user) return;

  form.elements.namedItem('name').value = user.name || '';
  form.elements.namedItem('email').value = user.email || '';
  form.elements.namedItem('phone').value = user.phone || '';
  loading.hidden = true;
  form.hidden = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      name: form.elements.namedItem('name').value.trim(),
      phone: form.elements.namedItem('phone').value.trim() || null
    };
    ui.showMessage(message, '', 'info');
    ui.setLoading(saveButton, true, 'Saving…');
    try {
      const result = await api.patch('/auth/profile', payload);
      api.setSession(api.getToken(), result.data.user);
      ui.showMessage(message, 'Your profile has been updated.', 'success');
    } catch (error) {
      ui.showMessage(message, error.message, 'error');
    } finally {
      ui.setLoading(saveButton, false);
    }
  });
});
