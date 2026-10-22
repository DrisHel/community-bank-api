import { randomUUID } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import {
  AccountNotFoundError,
  ConflictError,
  CustomerNotFoundError,
  moneyToCents,
  type MovementType,
} from "../domain/account.js";
import type {
  AccountMovementTransaction,
  AccountCreationInput,
  AccountRecord,
  AccountRepository,
  BenefitInput,
  BenefitRecord,
  CardRequestRecord,
  CreditRequestInput,
  CreditRequestRecord,
  CustomerRecord,
  FinancialReport,
  LockedAccountRecord,
  ManagerRecord,
  MovementRecord,
  PaymentInput,
  PaymentRecord,
} from "../application/account-repository.js";

interface AccountRow extends QueryResultRow {
  id: string;
  account_number: string;
  holder_name: string;
  customer_id: string;
  balance: string;
  status: string;
}

interface MovementRow extends QueryResultRow {
  id: string;
  account_id: string;
  type: MovementType;
  amount: string;
  balance_after: string;
  description: string | null;
  reference: string | null;
  created_at: Date;
}

interface CustomerRow extends QueryResultRow {
  id: string;
  name: string;
  email: string | null;
  created_at: Date;
}

interface CreditRequestRow extends QueryResultRow {
  id: string;
  customer_id: string;
  account_id: string | null;
  type: "solidarity" | "personal";
  amount: string;
  interest_rate: string;
  purpose: string;
  enterprise_name: string | null;
  status: "pending";
  created_at: Date;
}

interface CardRow extends QueryResultRow {
  id: string;
  account_id: string;
  customer_id: string;
  cardholder_name: string;
  status: "requested";
  created_at: Date;
}

interface PaymentRow extends QueryResultRow {
  id: string;
  account_id: string;
  payee: string;
  description: string;
  amount: string;
  created_at: Date;
}

interface BenefitRow extends QueryResultRow {
  id: string;
  account_id: string;
  benefit_type: string;
  reference: string | null;
  amount: string;
  created_at: Date;
}

interface ManagerRow extends QueryResultRow {
  id: string;
  account_id: string;
  name: string;
  email: string;
  role: string;
  created_at: Date;
}

function mapAccount(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    accountNumber: row.account_number,
    holderName: row.holder_name,
    balance: moneyToCents(row.balance, true) / 100,
    status: row.status,
  };
}

function mapCustomer(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at.toISOString(),
  };
}

function mapMovement(row: MovementRow): MovementRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    type: row.type,
    amount: moneyToCents(row.amount) / 100,
    balanceAfter: moneyToCents(row.balance_after, true) / 100,
    description: row.description,
    reference: row.reference,
    createdAt: row.created_at.toISOString(),
  };
}

function mapCreditRequest(row: CreditRequestRow): CreditRequestRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    accountId: row.account_id,
    type: row.type,
    amount: moneyToCents(row.amount) / 100,
    interestRate: Number(row.interest_rate),
    purpose: row.purpose,
    enterpriseName: row.enterprise_name,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

function mapCard(row: CardRow): CardRequestRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    customerId: row.customer_id,
    cardholderName: row.cardholder_name,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    payee: row.payee,
    description: row.description,
    amount: moneyToCents(row.amount) / 100,
    createdAt: row.created_at.toISOString(),
  };
}

function mapBenefit(row: BenefitRow): BenefitRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    benefitType: row.benefit_type,
    reference: row.reference,
    amount: moneyToCents(row.amount) / 100,
    createdAt: row.created_at.toISOString(),
  };
}

function mapManager(row: ManagerRow): ManagerRecord {
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at.toISOString(),
  };
}

export class PostgresAccountRepository implements AccountRepository {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id text PRIMARY KEY,
        name text NOT NULL,
        email text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE SEQUENCE IF NOT EXISTS account_number_sequence START WITH 1000;

