# Serategna

Serategna connects customers with local gig workers. The backend is built with Express and Sequelize/PostgreSQL, and the frontend is plain HTML, CSS, and vanilla JavaScript served from `public/`.

## Requirements

- Node.js 18 or newer (Node.js 20+ recommended)
- npm
- PostgreSQL 13 or newer

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create PostgreSQL databases for development and tests (for example `serategna_development` and `serategna_test`) and update the environment file.

3. Copy the example environment file and update its values:
   - PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`

   Set database credentials, a unique long `JWT_SECRET`, and a strong `ADMIN_PASSWORD`. Never commit `.env` or share its contents.

4. Apply migrations and insert seed data:

   ```sh
   npm run migrate
   npm run seed
   ```

   The seed command inserts the initial skills and creates the admin account from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. The password is hashed with bcrypt before storage. The skills/admin seeders are designed to avoid duplicate seed records where applicable.

5. Start the API and frontend:

   ```sh
   npm run dev
   ```

   Open `http://localhost:3000` (or the port configured by `PORT`). For a production-style start, use `npm start`.

## Environment variables

| Variable         | Purpose                                               | Example/default                      |
| ---------------- | ----------------------------------------------------- | ------------------------------------ |
| `PORT`           | HTTP port                                             | `3000`                               |
| `DB_HOST`        | PostgreSQL host                                       | `localhost`                          |
| `DB_PORT`        | PostgreSQL port                                       | `5432`                               |
| `DB_NAME`        | Database name                                         | `serategna_development`              |
| `DB_USER`        | Database login user                                   | `postgres`                           |
| `DB_TEST_NAME`   | Dedicated database used by payment integration tests  | `<DB_NAME>_test`                     |
| `DB_PASSWORD`    | Database login password                               | Set privately                        |
| `ADMIN_NAME`     | Name for the initial admin account                    | `Serategna Admin`                    |
| `ADMIN_EMAIL`    | Email for the initial admin account                   | `admin@serategna.local`              |
| `ADMIN_PASSWORD` | Initial admin password (required to seed admin)       | Set privately; use a strong password |
| `JWT_SECRET`     | Secret used to sign/verify JWTs                       | Generate a long random value         |
| `JWT_EXPIRES_IN` | JWT lifetime understood by `jsonwebtoken`             | `1d`                                 |
| `TELEBIRR_NUMBER` | Telebirr account number shown to customers            | Set privately                        |
| `TELEBIRR_ACCOUNT_NAME` | Name of the receiving Telebirr account          | Set privately                        |
| `SMS_SECRET`     | Shared secret required by the SMS-forwarding webhook  | At least 32 random characters        |
| `NODE_ENV`       | Runtime mode (`development`, `test`, or `production`) | `development`                        |

The Sequelize CLI reads the matching environment configuration and uses the project paths set in `.sequelizerc`. Migrations, rather than `sequelize.sync()`, manage database schema changes.

## Database commands

| Command                              | Effect                                   |
| ------------------------------------ | ---------------------------------------- |
| `npm run migrate`                    | Apply all pending migrations             |
| `npm run migrate -- --env test`      | Apply all pending migrations to the test database |
| `npm run migrate:undo`               | Undo the most recently applied migration |
| `npm run migrate:undo -- --env test` | Undo the most recent test database migration |
| `npm run seed`                       | Run all seeders                          |
| `npx sequelize-cli db:seed:undo:all` | Undo all seeders                         |

## Tests

Run the Jest + Supertest suite. Payment integration tests use the dedicated database configured by `DB_TEST_NAME` (or `<DB_NAME>_test` by default), so apply migrations to that database first:

```sh
npm run migrate -- --env test
npm test
```

The auth and booking authorization tests stub persistence; Telebirr payment tests use PostgreSQL to verify transactional matching and simultaneous webhook/submission arrivals.

## API endpoints

All API routes are prefixed with `/api`. Successful responses use `{ "success": true, "message": "...", "data": ... }`; errors use the same top-level shape with `success: false`. Protected endpoints require `Authorization: Bearer <JWT>`.

