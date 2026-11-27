'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Bookings', 'amountSantim', {
      type: Sequelize.BIGINT,
      allowNull: true
    });
    await queryInterface.addColumn('Bookings', 'paymentMethod', {
      type: Sequelize.ENUM('telebirr', 'cash'),
      allowNull: true
    });
    await queryInterface.addColumn('Bookings', 'paymentStatus', {
      type: Sequelize.ENUM('unpaid', 'verifying', 'paid', 'cash_due'),
      allowNull: false,
      defaultValue: 'unpaid'
    });
    await queryInterface.addColumn('Bookings', 'paidAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('Bookings', 'workerPaidOutAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addConstraint('Bookings', {
      fields: ['amountSantim'],
      type: 'check',
      name: 'bookings_amount_santim_positive',
      where: {
        amountSantim: { [Sequelize.Op.gt]: 0 }
      }
    });

    await queryInterface.createTable('TelebirrPayments', {
      txId: {
        type: Sequelize.STRING(10),
        primaryKey: true,
        allowNull: false
      },
      amountSantim: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      payerName: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      payerLast4: {
        type: Sequelize.STRING(4),
        allowNull: true
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      bookingId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        unique: 'telebirr_payments_booking_id_unique',
        references: { model: 'Bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addConstraint('TelebirrPayments', {
      fields: ['amountSantim'],
      type: 'check',
      name: 'telebirr_payments_amount_santim_positive',
      where: { amountSantim: { [Sequelize.Op.gt]: 0 } }
    });

    await queryInterface.createTable('PaymentSubmissions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      bookingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Bookings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      txId: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'verified', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addConstraint('PaymentSubmissions', {
      fields: ['bookingId', 'txId'],
      type: 'unique',
      name: 'payment_submissions_booking_tx_unique'
    });
    await queryInterface.addIndex('PaymentSubmissions', ['txId', 'status'], {
      name: 'payment_submissions_tx_status_idx'
    });

    await queryInterface.createTable('SmsLogs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      parsed: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      receivedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SmsLogs');
    await queryInterface.dropTable('PaymentSubmissions');
    await queryInterface.dropTable('TelebirrPayments');
    await queryInterface.removeConstraint('Bookings', 'bookings_amount_santim_positive');
    await queryInterface.removeColumn('Bookings', 'workerPaidOutAt');
    await queryInterface.removeColumn('Bookings', 'paidAt');
    await queryInterface.removeColumn('Bookings', 'paymentStatus');
    await queryInterface.removeColumn('Bookings', 'paymentMethod');
    await queryInterface.removeColumn('Bookings', 'amountSantim');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_PaymentSubmissions_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Bookings_paymentStatus";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Bookings_paymentMethod";');
  }
};
