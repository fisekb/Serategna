document.addEventListener('DOMContentLoaded', async () => {
  const pageMessage = document.querySelector('#page-message');
  const workerList = document.querySelector('#worker-list');
  const userList = document.querySelector('#user-list');
  const unpricedBookingList = document.querySelector('#unpriced-booking-list');
  const submissionList = document.querySelector('#submission-list');
  const unlinkedPaymentList = document.querySelector('#unlinked-payment-list');
  const unparsedSmsList = document.querySelector('#unparsed-sms-list');
  const payoutList = document.querySelector('#payout-list');

  const admin = await ui.requireRole('admin');
  if (!admin) {
    document.querySelectorAll('[data-admin-tab], [data-admin-panel]').forEach((element) => {
      element.hidden = true;
    });
    return;
  }

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

  function formatAmount(amountSantim) {
    if (amountSantim === null || amountSantim === undefined) return 'Not set';
    const amount = BigInt(amountSantim);
    const sign = amount < 0n ? '-' : '';
    const absolute = amount < 0n ? -amount : amount;
    const birr = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const santim = (absolute % 100n).toString().padStart(2, '0');
    return `${sign}${birr}.${santim}`;
  }

  function amountBirrToSantim(value) {
    const match = String(value).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
    if (!match) return null;
    const amount = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0');
    if (amount < 1n || amount > 9223372036854775807n) return null;
    return amount.toString();
  }

  async function loadUnpricedBookings() {
    unpricedBookingList.innerHTML = '<div class="loading-state">Loading accepted bookings…</div>';
    try {
      const result = await api.get('/admin/bookings/unpriced');
      const bookings = result.data.bookings;
      document.querySelector('#unpriced-count').textContent = `${bookings.length} booking${bookings.length === 1 ? '' : 's'}`;
      unpricedBookingList.innerHTML = bookings.length
        ? bookings.map((booking) => {
          const bookingId = ui.escapeHtml(booking.id);
          return `<article class="admin-row admin-review-card">
            <div class="admin-row-info">
              <strong>Booking #${bookingId} · ${ui.escapeHtml(booking.customer?.name || 'Customer')}</strong>
              <span>Worker: ${ui.escapeHtml(booking.worker?.name || 'Worker')}</span>
              <span>${ui.escapeHtml(booking.description)}</span>
              <span>${ui.escapeHtml(booking.address)} · Scheduled ${ui.escapeHtml(ui.formatDate(booking.scheduledDate))}</span>
            </div>
            <form class="admin-price-form" data-booking-price-form="${bookingId}">
              <label class="field" for="booking-amount-${bookingId}">Agreed amount (birr)
                <input id="booking-amount-${bookingId}" name="amountBirr" type="number" min="0.01" step="0.01" inputmode="decimal" required>
              </label>
              <button class="button button--primary button--small" type="submit">Save price</button>
            </form>
          </article>`;
        }).join('')
        : '<div class="empty-state">No accepted bookings are waiting for a price.</div>';
    } catch (error) {
      unpricedBookingList.innerHTML = '';
      ui.showMessage(pageMessage, error.message, 'error');
    }
  }

  async function loadPaymentReview() {
    submissionList.innerHTML = '<div class="loading-state">Loading payment submissions…</div>';
    try {
      const result = await api.get('/admin/payments/review');
      const { submissions, unlinkedPayments, unparsedSms } = result.data;
      document.querySelector('#submission-count').textContent = `${submissions.length} pending`;
      document.querySelector('#unlinked-count').textContent = `${unlinkedPayments.length} payment${unlinkedPayments.length === 1 ? '' : 's'}`;
      document.querySelector('#unparsed-count').textContent = `${unparsedSms.length} message${unparsedSms.length === 1 ? '' : 's'}`;

      submissionList.innerHTML = submissions.length
        ? submissions.map((submission) => {
          const booking = submission.booking || {};
          const payment = submission.payment;
          const submissionId = ui.escapeHtml(submission.id);
          const received = payment
            ? `<span><strong>Received:</strong> ETB ${ui.escapeHtml(formatAmount(payment.amountSantim))}${payment.payerName ? ` from ${ui.escapeHtml(payment.payerName)}` : ''}${payment.payerLast4 ? ` (…${ui.escapeHtml(payment.payerLast4)})` : ''}</span><span><strong>Difference:</strong> ETB ${ui.escapeHtml(formatAmount(submission.amountDifferenceSantim))}</span>`
            : `<label class="field admin-amount-field" for="manual-amount-${submissionId}">Amount confirmed in Telebirr history (ETB)<input id="manual-amount-${submissionId}" data-manual-amount="${submissionId}" type="number" min="0.01" step="0.01" inputmode="decimal" required></label>`;
          return `<article class="admin-row admin-review-card">
            <div class="admin-row-info">
              <strong>Booking #${ui.escapeHtml(booking.id)} · ${ui.escapeHtml(booking.customer?.name || 'Customer')}</strong>
              <span>Worker: ${ui.escapeHtml(booking.worker?.name || 'Worker')} · ${ui.escapeHtml(booking.status || 'unknown')} booking</span>
              <span>Transaction ID: ${ui.escapeHtml(submission.txId)}</span>
              <span><strong>Agreed:</strong> ETB ${ui.escapeHtml(formatAmount(booking.amountSantim))}</span>
              ${received}
            </div>
            <div class="admin-row-actions">
              <button class="button button--primary button--small" type="button" data-payment-action="approve" data-submission-id="${submissionId}">Approve</button>
              <button class="button button--danger button--small" type="button" data-payment-action="reject" data-submission-id="${submissionId}">Reject</button>
            </div>
          </article>`;
        }).join('')
        : '<div class="empty-state">No pending payment submissions.</div>';

      unlinkedPaymentList.innerHTML = unlinkedPayments.length
        ? unlinkedPayments.map((payment) => `<article class="admin-row admin-review-card">
          <div class="admin-row-info">
            <strong>Transaction ID: ${ui.escapeHtml(payment.txId)}</strong>
            <span>Received: ETB ${ui.escapeHtml(formatAmount(payment.amountSantim))}${payment.payerName ? ` from ${ui.escapeHtml(payment.payerName)}` : ''}${payment.payerLast4 ? ` (…${ui.escapeHtml(payment.payerLast4)})` : ''}</span>
            <span>${ui.escapeHtml(ui.formatDate(payment.paidAt))}</span>
          </div>
        </article>`).join('')
        : '<div class="empty-state">No unlinked Telebirr payments.</div>';

      unparsedSmsList.innerHTML = unparsedSms.length
        ? unparsedSms.map((sms) => `<article class="admin-row admin-review-card">
          <div class="admin-row-info">
            <strong>SMS received ${ui.escapeHtml(ui.formatDate(sms.receivedAt))}</strong>
            <span class="admin-sms-body">${ui.escapeHtml(sms.body)}</span>
          </div>
        </article>`).join('')
        : '<div class="empty-state">No unparsed SMS messages.</div>';
    } catch (error) {
      submissionList.innerHTML = '';
      unlinkedPaymentList.innerHTML = '';
      unparsedSmsList.innerHTML = '';
      ui.showMessage(pageMessage, error.message, 'error');
    }
  }

  async function loadPayouts() {
    payoutList.innerHTML = '<div class="loading-state">Loading paid bookings…</div>';
    try {
      const result = await api.get('/admin/payments/paid-bookings');
      const bookings = result.data.bookings;
      document.querySelector('#payout-count').textContent = `${bookings.length} booking${bookings.length === 1 ? '' : 's'}`;
      payoutList.innerHTML = bookings.length
        ? bookings.map((booking) => {
          const bookingId = ui.escapeHtml(booking.id);
          const paidOut = Boolean(booking.workerPaidOutAt);
          return `<article class="admin-row">
            <div class="admin-row-info">
              <strong>Booking #${bookingId} · ${ui.escapeHtml(booking.worker?.name || 'Worker')}</strong>
              <span>${ui.escapeHtml(booking.description)}</span>
              <span>Booking amount: ETB ${ui.escapeHtml(formatAmount(booking.amountSantim))} · Received: ETB ${ui.escapeHtml(formatAmount(booking.telebirrPayment?.amountSantim))}</span>
              <span>Customer payment received ${ui.escapeHtml(ui.formatDate(booking.paidAt))}</span>
              ${paidOut ? `<span>Worker paid ${ui.escapeHtml(ui.formatDate(booking.workerPaidOutAt))}</span>` : '<span>Worker payout not yet recorded</span>'}
            </div>
            <div class="admin-row-actions">
              ${paidOut
                ? '<span class="status status--completed">Worker paid</span>'
                : `<button class="button button--primary button--small" type="button" data-payout-booking-id="${bookingId}">Mark worker paid</button>`}
            </div>
          </article>`;
        }).join('')
        : '<div class="empty-state">No Telebirr-paid bookings yet.</div>';
    } catch (error) {
      payoutList.innerHTML = '';
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

  unpricedBookingList.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-booking-price-form]');
    if (!form) return;
    event.preventDefault();

    const amountInput = form.querySelector('[name="amountBirr"]');
    const amountSantim = amountBirrToSantim(amountInput.value);
    if (!amountSantim) {
      amountInput.setCustomValidity('Enter a positive amount with up to two decimal places.');
      amountInput.reportValidity();
      return;
    }
    amountInput.setCustomValidity('');

    const button = form.querySelector('button[type="submit"]');
    ui.setLoading(button, true, 'Saving…');
    try {
      await api.patch(`/admin/bookings/${encodeURIComponent(form.dataset.bookingPriceForm)}/amount`, {
        amountSantim
      });
      ui.showMessage(pageMessage, 'Agreed booking amount saved. The customer can now choose how to pay.', 'success');
      await loadUnpricedBookings();
    } catch (error) {
      ui.showMessage(pageMessage, error.message, 'error');
      ui.setLoading(button, false);
    }
  });

  submissionList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-payment-action]');
    if (!button) return;
    const submissionId = button.dataset.submissionId;
    const action = button.dataset.paymentAction;
    if (action === 'reject' && !window.confirm('Reject this payment submission?')) return;

    const payload = {};
    if (action === 'approve') {
      const amountInput = submissionList.querySelector(`[data-manual-amount="${submissionId}"]`);
      if (amountInput) {
        const amountSantim = amountBirrToSantim(amountInput.value);
        if (!amountSantim) {
          amountInput.setCustomValidity('Enter a positive amount with up to two decimal places.');
          amountInput.reportValidity();
          return;
        }
        amountInput.setCustomValidity('');
        payload.amountSantim = amountSantim;
      }
    }

    ui.setLoading(button, true, 'Saving…');
    try {
      await api.patch(`/admin/payment-submissions/${encodeURIComponent(submissionId)}/${action}`, payload);
      ui.showMessage(pageMessage, action === 'approve' ? 'Payment approved.' : 'Payment submission rejected.', 'success');
      await Promise.all([loadPaymentReview(), loadPayouts()]);
    } catch (error) {
      ui.showMessage(pageMessage, error.message, 'error');
      ui.setLoading(button, false);
    }
  });

  payoutList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-payout-booking-id]');
    if (!button) return;
    ui.setLoading(button, true, 'Saving…');
    try {
      await api.patch(`/admin/bookings/${encodeURIComponent(button.dataset.payoutBookingId)}/worker-paid`, {});
      ui.showMessage(pageMessage, 'Worker payout recorded.', 'success');
      await loadPayouts();
    } catch (error) {
      ui.showMessage(pageMessage, error.message, 'error');
      ui.setLoading(button, false);
    }
  });

  await Promise.all([loadWorkers(), loadUsers(), loadUnpricedBookings(), loadPaymentReview(), loadPayouts()]);
});
