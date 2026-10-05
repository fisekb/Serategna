document.addEventListener('DOMContentLoaded', async () => {
  const loading = document.querySelector('#worker-loading');
  const content = document.querySelector('#worker-content');
  const details = document.querySelector('#worker-details');
  const reviewsElement = document.querySelector('#review-list');
  const bookingArea = document.querySelector('#booking-area');
  const pageMessage = document.querySelector('#page-message');
  const profileId = ui.queryParam('id');

  if (!profileId || !/^\d+$/.test(profileId)) {
    loading.hidden = true;
    ui.showMessage(pageMessage, 'Choose a worker from search to view their profile.', 'error');
    return;
  }

  try {
    const [profileResponse, reviewsResponse] = await Promise.all([
      api.get(`/workers/${encodeURIComponent(profileId)}`),
      api.get(`/workers/${encodeURIComponent(profileId)}/reviews`)
    ]);
    const profile = profileResponse.data.profile;
    const name = profile.user?.name || 'Local professional';
    const location = [profile.area, profile.city].filter(Boolean).join(', ');
    const rate = Number(profile.hourlyRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.title = `${name} — Serategna`;
    details.innerHTML = `<div class="detail-title"><div class="avatar" aria-hidden="true">${ui.escapeHtml(name.slice(0, 1).toUpperCase())}</div><div><span class="eyebrow">Approved local professional</span><h1>${ui.escapeHtml(name)}</h1><p class="worker-meta">${ui.escapeHtml(location || 'Location not listed')}</p></div></div>
      <div class="detail-facts"><span class="chip">${ui.escapeHtml(profile.skill?.name || 'Skilled worker')}</span><span class="chip">${ui.escapeHtml(profile.experienceYears)} years experience</span><span class="chip">${ui.escapeHtml(rate)} / hour</span></div>
      <h2>About</h2><p>${ui.escapeHtml(profile.bio || 'This professional has not added a description yet.')}</p>`;

    const reviews = reviewsResponse.data.reviews;
    if (reviews.length === 0) {
      reviewsElement.innerHTML = '<div class="empty-state">No reviews yet. Completed jobs can be reviewed by customers.</div>';
    } else {
      reviewsElement.innerHTML = reviews.map((review) => `<article class="review-card"><div class="worker-top"><div class="avatar" aria-hidden="true">${ui.escapeHtml((review.customer?.name || 'C').slice(0, 1).toUpperCase())}</div><div><strong>${ui.escapeHtml(review.customer?.name || 'Customer')}</strong><div class="worker-meta">${ui.escapeHtml(ui.formatDate(review.createdAt, { dateStyle: 'medium' }))}</div></div></div><div class="stars" aria-label="${ui.escapeHtml(review.rating)} out of 5 stars">${'★'.repeat(Number(review.rating))}${'☆'.repeat(5 - Number(review.rating))}</div><p>${ui.escapeHtml(review.comment || 'No written comment.')}</p></article>`).join('');
    }

    await renderBookingForm(profile, bookingArea);
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.hidden = true;
    ui.showMessage(pageMessage, error.message, 'error');
  }

  async function renderBookingForm(profile, target) {
    let user = null;
    if (api.getToken()) {
      try { user = await api.currentUser(); } catch (_error) { user = null; }
    }

    if (!user) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      target.innerHTML = `<h2>Book this worker</h2><p class="helper-text">Log in as a customer to request this service.</p><a class="button button--primary" href="/login.html?returnTo=${encodeURIComponent(returnTo)}">Log in to book</a>`;
      return;
    }
    if (user.role !== 'customer') {
      target.innerHTML = '<h2>Booking request</h2><p class="helper-text">Only customer accounts can create a booking request.</p>';
      return;
    }

    target.innerHTML = `<h2>Request a booking</h2><p class="helper-text">The worker will review your request and respond.</p><div id="booking-message" class="notice" role="status" hidden></div><form id="booking-form"><div class="field"><label for="description">What do you need?</label><textarea id="description" name="description" maxlength="5000" required></textarea></div><div class="field"><label for="address">Service address</label><input id="address" name="address" maxlength="255" autocomplete="street-address" required></div><div class="field"><label for="scheduledDate">Preferred date and time</label><input id="scheduledDate" name="scheduledDate" type="datetime-local" required></div><button class="button button--primary" type="submit">Send booking request</button></form>`;
    const dateField = target.querySelector('#scheduledDate');
    dateField.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    target.querySelector('#booking-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const values = new FormData(form);
      ui.setLoading(button, true, 'Sending request…');
      const status = target.querySelector('#booking-message');
      ui.showMessage(status, '', 'info');
      try {
        await api.post('/bookings', {
          workerId: profile.user.id,
          description: String(values.get('description')).trim(),
          address: String(values.get('address')).trim(),
          scheduledDate: new Date(values.get('scheduledDate')).toISOString()
        });
        ui.showMessage(status, 'Your request has been sent. You can follow its status in My bookings.', 'success');
        form.reset();
      } catch (error) {
        ui.showMessage(status, error.message, 'error');
      } finally {
        ui.setLoading(button, false);
      }
    });
  }
});
