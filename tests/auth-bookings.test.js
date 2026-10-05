jest.mock('../src/models', () => ({
  User: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn()
  },
  Skill: { findAll: jest.fn() },
  WorkerProfile: { findOne: jest.fn() },
  Booking: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn()
  },
  Review: { findOne: jest.fn(), create: jest.fn(), findAll: jest.fn() },
  sequelize: { transaction: jest.fn(), close: jest.fn() }
}));

const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const { User, WorkerProfile, Booking, sequelize } = require('../src/models');
const generateToken = require('../src/utils/generateToken');

function makeUser(overrides) {
  return {
    id: 101,
    name: 'Test User',
    email: 'test@example.com',
    phone: null,
    passwordHash: '$2b$12$fake-hash',
    role: 'customer',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
  };
}

function bearer(user) {
  return `Bearer ${generateToken(user)}`;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'jest-test-secret-only';
  process.env.JWT_EXPIRES_IN = '1h';
});

afterAll(() => {
  // Close the Sequelize pool even though these route tests use stubbed model methods.
  return require('../src/models').sequelize.close();
});

describe('authentication routes', () => {
  test('register hashes the password and never returns passwordHash', async () => {
    const savedUser = makeUser({ passwordHash: undefined });
    User.create.mockImplementation(async (values) => {
      savedUser.passwordHash = values.passwordHash;
      Object.assign(savedUser, values);
      return savedUser;
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'safe-pass-123', role: 'customer' });

    expect(response.status).toBe(201);
    expect(User.create).toHaveBeenCalledTimes(1);
    expect(await bcrypt.compare('safe-pass-123', User.create.mock.calls[0][0].passwordHash)).toBe(true);
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  test('login returns a signed token after verifying the password', async () => {
    const passwordHash = await bcrypt.hash('safe-pass-123', 4);
    User.findOne.mockResolvedValue(makeUser({ passwordHash }));

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'safe-pass-123' });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  test('protected /me rejects anonymous requests and accepts an active user token', async () => {
    const responseWithoutToken = await request(app).get('/api/auth/me');
    expect(responseWithoutToken.status).toBe(401);

    User.findByPk.mockResolvedValue(makeUser());
    const responseWithToken = await request(app)
      .get('/api/auth/me')
      .set('Authorization', bearer({ id: 101 }));

    expect(responseWithToken.status).toBe(200);
    expect(responseWithToken.body.data.user.id).toBe(101);
    expect(responseWithToken.body.data.user).not.toHaveProperty('passwordHash');
    expect(User.findByPk).toHaveBeenCalledWith('101', {
      attributes: { exclude: ['passwordHash'] }
    });
  });
});

describe('booking permissions', () => {
  test('only a customer may create a booking', async () => {
    User.findByPk.mockResolvedValue(makeUser({ id: 201, role: 'worker' }));

    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', bearer({ id: 201 }))
      .send({
        workerId: 202,
        description: 'Repair a sink',
        address: 'Bole, Addis Ababa',
        scheduledDate: new Date(Date.now() + 86400000).toISOString()
      });

    expect(response.status).toBe(403);
    expect(Booking.create).not.toHaveBeenCalled();
  });

  test('customer booking lists are scoped to the authenticated customer', async () => {
    User.findByPk.mockResolvedValue(makeUser({ id: 301, role: 'customer' }));
    Booking.findAll.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', bearer({ id: 301 }));

    expect(response.status).toBe(200);
    expect(Booking.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { customerId: 301 } }));
  });

  test('a worker cannot change a booking assigned to another worker', async () => {
    User.findByPk.mockResolvedValue(makeUser({ id: 401, role: 'worker' }));
    const foreignBooking = {
      id: 88,
      customerId: 300,
      workerId: 402,
      status: 'pending',
      update: jest.fn()
    };
    Booking.findByPk.mockResolvedValue(foreignBooking);
    sequelize.transaction.mockImplementation((callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));

    const response = await request(app)
      .patch('/api/bookings/88/status')
      .set('Authorization', bearer({ id: 401 }))
      .send({ status: 'accepted' });

    expect(response.status).toBe(403);
    expect(foreignBooking.update).not.toHaveBeenCalled();
  });

  test('customers cannot accept bookings as if they were workers', async () => {
    User.findByPk.mockResolvedValue(makeUser({ id: 501, role: 'customer' }));

    const response = await request(app)
      .patch('/api/bookings/99/status')
      .set('Authorization', bearer({ id: 501 }))
      .send({ status: 'accepted' });

    expect(response.status).toBe(403);
    expect(Booking.findByPk).not.toHaveBeenCalled();
  });
});
