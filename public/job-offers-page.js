document.addEventListener('DOMContentLoaded', async () => {
  const list = document.querySelector('#job-offers');
  const count = document.querySelector('#job-count');
  const message = document.querySelector('#page-message');
  const user = await ui.requireRole('worker');
  if (!user) return;

  async function loadOffers() {
    try {
      const response = await api.get('/jobs');
      const offers = response.data.jobOffers;
      count.textContent = `${offers.length} ${offers.length === 1 ? 'job' : 'jobs'} found`;
      list.innerHTML = offers.length
        ? offers.map(renderOffer).join('')
        : '<div class="empty-state"><h3>No jobs have been posted yet</h3><p>Check back later for new customer offers.</p></div>';
      list.querySelectorAll('[data-accept-offer]').forEach((button) => {
        button.addEventListener('click', () => acceptOffer(button.dataset.acceptOffer, button));
      });
    } catch (error) {
      list.innerHTML = '';
      ui.showMessage(message, error.message, 'error');
    }
  }

  function renderOffer(offer) {
    const location = [offer.area, offer.city].filter(Boolean).map(ui.escapeHtml).join(', ');
    const accepted = Boolean(offer.acceptedWorkerId);
    const acceptedByCurrentWorker = Number(offer.acceptedWorkerId) === Number(user.id);
    const status = accepted
      ? `<span class="status status--accepted">${acceptedByCurrentWorker ? 'Accepted by you' : `Accepted by ${ui.escapeHtml(offer.acceptedWorker?.name || 'a worker')}`}</span>`
      : '<span class="status status--pending">Open</span>';
    const action = accepted
      ? ''
      : `<button class="button button--primary button--small" type="button" data-accept-offer="${ui.escapeHtml(offer.id)}">Accept job</button>`;
    return `<article class="card worker-card"><div class="worker-top"><div><span class="chip">${ui.escapeHtml(offer.skill?.name || 'Skill')}</span><h3>${ui.escapeHtml(location)}</h3></div>${status}</div><p class="worker-description">${ui.escapeHtml(offer.description)}</p><div class="worker-meta">Posted by ${ui.escapeHtml(offer.customer?.name || 'Customer')}</div><div class="card-footer"><span class="rate">${ui.escapeHtml(offer.hourlyRate)} / hour</span><span class="worker-meta">${ui.escapeHtml(ui.formatDate(offer.createdAt, { dateStyle: 'medium' }))}</span></div>${action ? `<div class="button-row">${action}</div>` : ''}</article>`;
  }

  async function acceptOffer(offerId, button) {
    ui.setLoading(button, true, 'Accepting…');
    ui.showMessage(message, '', 'info');
    try {
      await api.patch(`/jobs/${encodeURIComponent(offerId)}/accept`, {});
      ui.showMessage(message, 'You accepted this job offer.', 'success');
      await loadOffers();
    } catch (error) {
      ui.showMessage(message, error.message, 'error');
    } finally {
      ui.setLoading(button, false);
    }
  }

  await loadOffers();
});
