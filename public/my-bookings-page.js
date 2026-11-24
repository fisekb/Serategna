document.addEventListener('DOMContentLoaded', async () => {
  const list = document.querySelector('#bookings-list');
  const message = document.querySelector('#page-message');
  const user = await ui.requireRole(['customer', 'worker']);
  if (!user) return;

  document.querySelector('#booking-intro').textContent = user.role === 'worker'
    ? 'Requests assigned to you, with the next action for each booking.'
    : 'Service requests you have made, with their latest status.';

  async function loadBookings() {
    list.innerHTML = '<div class="loading-state">Loading your bookings…</div>';
    try {
      const response = await api.get('/bookings/my');
      const bookings = response.data.bookings;
      if (bookings.length === 0) {
        list.innerHTML = user.role === 'customer'
          ? '<div class="empty-state"><h3>No bookings yet</h3><p>Find a local professional and send your first request.</p><a class="button button--primary" href="/">Find workers</a></div>'
          : '<div class="empty-state"><h3>No assigned bookings yet</h3><p>New requests will appear here.</p><a class="button button--quiet" href="/worker-profile.html">My profile</a></div>';
        return;
      }

      list.innerHTML = bookings.map(renderBooking).join('');
      list.querySelectorAll('[data-next-status]').forEach((button) => {
        button.addEventListener('click', () => updateStatus(button.dataset.bookingId, button.dataset.nextStatus, button));
      });
    } catch (error) {
      list.innerHTML = '';
      ui.showMessage(message, error.message, 'error');
    }
  }

  function renderBooking(booking) {
    const otherParty = user.role === 'customer' ? booking.worker?.name : booking.customer?.name;
    const otherLabel = user.role === 'customer' ? 'Worker' : 'Customer';
    const location = booking.address || 'Address not available';
    const status = booking.status;
    let actions = '';

    if (user.role === 'worker' && status === 'pending') {
      actions = `<button class="button button--primary button--small" data-booking-id="${ui.escapeHtml(booking.id)}" data-next-status="accepted">Accept</button><button class="button button--quiet button--small" data-booking-id="${ui.escapeHtml(booking.id)}" data-next-status="rejected">Decline</button>`;
    } else if (user.role === 'worker' && status === 'accepted') {
      actions = `<button class="button button--primary button--small" data-booking-id="${ui.escapeHtml(booking.id)}" data-next-status="completed">Mark complete</button>`;
    } else if (user.role === 'customer' && ['pending', 'accepted'].includes(status)) {
      actions = `<button class="button button--quiet button--small" data-booking-id="${ui.escapeHtml(booking.id)}" data-next-status="cancelled">Cancel booking</button>`;
    }

    return `<article class="card booking-card"><div><div class="worker-top"><div><span class="eyebrow">Booking #${ui.escapeHtml(booking.id)}</span><h3>${ui.escapeHtml(booking.description)}</h3></div><span class="status status--${ui.escapeHtml(status)}">${ui.escapeHtml(status)}</span></div><div class="booking-info"><span><strong>${ui.escapeHtml(otherLabel)}:</strong> ${ui.escapeHtml(otherParty || 'Account')}</span><span><strong>Scheduled:</strong> ${ui.escapeHtml(ui.formatDate(booking.scheduledDate))}</span><span><strong>Address:</strong> ${ui.escapeHtml(location)}</span></div></div><div class="button-row">${actions}</div></article>`;
  }

  async function updateStatus(bookingId, status, button) {
    if (status === 'rejected' || status === 'cancelled') {
      const action = status === 'rejected' ? 'decline this request' : 'cancel this booking';
      if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    }
    ui.setLoading(button, true, 'Saving…');
    ui.showMessage(message, '', 'info');
    try {
      await api.patch(`/bookings/${encodeURIComponent(bookingId)}/status`, { status });
      ui.showMessage(message, 'Booking status updated.', 'success');
      await loadBookings();
    } catch (error) {
      ui.showMessage(message, error.message, 'error');
      ui.setLoading(button, false);
    }
  }

  await loadBookings();
});