| Method   | Endpoint                         | Access             | Purpose                                                                                                      |
| -------- | -------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ | -------- |
| `GET`    | `/api/health`                    | Public             | Health check                                                                                                 |
| `POST`   | `/api/auth/register`             | Public             | Register a customer or worker; admin signup is not allowed                                                   |
| `POST`   | `/api/auth/login`                | Public             | Verify credentials and return a JWT                                                                          |
| `GET`    | `/api/auth/me`                   | Signed-in user     | Get the current account                                                                                      |
| `PATCH`  | `/api/auth/profile`              | Customer           | Update your own name and phone number                                                                       |
| `GET`    | `/api/skills`                    | Public             | List service skills                                                                                          |
| `GET`    | `/api/workers`                   | Public             | Search approved worker profiles; supports `skill`, `city`, `area`, `minRate`, `maxRate`, `page`, and `limit` |
| `GET`    | `/api/workers/:id`               | Public             | Get an approved worker profile (`id` is a WorkerProfile ID)                                                  |
| `GET`    | `/api/workers/:id/reviews`       | Public             | List reviews for an approved worker profile                                                                  |
| `GET`    | `/api/workers/profile`           | Worker             | Get your own profile, including one awaiting approval                                                        |
| `POST`   | `/api/workers/profile`           | Worker             | Create your single worker profile                                                                            |
| `PUT`    | `/api/workers/profile`           | Worker             | Update your own worker profile                                                                               |
| `DELETE` | `/api/workers/profile`           | Worker             | Delete your own worker profile                                                                               |
| `POST`   | `/api/jobs`                      | Customer           | Post a job offer with a requested skill, hourly rate, city, area, and description                            |
| `GET`    | `/api/jobs/mine`                 | Customer           | List your own job offers                                                                                    |
| `PUT`    | `/api/jobs/:id`                   | Customer           | Edit your own offer while no worker has accepted it                                                         |
| `DELETE` | `/api/jobs/:id`                   | Customer           | Delete your own offer while no worker has accepted it                                                       |
| `GET`    | `/api/jobs`                      | Worker             | Browse customer job offers                                                                                  |
| `PATCH`  | `/api/jobs/:id/accept`            | Worker             | Accept an open customer offer; only one worker can accept each offer                                        |
| `POST`   | `/api/bookings`                  | Customer           | Request a booking with an approved worker                                                                    |
| `GET`    | `/api/bookings/my`               | Customer or worker | List bookings belonging to the signed-in account                                                             |
| `GET`    | `/api/bookings/:id/worker-contact` | Customer           | Get the assigned worker's profile and phone number for an accepted booking                                  |
| `POST`   | `/api/bookings/:id/pay-later`     | Customer           | Select cash for an accepted, unpaid booking and mark it cash due                                              |
| `PATCH`  | `/api/bookings/:id/status`       | Customer or worker | Cancel your own booking or transition an assigned booking                                                    |
| `POST`   | `/api/telebirr/submissions`      | Customer           | Submit `{ "bookingId": 1, "txId": "ABCD123456" }` for verification                                           |
| `GET`    | `/api/telebirr/bookings/:id/payment-details` | Customer | Get the receiving Telebirr details and server-stored booking amount                                         |
| `GET`    | `/api/telebirr/bookings/:id/status` | Customer       | Check the payment status of your booking                                                                    |
| `POST`   | `/api/telebirr/sms`             | SMS gateway secret | Record and match an authenticated SMS forwarded from sender `127`                                           |
| `GET`    | `/api/admin/bookings/unpriced`  | Admin              | List accepted bookings awaiting an agreed amount                                                            |
| `PATCH`  | `/api/admin/bookings/:id/amount`| Admin              | Set the agreed booking amount once using `{ "amountSantim": "123450" }`                                     |
| `GET`    | `/api/admin/payments/review`    | Admin              | List pending submissions, matching received payments, unlinked payments, and unparsed SMS                   |
| `PATCH`  | `/api/admin/payment-submissions/:id/approve` | Admin | Approve a pending payment; provide `{ "amountSantim": "100" }` when no SMS receipt exists                 |
| `PATCH`  | `/api/admin/payment-submissions/:id/reject` | Admin  | Reject a pending payment submission                                                                         |
| `GET`    | `/api/admin/payments/paid-bookings` | Admin          | List Telebirr-paid bookings and worker payout status                                                        |
| `PATCH`  | `/api/admin/bookings/:id/worker-paid` | Admin         | Record the worker payout for a Telebirr-paid booking                                                        |
| `POST`   | `/api/reviews`                   | Customer           | Review a completed booking you own (one review per booking)                                                  |
| `GET`    | `/api/admin/users`               | Admin              | List users without password hashes                                                                           |
| `PATCH`  | `/api/admin/users/:id/status`    | Admin              | Activate/deactivate a user with `{ "isActive": true }`                                                        |
| `GET`    | `/api/admin/workers/pending`     | Admin              | List worker profiles waiting for approval                                                                    |
| `PATCH`  | `/api/admin/workers/:id/approve` | Admin              | Approve a worker profile (`id` is a WorkerProfile ID)                                                        |

### Booking and review notes

