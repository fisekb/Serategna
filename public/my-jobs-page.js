document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#job-offer-form');
  const skillSelect = document.querySelector('#skillId');
  const offersList = document.querySelector('#my-job-offers');
  const pageMessage = document.querySelector('#page-message');
  const formMessage = document.querySelector('#form-message');
  const postButton = document.querySelector('#post-job');

  const user = await ui.requireRole('customer');
  if (!user) return;

  async function loadOffers() {
    offersList.innerHTML = '<div class="loading-state">Loading your job offers…</div>';
    try {
      const response = await api.get('/jobs/mine');
      const offers = response.data.jobOffers;
      offersList.innerHTML = offers.length
        ? offers.map((offer) => renderOffer(offer)).join('')
        : '<div class="empty-state"><h3>No job offers yet</h3><p>Post a job above to let local workers know what you need.</p></div>';
    } catch (error) {
      offersList.innerHTML = '';
      ui.showMessage(pageMessage, error.message, 'error');
    }
  }

  function renderOffer(offer) {
    const location = [offer.area, offer.city].filter(Boolean).map(ui.escapeHtml).join(', ');
    return `<article class="card worker-card"><div class="worker-top"><div><span class="chip">${ui.escapeHtml(offer.skill?.name || 'Skill')}</span><h3>${ui.escapeHtml(location)}</h3></div></div><p class="worker-description">${ui.escapeHtml(offer.description)}</p><div class="card-footer"><span class="rate">${ui.escapeHtml(offer.hourlyRate)} / hour</span><span class="worker-meta">Posted ${ui.escapeHtml(ui.formatDate(offer.createdAt, { dateStyle: 'medium' }))}</span></div></article>`;
  }

  try {
    const skillsResult = await api.get('/skills');
    skillsResult.data.skills.forEach((skill) => {
      const option = document.createElement('option');
      option.value = skill.id;
      option.textContent = skill.name;
      skillSelect.append(option);
    });
  } catch (error) {
    ui.showMessage(pageMessage, error.message, 'error');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const payload = {
      skillId: Number(values.get('skillId')),
      hourlyRate: Number(values.get('hourlyRate')),
      city: String(values.get('city')).trim(),
      area: String(values.get('area') || '').trim() || null,
      description: String(values.get('description')).trim()
    };
    ui.showMessage(formMessage, '', 'info');
    ui.setLoading(postButton, true, 'Posting…');
    try {
      await api.post('/jobs', payload);
      form.reset();
      ui.showMessage(formMessage, 'Your job offer is now visible to workers.', 'success');
      await loadOffers();
    } catch (error) {
      ui.showMessage(formMessage, error.message, 'error');
    } finally {
      ui.setLoading(postButton, false);
    }
  });

  await loadOffers();
});
