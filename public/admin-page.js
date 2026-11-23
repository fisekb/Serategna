document.addEventListener('DOMContentLoaded', async () => {
  const pageMessage = document.querySelector('#page-message');
  const workerList = document.querySelector('#worker-list');
  const userList = document.querySelector('#user-list');

  const admin = await ui.requireRole('admin');
  if (!admin) return;

  const tabs = [...document.querySelectorAll('[data-admin-tab]')];
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const selected = tab.dataset.adminTab;
      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('[data-admin-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.adminPanel !== selected;
      });
    });
  });

  async function loadWorkers() {
    workerList.innerHTML = '<div class="loading-state">Loading worker profiles…</div>';
    try {
      const result = await api.get('/admin/workers');
      const workers = result.data.workers;
      document.querySelector('#worker-count').textContent = `${workers.length} profile${workers.length === 1 ? '' : 's'}`;
      if (!workers.length) {
        workerList.innerHTML = '<div class="empty-state">No worker profiles have been submitted yet.</div>';
        return;
      }
      workerList.innerHTML = workers.map((worker) => {
        const person = worker.user || {};
        const skill = worker.skill?.name || 'Skill not listed';
        const status = worker.isApproved ? 'approved' : 'pending';
        const actionLabel = worker.isApproved ? 'Set to pending' : 'Approve worker';
        const actionClass = worker.isApproved ? 'button--danger' : 'button--primary';
        return `<article class="admin-row">
          <div class="admin-row-info">
            <strong>${ui.escapeHtml(person.name || 'Unnamed worker')}</strong>
            <span>${ui.escapeHtml(skill)} · ${ui.escapeHtml(worker.city || 'City not listed')}</span>
            <span>${ui.escapeHtml(person.email || '')}${person.phone ? ` · ${ui.escapeHtml(person.phone)}` : ''}</span>
            <span>Rate: ${worker.hourlyRate == null ? 'Not listed' : ui.escapeHtml(worker.hourlyRate)}</span>
          </div>
          <div class="admin-row-actions">
            <span class="status status--${status}">${status}</span>
            <button class="button ${actionClass} button--small" type="button" data-worker-id="${worker.id}" data-approved="${!worker.isApproved}">${actionLabel}</button>
          </div>
        </article>`;
      }).join('');
    } catch (error) {
      workerList.innerHTML = '';
      ui.showMessage(pageMessage, error.message, 'error');
    }
  }

  async function loadUsers() {
    userList.innerHTML = '<div class="loading-state">Loading users…</div>';
    try {
      const result = await api.get('/admin/users');
      const users = result.data.users;
      document.querySelector('#user-count').textContent = `${users.length} account${users.length === 1 ? '' : 's'}`;
      if (!users.length) {
        userList.innerHTML = '<div class="empty-state">No user accounts found.</div>';
        return;
      }
      userList.innerHTML = users.map((user) => {
        const actionLabel = user.isActive ? 'Deactivate' : 'Activate';
        return `<article class="admin-row">
          <div class="admin-row-info">
            <strong>${ui.escapeHtml(user.name)}</strong>
            <span>${ui.escapeHtml(user.email)}${user.phone ? ` · ${ui.escapeHtml(user.phone)}` : ''}</span>
            <span class="admin-role">${ui.escapeHtml(user.role)}</span>
          </div>
          <div class="admin-row-actions">
            <span class="status ${user.isActive ? 'status--completed' : 'status--cancelled'}">${user.isActive ? 'active' : 'inactive'}</span>
            <button class="button ${user.isActive ? 'button--danger' : 'button--primary'} button--small" type="button" data-user-id="${user.id}" data-active="${!user.isActive}">${actionLabel}</button>
          </div>
        </article>`;
      }).join('');
    } catch (error) {
      userList.innerHTML = '';
      ui.showMessage(pageMessage, error.message, 'error');
    }
  }

  workerList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-worker-id]');
    if (!button) return;
    const isApproved = button.dataset.approved === 'true';
    ui.setLoading(button, true, 'Updating…');
    try {
      await api.patch(`/admin/workers/${button.dataset.workerId}/status`, { isApproved });
      ui.showMessage(pageMessage, isApproved ? 'Worker profile approved.' : 'Worker profile set to pending.', 'success');
      await loadWorkers();
    } catch (error) {
      ui.showMessage(pageMessage, error.message, 'error');
      ui.setLoading(button, false);
    }
  });

  userList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-user-id]');
    if (!button) return;
    const isActive = button.dataset.active === 'true';
    ui.setLoading(button, true, 'Updating…');
    try {
      await api.patch(`/admin/users/${button.dataset.userId}/status`, { isActive });
      ui.showMessage(pageMessage, isActive ? 'User account activated.' : 'User account deactivated.', 'success');
      await loadUsers();
    } catch (error) {
      ui.showMessage(pageMessage, error.message, 'error');
      ui.setLoading(button, false);
    }
  });

  await Promise.all([loadWorkers(), loadUsers()]);
});