- `POST /api/bookings` expects `workerId` to be the worker's **User ID**, because the booking foreign key references `Users`. In worker search results this value is available as `data.workers[].user.id`.
- New bookings start in `pending` status. Workers can accept/reject pending bookings and complete accepted bookings. Customers can cancel their own pending bookings, but cannot cancel after a worker accepts. Customers can use Pay now on accepted bookings with an agreed amount; the payment panel displays the configured Telebirr account and amount, accepts a transaction ID, and checks verification every five seconds while the page is open. Transaction IDs are uppercased, and submissions are limited to five per booking per hour.
- Pay later records `paymentMethod: cash` and `paymentStatus: cash_due`, then reveals the worker's profile and phone number. Only the customer who owns an accepted, unpaid booking can choose either payment option.
- In the admin page's **Booking prices** tab, set the agreed total in birr for accepted bookings awaiting a price. The saved value is an integer number of santim via `/api/admin/bookings/:id/amount`; the amount cannot be changed after it is set. Customers then see **Pay now** and **Pay later** in My bookings. Pay now is disabled until an amount is set; Pay later remains available.
- Payment matching only succeeds when the SMS amount equals the saved agreed amount exactly.
- The SMS-forwarding service must send `POST /api/telebirr/sms` with `x-sms-secret` and JSON fields `from` and `text`. Authenticated messages from sender `127` are logged, parsed, and matched to customer submissions; other senders are acknowledged but ignored. Configure `SMS_SECRET` with at least 32 random characters.
- The admin page (`/admin.html`) includes payment review and worker payout tabs. Review a received amount and its difference from the agreed booking amount before approving. If no SMS was received, check Telebirr history and enter the actual amount in birr; approval saves a payment record against the submitted transaction ID so a later SMS delivery cannot reuse it. A transaction ID can only be linked to one booking. Worker payout marking is available only for Telebirr-paid bookings and records the time of payout.
- Admin API routes use the same active-user JWT authentication and server-side `admin` role authorization as the other `/api/admin` routes. The frontend stores the JWT and sends it in the `Authorization` header (not a cookie), so browser requests do not rely on cookie-based authentication.

Example webhook request (replace the hostname with your HTTPS deployment and set `SMS_SECRET` in your shell; never put the secret in the URL or source control):

```sh
curl -X POST https://your-domain.example/api/telebirr/sms \
  -H "Content-Type: application/json" \
  -H "x-sms-secret: $SMS_SECRET" \
  -d '{"from":"127","text":"Dear customer You have received ETB 1,234.50 from Jane Doe (0912*3456) on 26/11/2026 10:11:12. Your transaction number is ABCD123456."}'
```

### Android SMS forwarder

Configure an Android SMS-forwarding app or trusted gateway with the following settings:

1. Filter incoming messages so **only sender `127`** is forwarded.
2. Set the destination to `https://your-domain.example/api/telebirr/sms`. Use a valid HTTPS certificate; do not send SMS contents over plain HTTP.
3. Use a JSON `POST` body template of `{"from":"%from%","text":"%text%"}` and add the request header `x-sms-secret` with the same private value as the server's `SMS_SECRET`.
4. Grant the app SMS permissions and turn off battery optimization for it in Android settings so background forwarding remains reliable.
5. Send a test Telebirr SMS and confirm that the webhook returns a successful response and that the submission appears in the admin payment review page.

### Real-payment smoke test

Use staging accounts and a test Telebirr receiving account, not a production booking:

1. As a customer, create a booking with an approved test worker. Have the worker accept it.
2. As an admin, set the agreed booking amount to **1.00 birr (100 santim)**.
3. Pay exactly **1.00 birr** to the configured `TELEBIRR_NUMBER` using a test Telebirr account.
4. Confirm the Android forwarder receives the SMS from sender `127` and the customer payment panel accepts the transaction ID from that receipt.
5. Confirm the customer booking changes to **Paid**. In the admin page, verify it no longer appears as pending and appears under **Worker payouts** with the correct worker, booking amount, and received amount.
6. Select **Mark worker paid** and confirm the payout timestamp appears. Verify the action is no longer available for that booking.
7. If automatic matching fails, inspect the pending submission and any unparsed SMS in admin review before approving or rejecting; do not approve a payment without checking Telebirr history.
- Reviews can only be created by the booking's customer after the booking is completed. The database enforces one review per booking.
- Customers can update their own name and phone number and post job offers. Workers can browse all offers; job offer fields and skill relationships are stored through the Sequelize migration.
- Accepting an offer records the worker and prevents the customer from editing or deleting that offer. The acceptance transaction locks the offer row so two workers cannot accept the same offer concurrently.

## Frontend pages

The Express app serves the plain static frontend from `public/`:

- `/` — Worker search and filters
- `/register.html` and `/login.html` — Account creation and login
- `/worker-profile.html` — Create/edit your worker profile
- `/customer-profile.html` — View and update your customer name and phone number
- `/my-jobs.html` — Post and review your job offers
- `/job-offers.html` — Browse customer job offers as a worker
- `/worker-detail.html?id=<profile-id>` — Worker details, reviews, and booking form
- `/my-bookings.html` — View and manage your bookings
- `/admin.html` — Admin-only worker, account, booking price, payment review, and payout dashboard

The browser helper in `public/api.js` stores the JWT in `localStorage` and attaches it to protected requests. Avoid using shared or public devices for accounts that authenticate this way; log out when finished.
