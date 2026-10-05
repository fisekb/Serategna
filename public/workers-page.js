document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#worker-search');
  const results = document.querySelector('#worker-results');
  const message = document.querySelector('#page-message');
  const pagination = document.querySelector('#pagination');
  const pageLabel = document.querySelector('#page-label');
  const resultCount = document.querySelector('#result-count');
  const skillSelect = document.querySelector('#skill');
  let currentPage = 1;

  try {
    const skillsResult = await api.get('/skills');
    skillsResult.data.skills.forEach((skill) => {
      const option = document.createElement('option');
      option.value = skill.id;
      option.textContent = skill.name;
      skillSelect.append(option);
    });
  } catch (error) {
    ui.showMessage(message, error.message, 'error');
  }

  function readFilters() {
    const values = new FormData(form);
    const filters = new URLSearchParams({ page: String(currentPage), limit: values.get('limit') || '9' });
    ['skill', 'city', 'area', 'minRate', 'maxRate'].forEach((key) => {
      const value = String(values.get(key) || '').trim();
      if (value) filters.set(key, value);
    });
    return filters;
  }

  function workerCard(profile) {
    const name = profile.user?.name || 'Local professional';
    const location = [profile.area, profile.city].filter(Boolean).join(', ');
    const rate = Number(profile.hourlyRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `<article class="card worker-card">
      <div class="worker-top"><div class="avatar" aria-hidden="true">${ui.escapeHtml(name.slice(0, 1).toUpperCase())}</div><div><h3>${ui.escapeHtml(name)}</h3><div class="worker-meta">${ui.escapeHtml(location || 'Location not listed')}</div></div></div>
      <div><span class="chip">${ui.escapeHtml(profile.skill?.name || 'Skilled worker')}</span></div>
      <p class="worker-description">${ui.escapeHtml(profile.bio || 'A local professional ready to help with your next project.')}</p>
      <div class="card-footer"><span class="rate">${ui.escapeHtml(rate)} <span class="worker-meta">/ hour</span></span><a class="button button--primary button--small" href="/worker-detail.html?id=${encodeURIComponent(profile.id)}">View profile</a></div>
    </article>`;
  }

  async function loadWorkers() {
    results.innerHTML = '<div class="loading-state">Finding approved workers…</div>';
    pagination.hidden = true;
    ui.showMessage(message, '', 'info');
    try {
      const response = await api.get(`/workers?${readFilters().toString()}`);
      const { workers, pagination: pageData } = response.data;
      resultCount.textContent = `${pageData.total} ${pageData.total === 1 ? 'worker' : 'workers'} found`;

      if (workers.length === 0) {
        results.innerHTML = '<div class="empty-state">No approved workers match these filters yet. Try changing your search.</div>';
      } else {
        results.innerHTML = workers.map(workerCard).join('');
      }

      currentPage = pageData.page;
      pageLabel.textContent = `Page ${pageData.page} of ${Math.max(pageData.totalPages, 1)}`;
      document.querySelector('#previous-page').disabled = pageData.page <= 1;
      document.querySelector('#next-page').disabled = pageData.page >= pageData.totalPages;
      pagination.hidden = pageData.totalPages <= 1;
    } catch (error) {
      results.innerHTML = '';
      ui.showMessage(message, error.message, 'error');
      resultCount.textContent = '';
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    currentPage = 1;
    loadWorkers();
  });
  document.querySelector('#previous-page').addEventListener('click', () => {
    if (currentPage > 1) { currentPage -= 1; loadWorkers(); }
  });
  document.querySelector('#next-page').addEventListener('click', () => {
    currentPage += 1;
    loadWorkers();
  });
  loadWorkers();
});
