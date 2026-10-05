# Project: Gig Worker Marketplace (Backend + basic HTML frontend)

## Goal

A website connecting gig workers (plumbers, electricians, carpenters, daily laborers, domestic workers) with customers who need them.

## Tech stack

- Node.js + Express.js
- PostgreSQL with Sequelize ORM (use Sequelize migrations and seeders, NOT sequelize.sync())
- Authentication: JWT (jsonwebtoken) + bcrypt for password hashing
- Frontend: plain HTML, CSS, and vanilla JavaScript (fetch API), served from /public
- Config: dotenv

## Architecture: MVC with separated layers

src/
config/ (db config, env loading)
models/ (Sequelize models + associations in models/index.js)
migrations/ (Sequelize migrations)
seeders/ (skills, admin user)
controllers/ (request/response logic only)
services/ (optional: business logic if controllers get big)
routes/ (one router file per resource, mounted in routes/index.js)
middleware/ (auth, role authorization, validation, error handler, rate limiter, notFound)
utils/ (AppError class, asyncHandler, token helpers)
app.js (express app setup)
server.js (starts server, connects DB)
public/ (HTML, CSS, JS files)
.env.example, .gitignore, README.md

## Roles

customer, worker, admin

## Data models

- User: id, name, email (unique), phone, passwordHash, role, isActive, timestamps
- Skill: id, name (unique)
- WorkerProfile: id, userId (FK, unique), skillId (FK), bio, hourlyRate, city, area, experienceYears, isApproved
- Booking: id, customerId (FK), workerId (FK), description, address, scheduledDate, status (pending/accepted/rejected/completed/cancelled)
- Review: id, bookingId (FK, unique), customerId, workerId, rating (1-5), comment
  Define all associations (hasOne, hasMany, belongsTo) in models/index.js.

## Coding rules

- Keep controllers thin, models handle data, routes only map URLs to controllers.
- Wrap async controllers in an asyncHandler; never use try/catch repetition everywhere.
- Use a central error-handling middleware and a custom AppError class with proper HTTP status codes.
- Use a consistent JSON response format: { success, message, data }.
- Validate all input (express-validator) before it reaches controllers.
- Never return passwordHash in any response.
- Read all secrets from process.env; never hardcode them.
- Use async/await, const/let, and clear comments explaining WHY, since I am a beginner learning.
- After writing code, briefly explain what it does and which backend concept it demonstrates.

## Security

helmet, cors, express-rate-limit (stricter on /auth), password hashing with bcrypt (salt rounds 10+), JWT expiry, ownership checks (users can only edit their own data), role-based authorization on the server.
