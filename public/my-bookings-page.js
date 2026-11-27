document.addEventListener('DOMContentLoaded', async () => {
  const list = document.querySelector('#bookings-list');
  const message = document.querySelector('#page-message');
  const paymentDialog = document.querySelector('#payment-dialog');
  const paymentForm = document.querySelector('#payment-form');
  const paymentInput = document.querySelector('#payment-tx-id');
  const paymentSendButton = document.querySelector('#payment-send');
  const paymentMessage = document.querySelector('#payment-message');
  const paymentPollers = new Map();
  let activePaymentBookingId = null;

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
      list.querySelectorAll('[data-pay-now]').forEach((button) => {
        button.addEventListener('click', () => openPaymentPanel(button.dataset.payNow, button));
      });
      list.querySelectorAll('[data-pay-later]').forEach((button) => {
        button.addEventListener('click', () => choosePayLater(button.dataset.payLater, button));
      });
      list.querySelectorAll('[data-view-worker-contact]').forEach((button) => {
        button.addEventListener('click', () => showWorkerContact(button.dataset.viewWorkerContact, button));
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
    const paymentStatus = booking.paymentStatus || 'unpaid';
    const bookingId = ui.escapeHtml(booking.id);
    let actions = '';

    if (user.role === 'worker' && status === 'pending') {
      actions = `<button class="button button--primary button--small" data-booking-id="${bookingId}" data-next-status="accepted">Accept</button><button class="button button--quiet button--small" data-booking-id="${bookingId}" data-next-status="rejected">Decline</button>`;
    } else if (user.role === 'worker' && status === 'accepted') {
      actions = `<button class="button button--primary button--small" data-booking-id="${bookingId}" data-next-status="completed">Mark complete</button>`;
    } else if (user.role === 'customer' && status === 'pending') {
      actions = `<button class="button button--quiet button--small" data-booking-id="${bookingId}" data-next-status="cancelled">Cancel booking</button>`;
    } else if (user.role === 'customer' && status === 'accepted') {
      if (paymentStatus === 'paid') {
        actions = '<span class="status status--completed">Paid</span>';
      } else if (paymentStatus === 'cash_due') {
        actions = `<span class="status">Cash due</span><button class="button button--quiet button--small" type="button" data-view-worker-contact="${bookingId}">Show worker contact</button>`;
      } else if (paymentStatus === 'verifying') {
        actions = `<span class="status">Verifying payment</span><button class="button button--primary button--small" type="button" data-pay-now="${bookingId}">Continue payment</button>`;
      } else if (booking.amountSantim === null || booking.amountSantim === undefined) {
        actions = `<span class="status">Agreed amount pending</span><button class="button button--primary button--small" type="button" disabled title="Available when the admin sets the agreed amount">Pay now</button><button class="button button--quiet button--small" type="button" data-pay-later="${bookingId}">Pay later</button><span class="helper-text">Pay now will be available when the agreed amount is set.</span>`;
      } else {
        actions = `<button class="button button--primary button--small" type="button" data-pay-now="${bookingId}">Pay now</button><button class="button button--quiet button--small" type="button" data-pay-later="${bookingId}">Pay later</button>`;
      }
    }

    const paymentInfo = user.role === 'customer' && status === 'accepted'
      ? `<span data-payment-state="${bookingId}"><strong>Payment:</strong> ${ui.escapeHtml(paymentStatus.replace('_', ' '))}</span>`
      : '';

    return `<article class="card booking-card"><div><div class="worker-top"><div><span class="eyebrow">Booking #${bookingId}</span><h3>${ui.escapeHtml(booking.description)}</h3></div><span class="status status--${ui.escapeHtml(status)}">${ui.escapeHtml(status)}</span></div><div class="booking-info"><span><strong>${ui.escapeHtml(otherLabel)}:</strong> ${ui.escapeHtml(otherParty || 'Account')}</span><span><strong>Scheduled:</strong> ${ui.escapeHtml(ui.formatDate(booking.scheduledDate))}</span><span><strong>Address:</strong> ${ui.escapeHtml(location)}</span>${paymentInfo}</div><div data-worker-contact="${bookingId}"></div></div><div class="button-row">${actions}</div></article>`;
  }

  async function showWorkerContact(bookingId, button) {
    ui.setLoading(button, true, 'Loading…');
    ui.showMessage(message, '', 'info');
    try {
      const response = await api.get(`/bookings/${encodeURIComponent(bookingId)}/worker-contact`);
      const worker = response.data.worker;
      const profile = worker.workerProfile;
      const contact = document.querySelector(`[data-worker-contact="${Number(bookingId)}"]`);
      if (!contact) return;
      const skill = profile?.skill?.name;
      const location = [profile?.area, profile?.city].filter(Boolean).map(ui.escapeHtml).join(', ');
      contact.innerHTML = `<section class="side-note booking-worker-contact"><h3>Worker profile</h3><p><strong>${ui.escapeHtml(worker.name)}</strong></p><p>Phone: ${worker.phone ? `<a href="tel:${ui.escapeHtml(worker.phone)}">${ui.escapeHtml(worker.phone)}</a>` : 'Not provided'}</p>${skill ? `<p>Primary skill: ${ui.escapeHtml(skill)}</p>` : ''}${location ? `<p>Location: ${location}</p>` : ''}${profile?.experienceYears !== null && profile?.experienceYears !== undefined ? `<p>Experience: ${ui.escapeHtml(profile.experienceYears)} years</p>` : ''}${profile?.bio ? `<p>${ui.escapeHtml(profile.bio)}</p>` : ''}</section>`;
      button.disabled = true;
      button.textContent = 'Worker details shown';
    } catch (error) {
      ui.showMessage(message, error.message, 'error');
      ui.setLoading(button, false);
    }
  }

  async function choosePayLater(bookingId, button) {
    ui.setLoading(button, true, 'Saving…');
    ui.showMessage(message, '', 'info');
    try {
      await api.post(`/bookings/${encodeURIComponent(bookingId)}/pay-later`, {});
      await loadBookings();
      const contactButton = list.querySelector(`[data-view-worker-contact="${Number(bookingId)}"]`);
      if (contactButton) {
        await showWorkerContact(bookingId, contactButton);
      }
      ui.showMessage(message, 'Cash payment selected. Pay the worker directly.', 'success');
    } catch (error) {
      ui.showMessage(message, error.message, 'error');
      ui.setLoading(button, false);
    }
  }

  async function openPaymentPanel(bookingId, button) {
    ui.setLoading(button, true, 'Loading…');
    ui.showMessage(message, '', 'info');
    try {
      const response = await api.get(`/telebirr/bookings/${encodeURIComponent(bookingId)}/payment-details`);
      const payment = response.data.payment;
      activePaymentBookingId = Number(bookingId);
      paymentInput.value = '';
      paymentInput.disabled = false;
      paymentInput.setCustomValidity('');
      paymentSendButton.disabled = false;
      paymentSendButton.textContent = 'Send';
      document.querySelector('#payment-number').textContent = payment.telebirrNumber;
      document.querySelector('#payment-account-name').textContent = payment.accountName;
      document.querySelector('#payment-amount').textContent = payment.amountBirr;
      ui.showMessage(
        paymentMessage,
        payment.paymentStatus === 'verifying'
          ? 'Verifying payment. You can submit a corrected transaction ID.'
          : 'Send this exact amount to the account below, then enter your transaction ID.',
        'info'
      );
      if (!paymentDialog.open) paymentDialog.showModal();
      if (payment.paymentStatus === 'verifying') {
        startPaymentPolling(activePaymentBookingId);
      }
      paymentInput.focus();
    } catch (error) {
      ui.showMessage(message, error.message, 'error');
    } finally {
      ui.setLoading(button, false);
    }
  }

  paymentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activePaymentBookingId) return;

    const txId = paymentInput.value.toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(txId)) {
      paymentInput.setCustomValidity('Enter exactly 10 letters or digits.');
      paymentInput.reportValidity();
      return;
    }
    paymentInput.setCustomValidity('');
    paymentSendButton.disabled = true;
    paymentSendButton.textContent = 'Sending…';
    ui.showMessage(paymentMessage, '', 'info');

    try {
      const response = await api.post('/telebirr/submissions', {
        bookingId: activePaymentBookingId,
        txId
      });
      if (response.data.matched) {
        stopPaymentPolling(activePaymentBookingId);
        paymentInput.disabled = true;
        ui.showMessage(paymentMessage, 'Paid.', 'success');
      } else {
        ui.showMessage(paymentMessage, 'Verifying payment.', 'info');
        startPaymentPolling(activePaymentBookingId);
      }
      await loadBookings();
    } catch (error) {
      ui.showMessage(paymentMessage, error.message, 'error');
    } finally {
      if (!paymentInput.disabled) {
        paymentSendButton.disabled = false;
        paymentSendButton.textContent = 'Send';
      }
    }
  });

  function startPaymentPolling(bookingId) {
    const id = Number(bookingId);
    if (paymentPollers.has(id)) return;

    const poller = { interval: null, busy: false };
    paymentPollers.set(id, poller);
    const checkStatus = async () => {
      if (poller.busy) return;
      poller.busy = true;
      try {
        const response = await api.get(`/telebirr/bookings/${encodeURIComponent(id)}/status`);
        const payment = response.data.payment;
        if (payment.paymentStatus === 'paid') {
          stopPaymentPolling(id);
          if (activePaymentBookingId === id) {
            paymentInput.disabled = true;
            paymentSendButton.disabled = true;
            ui.showMessage(paymentMessage, 'Paid.', 'success');
          }
          await loadBookings();
        } else if (payment.paymentStatus === 'cash_due') {
          stopPaymentPolling(id);
          if (activePaymentBookingId === id) {
            ui.showMessage(paymentMessage, 'Cash payment selected.', 'info');
          }
          await loadBookings();
        } else if (activePaymentBookingId === id) {
          ui.showMessage(paymentMessage, 'Verifying payment.', 'info');
        }
      } catch (error) {
        if ([401, 403, 404].includes(error.status)) {
          stopPaymentPolling(id);
          if (activePaymentBookingId === id) {
            ui.showMessage(paymentMessage, `Payment status check stopped: ${error.message}`, 'error');
          }
          return;
        }
        if (activePaymentBookingId === id) {
          ui.showMessage(paymentMessage, 'Could not check payment status. Retrying shortly.', 'error');
        }
      } finally {
        poller.busy = false;
      }
    };

    poller.interval = window.setInterval(checkStatus, 5000);
    checkStatus();
  }

  function stopPaymentPolling(bookingId) {
    const poller = paymentPollers.get(Number(bookingId));
    if (!poller) return;
    window.clearInterval(poller.interval);
    paymentPollers.delete(Number(bookingId));
  }

  document.querySelector('#payment-close').addEventListener('click', () => paymentDialog.close());
  paymentDialog.addEventListener('close', () => {
    activePaymentBookingId = null;
  });
  window.addEventListener('pagehide', () => {
    paymentPollers.forEach((poller) => window.clearInterval(poller.interval));
    paymentPollers.clear();
  });

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
