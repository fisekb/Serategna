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

2. Create a PostgreSQL database named `serategna_development` (or choose another name and update the environment file).

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
| `DB_PASSWORD`    | Database login password                               | Set privately                        |
| `ADMIN_NAME`     | Name for the initial admin account                    | `Serategna Admin`                    |
| `ADMIN_EMAIL`    | Email for the initial admin account                   | `admin@serategna.local`              |
| `ADMIN_PASSWORD` | Initial admin password (required to seed admin)       | Set privately; use a strong password |
| `JWT_SECRET`     | Secret used to sign/verify JWTs                       | Generate a long random value         |
| `JWT_EXPIRES_IN` | JWT lifetime understood by `jsonwebtoken`             | `1d`                                 |
| `NODE_ENV`       | Runtime mode (`development`, `test`, or `production`) | `development`                        |

The Sequelize CLI reads the matching environment configuration and uses the project paths set in `.sequelizerc`. Migrations, rather than `sequelize.sync()`, manage database schema changes.

## Database commands

| Command                              | Effect                                   |
| ------------------------------------ | ---------------------------------------- |
| `npm run migrate`                    | Apply all pending migrations             |
| `npm run migrate:undo`               | Undo the most recently applied migration |
| `npm run seed`                       | Run all seeders                          |
| `npx sequelize-cli db:seed:undo:all` | Undo all seeders                         |

## Tests

Run the Jest + Supertest suite:

```sh
npm test
```

The tests stub persistence methods, so auth and booking authorization behavior can be checked without a running PostgreSQL instance.

## API endpoints

All API routes are prefixed with `/api`. Successful responses use `{ "success": true, "message": "...", "data": ... }`; errors use the same top-level shape with `success: false`. Protected endpoints require `Authorization: Bearer <JWT>`.

| Method   | Endpoint                         | Access             | Purpose                                                                                                      |
| -------- | -------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ | -------- |
| `GET`    | `/api/health`                    | Public             | Health check                                                                                                 |
| `POST`   | `/api/auth/register`             | Public             | Register a customer or worker; admin signup is not allowed                                                   |
| `POST`   | `/api/auth/login`                | Public             | Verify credentials and return a JWT                                                                          |
| `GET`    | `/api/auth/me`                   | Signed-in user     | Get the current account                                                                                      |
| `GET`    | `/api/skills`                    | Public             | List service skills                                                                                          |
| `GET`    | `/api/workers`                   | Public             | Search approved worker profiles; supports `skill`, `city`, `area`, `minRate`, `maxRate`, `page`, and `limit` |
| `GET`    | `/api/workers/:id`               | Public             | Get an approved worker profile (`id` is a WorkerProfile ID)                                                  |
| `GET`    | `/api/workers/:id/reviews`       | Public             | List reviews for an approved worker profile                                                                  |
| `GET`    | `/api/workers/profile`           | Worker             | Get your own profile, including one awaiting approval                                                        |
| `POST`   | `/api/workers/profile`           | Worker             | Create your single worker profile                                                                            |
| `PUT`    | `/api/workers/profile`           | Worker             | Update your own worker profile                                                                               |
| `DELETE` | `/api/workers/profile`           | Worker             | Delete your own worker profile                                                                               |
| `POST`   | `/api/bookings`                  | Customer           | Request a booking with an approved worker                                                                    |
| `GET`    | `/api/bookings/my`               | Customer or worker | List bookings belonging to the signed-in account                                                             |
| `PATCH`  | `/api/bookings/:id/status`       | Customer or worker | Cancel your own booking or transition an assigned booking                                                    |
| `POST`   | `/api/reviews`                   | Customer           | Review a completed booking you own (one review per booking)                                                  |
| `GET`    | `/api/admin/users`               | Admin              | List users without password hashes                                                                           |
| `PATCH`  | `/api/admin/users/:id/status`    | Admin              | Activate/deactivate a user with `{ "isActive": true                                                          | false }` |
| `GET`    | `/api/admin/workers/pending`     | Admin              | List worker profiles waiting for approval                                                                    |
| `PATCH`  | `/api/admin/workers/:id/approve` | Admin              | Approve a worker profile (`id` is a WorkerProfile ID)                                                        |

### Booking and review notes

- `POST /api/bookings` expects `workerId` to be the worker's **User ID**, because the booking foreign key references `Users`. In worker search results this value is available as `data.workers[].user.id`.
- New bookings start in `pending` status. Workers can accept/reject pending bookings and complete accepted bookings. Customers can cancel their own pending or accepted bookings.
- Reviews can only be created by the booking's customer after the booking is completed. The database enforces one review per booking.

## Frontend pages

The Express app serves the plain static frontend from `public/`:

- `/` — Worker search and filters
- `/register.html` and `/login.html` — Account creation and login
- `/worker-profile.html` — Create/edit your worker profile
- `/worker-detail.html?id=<profile-id>` — Worker details, reviews, and booking form
- `/my-bookings.html` — View and manage your bookings

The browser helper in `public/api.js` stores the JWT in `localStorage` and attaches it to protected requests. Avoid using shared or public devices for accounts that authenticate this way; log out when finished.