      CREATE TABLE IF NOT EXISTS accounts (
        id text PRIMARY KEY,
        customer_id text REFERENCES customers(id),
        account_number text NOT NULL UNIQUE,
        holder_name text NOT NULL,
        balance numeric(14, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
        status text NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'inactive')),
        created_at timestamptz NOT NULL DEFAULT now()
      );

      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS customer_id text
        REFERENCES customers(id);

      CREATE TABLE IF NOT EXISTS account_movements (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        account_id text NOT NULL REFERENCES accounts(id),
        type text NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
        amount numeric(14, 2) NOT NULL CHECK (amount > 0),
        balance_after numeric(14, 2) NOT NULL CHECK (balance_after >= 0),
        description text,
        reference text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      ALTER TABLE account_movements ADD COLUMN IF NOT EXISTS description text;
      ALTER TABLE account_movements ADD COLUMN IF NOT EXISTS reference text;
      ALTER TABLE account_movements DROP CONSTRAINT IF EXISTS account_movements_type_check;
      ALTER TABLE account_movements ADD CONSTRAINT account_movements_type_check
        CHECK (type IN ('deposit', 'withdrawal', 'payment', 'benefit'));

      CREATE TABLE IF NOT EXISTS credit_requests (
        id text PRIMARY KEY,
        customer_id text NOT NULL REFERENCES customers(id),
        account_id text REFERENCES accounts(id),
        type text NOT NULL CHECK (type IN ('solidarity', 'personal')),
        amount numeric(14, 2) NOT NULL CHECK (amount > 0),
        interest_rate numeric(5, 2) NOT NULL DEFAULT 0 CHECK (interest_rate = 0),
        purpose text NOT NULL,
        enterprise_name text,
        status text NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at timestamptz NOT NULL DEFAULT now(),
        CHECK (type <> 'solidarity' OR enterprise_name IS NOT NULL)
      );

      CREATE TABLE IF NOT EXISTS card_requests (
        id text PRIMARY KEY,
        account_id text NOT NULL REFERENCES accounts(id),
        customer_id text NOT NULL REFERENCES customers(id),
        cardholder_name text NOT NULL,
        status text NOT NULL DEFAULT 'requested'
          CHECK (status IN ('requested', 'approved', 'rejected')),
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id text PRIMARY KEY,
        account_id text NOT NULL REFERENCES accounts(id),
        payee text NOT NULL,
        description text NOT NULL,
        amount numeric(14, 2) NOT NULL CHECK (amount > 0),
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS benefit_receipts (
        id text PRIMARY KEY,
        account_id text NOT NULL REFERENCES accounts(id),
        benefit_type text NOT NULL,
        reference text,
        amount numeric(14, 2) NOT NULL CHECK (amount > 0),
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (account_id, reference)
      );

      CREATE TABLE IF NOT EXISTS account_managers (
        id text PRIMARY KEY,
        account_id text NOT NULL REFERENCES accounts(id),
        name text NOT NULL,
        email text NOT NULL,
        role text NOT NULL DEFAULT 'responsavel',
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (account_id, email)
      );
    `);

    await this.pool.query(`
      INSERT INTO customers (id, name)
      SELECT 'client-' || md5(id), holder_name
      FROM accounts
      WHERE customer_id IS NULL
      ON CONFLICT (id) DO NOTHING;

      UPDATE accounts
      SET customer_id = 'client-' || md5(accounts.id)
      WHERE customer_id IS NULL;
    `);

    await this.pool.query(
      `INSERT INTO customers (id, name)
       VALUES
         ('client-demo-001', 'Ana Souza'),
         ('client-demo-002', 'Carlos Oliveira'),
         ('client-demo-003', 'Mariana Santos')
       ON CONFLICT (id) DO NOTHING`,
    );

    await this.pool.query(
      `INSERT INTO accounts
         (id, customer_id, account_number, holder_name, balance, status)
       VALUES
         ('acc-001', 'client-demo-001', '000123-4', 'Ana Souza', 1250.75, 'active'),
         ('acc-002', 'client-demo-002', '000567-8', 'Carlos Oliveira', 830.20, 'active'),
         ('acc-003', 'client-demo-003', '000901-2', 'Mariana Santos', 0, 'active')
       ON CONFLICT (id) DO NOTHING`,
    );
  }

  async listCustomers(): Promise<CustomerRecord[]> {
    const { rows } = await this.pool.query<CustomerRow>(
      "SELECT id, name, email, created_at FROM customers ORDER BY created_at, id",
    );
    return rows.map(mapCustomer);
  }

  async createCustomer(
    name: string,
    email: string | null,
  ): Promise<CustomerRecord> {
    const { rows } = await this.pool.query<CustomerRow>(
      `INSERT INTO customers (id, name, email)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [`cus-${randomUUID()}`, name, email],
    );
    return mapCustomer(rows[0]!);
  }

  async listAccounts(): Promise<AccountRecord[]> {
    const { rows } = await this.pool.query<AccountRow>(
      `SELECT id, customer_id, account_number, holder_name, balance::text, status
       FROM accounts
       ORDER BY created_at, id`,
    );
    return rows.map(mapAccount);
  }

  async createAccount(input: AccountCreationInput): Promise<AccountRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      let customerId = input.customerId;
      let holderName = input.holderName;
      if (!customerId && holderName) {
        const customer = await client.query<CustomerRow>(
          `INSERT INTO customers (id, name)
           VALUES ($1, $2)
           RETURNING id, name, email, created_at`,
          [`cus-${randomUUID()}`, holderName],
        );
        customerId = customer.rows[0]!.id;
      }
      if (!customerId) {
        throw new CustomerNotFoundError();
      }

      const { rows } = await client.query<AccountRow>(
        `WITH next_number AS (
           SELECT nextval('account_number_sequence') AS value
         )
         INSERT INTO accounts
           (id, customer_id, account_number, holder_name, balance, status)
         SELECT
           $1,
           customers.id,
           lpad(next_number.value::text,
                greatest(6, length(next_number.value::text)), '0') || '-' ||
             (next_number.value % 10)::text,
           customers.name,
           $2::numeric / 100,
           'active'
         FROM next_number
         JOIN customers ON customers.id = $3
         RETURNING id, customer_id, account_number, holder_name,
                   balance::text, status`,
        [`acc-${randomUUID()}`, input.initialBalanceCents, customerId],
      );
      if (rows.length === 0) {
        throw new CustomerNotFoundError();
      }
      await client.query("COMMIT");
      return mapAccount(rows[0]!);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async executeMovementTransaction<T>(
    operation: (transaction: AccountMovementTransaction) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const transaction: AccountMovementTransaction = {
        findAccountForUpdate: (accountId) =>
          this.findAccountForUpdate(client, accountId),
        updateBalance: (accountId, balanceCents) =>
          this.updateBalance(client, accountId, balanceCents),
        insertMovement: (
          accountId,
          type,
          amountCents,
          balanceAfterCents,
          details,
        ) =>
          this.insertMovement(
            client,
            accountId,
            type,
            amountCents,
            balanceAfterCents,
            details,
          ),
        insertPayment: (input) => this.insertPayment(client, input),
        insertBenefit: (input) => this.insertBenefit(client, input),
      };
      const result = await operation(transaction);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listMovements(accountId: string): Promise<MovementRecord[]> {
    const { rows: accounts } = await this.pool.query(
      "SELECT 1 FROM accounts WHERE id = $1",
      [accountId],
    );

    if (accounts.length === 0) {
      throw new AccountNotFoundError();
    }

    const { rows } = await this.pool.query<MovementRow>(
      `SELECT id::text, account_id, type, amount::text, balance_after::text,
              description, reference, created_at
       FROM account_movements
       WHERE account_id = $1
       ORDER BY created_at DESC, id DESC`,
      [accountId],
    );
    return rows.map(mapMovement);
  }

  async createCreditRequest(
    input: CreditRequestInput,
  ): Promise<CreditRequestRecord> {
    const { rows } = await this.pool.query<CreditRequestRow>(
      `INSERT INTO credit_requests
         (id, customer_id, account_id, type, amount, purpose, enterprise_name)
       SELECT $1, customer.id, account.id, $4, $5::numeric / 100, $6, $7
       FROM customers customer
       LEFT JOIN accounts account
         ON account.id = $3 AND account.customer_id = customer.id
       WHERE customer.id = $2
         AND ($3::text IS NULL OR account.id IS NOT NULL)
       RETURNING id, customer_id, account_id, type, amount::text,
                 interest_rate::text, purpose, enterprise_name, status, created_at`,
      [
        `credit-${randomUUID()}`,
        input.customerId,
        input.accountId ?? null,
        input.type,
        input.amountCents,
        input.purpose,
        input.enterpriseName ?? null,
      ],
    );
    if (rows.length === 0) {
      throw new CustomerNotFoundError();
    }
    return mapCreditRequest(rows[0]!);
  }

  async createCardRequest(
    accountId: string,
    cardholderName: string,
  ): Promise<CardRequestRecord> {
    const { rows } = await this.pool.query<CardRow>(
      `INSERT INTO card_requests
         (id, account_id, customer_id, cardholder_name)
       SELECT $1, id, customer_id, $2
       FROM accounts
       WHERE id = $3 AND status = 'active'
       RETURNING id, account_id, customer_id, cardholder_name, status, created_at`,
      [`card-${randomUUID()}`, cardholderName, accountId],
    );
    if (rows.length === 0) {
      throw new AccountNotFoundError();
    }
    return mapCard(rows[0]!);
  }

  async listPayments(accountId: string): Promise<PaymentRecord[]> {
    await this.ensureAccountExists(accountId);
    const { rows } = await this.pool.query<PaymentRow>(
      `SELECT id, account_id, payee, description, amount::text, created_at
       FROM payments WHERE account_id = $1 ORDER BY created_at DESC, id DESC`,
      [accountId],
    );
    return rows.map(mapPayment);
  }

  async listBenefits(accountId: string): Promise<BenefitRecord[]> {
    await this.ensureAccountExists(accountId);
    const { rows } = await this.pool.query<BenefitRow>(
      `SELECT id, account_id, benefit_type, reference, amount::text, created_at
       FROM benefit_receipts
       WHERE account_id = $1
       ORDER BY created_at DESC, id DESC`,
      [accountId],
    );
    return rows.map(mapBenefit);
  }

  async listManagers(accountId: string): Promise<ManagerRecord[]> {
    await this.ensureAccountExists(accountId);
    const { rows } = await this.pool.query<ManagerRow>(
      `SELECT id, account_id, name, email, role, created_at
       FROM account_managers WHERE account_id = $1 ORDER BY created_at, id`,
      [accountId],
    );
    return rows.map(mapManager);
  }

  async addManager(
    accountId: string,
    name: string,
    email: string,
    role: string,
  ): Promise<ManagerRecord> {
    await this.ensureAccountExists(accountId);
    try {
      const { rows } = await this.pool.query<ManagerRow>(
        `INSERT INTO account_managers (id, account_id, name, email, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, account_id, name, email, role, created_at`,
        [`manager-${randomUUID()}`, accountId, name, email, role],
      );
      return mapManager(rows[0]!);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          "Este responsável já está associado a esta conta.",
        );
      }
      throw error;
    }
  }

  async removeManager(accountId: string, managerId: string): Promise<boolean> {
    await this.ensureAccountExists(accountId);
    const result = await this.pool.query(
      "DELETE FROM account_managers WHERE account_id = $1 AND id = $2",
      [accountId, managerId],
    );
    return result.rowCount === 1;
  }

  async getFinancialReport(
    period: "daily" | "weekly",
  ): Promise<FinancialReport> {
    const interval = period === "daily" ? "1 day" : "7 days";
    const { rows } = await this.pool.query<QueryResultRow & {
      starts_at: Date;
      ends_at: Date;
      deposits: string;
      withdrawals: string;
      payments: string;
      benefits: string;
      movement_count: string;
      account_count: string;
    }>(
      `SELECT now() - $1::interval AS starts_at,
              now() AS ends_at,
              COALESCE(SUM(amount) FILTER (WHERE type = 'deposit'), 0)::text AS deposits,
              COALESCE(SUM(amount) FILTER (WHERE type = 'withdrawal'), 0)::text AS withdrawals,
              COALESCE(SUM(amount) FILTER (WHERE type = 'payment'), 0)::text AS payments,
              COALESCE(SUM(amount) FILTER (WHERE type = 'benefit'), 0)::text AS benefits,
              COUNT(id)::text AS movement_count,
              (SELECT COUNT(*)::text FROM accounts WHERE status = 'active') AS account_count
       FROM account_movements
       WHERE created_at >= now() - $1::interval`,
      [interval],
    );
    const row = rows[0]!;
    const cents = (value: string): number => moneyToCents(value, true) / 100;
    const deposits = cents(row.deposits);
    const withdrawals = cents(row.withdrawals);
    const payments = cents(row.payments);
    const benefits = cents(row.benefits);
    return {
      period,
      startsAt: row.starts_at.toISOString(),
      endsAt: row.ends_at.toISOString(),
      totals: {
        deposits,
        withdrawals,
        payments,
        benefits,
        movements: deposits + benefits - withdrawals - payments,
      },
      movementCount: Number(row.movement_count),
      accountCount: Number(row.account_count),
    };
  }

  async listCreditRequests(
    customerId?: string,
  ): Promise<CreditRequestRecord[]> {
    const { rows } = await this.pool.query<CreditRequestRow>(
      `SELECT id, customer_id, account_id, type, amount::text,
              interest_rate::text, purpose, enterprise_name, status, created_at
       FROM credit_requests
       WHERE $1::text IS NULL OR customer_id = $1
       ORDER BY created_at DESC, id DESC`,
      [customerId ?? null],
    );
    return rows.map(mapCreditRequest);
  }

  async listCardRequests(accountId?: string): Promise<CardRequestRecord[]> {
    const { rows } = await this.pool.query<CardRow>(
      `SELECT id, account_id, customer_id, cardholder_name, status, created_at
       FROM card_requests
       WHERE $1::text IS NULL OR account_id = $1
       ORDER BY created_at DESC, id DESC`,
      [accountId ?? null],
    );
    return rows.map(mapCard);
  }

  private async findAccountForUpdate(
    client: PoolClient,
    accountId: string,
  ): Promise<LockedAccountRecord | null> {
    const { rows } = await client.query<AccountRow>(
      `SELECT id, customer_id, account_number, holder_name, balance::text, status
       FROM accounts
       WHERE id = $1
       FOR UPDATE`,
      [accountId],
    );
    const row = rows[0];
    return row
      ? {
          id: row.id,
          balanceCents: moneyToCents(row.balance, true),
          status: row.status,
        }
      : null;
  }

  private async updateBalance(
    client: PoolClient,
    accountId: string,
    balanceCents: number,
  ): Promise<void> {
    await client.query(
      `UPDATE accounts SET balance = $2::numeric / 100 WHERE id = $1`,
      [accountId, balanceCents],
    );
  }

  private async insertMovement(
    client: PoolClient,
    accountId: string,
    type: MovementType,
    amountCents: number,
    balanceAfterCents: number,
    details?: { description?: string; reference?: string },
  ): Promise<MovementRecord> {
    const { rows } = await client.query<MovementRow>(
      `INSERT INTO account_movements
         (account_id, type, amount, balance_after, description, reference)
       VALUES ($1, $2, $3::numeric / 100, $4::numeric / 100, $5, $6)
       RETURNING id::text, account_id, type, amount::text,
                 balance_after::text, description, reference, created_at`,
      [
        accountId,
        type,
        amountCents,
        balanceAfterCents,
        details?.description ?? null,
        details?.reference ?? null,
      ],
    );
    return mapMovement(rows[0]!);
  }

  private async insertPayment(
    client: PoolClient,
    input: PaymentInput,
  ): Promise<PaymentRecord> {
    const { rows } = await client.query<PaymentRow>(
      `INSERT INTO payments (id, account_id, payee, description, amount)
       VALUES ($1, $2, $3, $4, $5::numeric / 100)
       RETURNING id, account_id, payee, description, amount::text, created_at`,
      [
        `payment-${randomUUID()}`,
        input.accountId,
        input.payee,
        input.description,
        input.amountCents,
      ],
    );
    return mapPayment(rows[0]!);
  }

  private async insertBenefit(
    client: PoolClient,
    input: BenefitInput,
  ): Promise<BenefitRecord> {
    try {
      const { rows } = await client.query<BenefitRow>(
        `INSERT INTO benefit_receipts
           (id, account_id, benefit_type, reference, amount)
         VALUES ($1, $2, $3, $4, $5::numeric / 100)
         RETURNING id, account_id, benefit_type, reference, amount::text, created_at`,
        [
          `benefit-${randomUUID()}`,
          input.accountId,
          input.benefitType,
          input.reference ?? null,
          input.amountCents,
        ],
      );
      return mapBenefit(rows[0]!);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          "Este benefício já foi registrado para esta conta.",
        );
      }
      throw error;
    }
  }

  private async ensureAccountExists(accountId: string): Promise<void> {
    const { rows } = await this.pool.query(
      "SELECT 1 FROM accounts WHERE id = $1",
      [accountId],
    );
    if (rows.length === 0) {
      throw new AccountNotFoundError();
    }
  }

}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
