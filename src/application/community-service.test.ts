import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AccountService } from "./account-service.js";
import { CommunityService } from "./community-service.js";
import type {
  AccountCreationInput,
  AccountMovementTransaction,
  AccountRecord,
  AccountRepository,
  BenefitInput,
  BenefitRecord,
  CardRequestRecord,
  CreditRequestInput,
  CreditRequestRecord,
  CustomerRecord,
  FinancialReport,
  ManagerRecord,
  MovementRecord,
  PaymentInput,
  PaymentRecord,
} from "./account-repository.js";
import type { MovementType } from "../domain/account.js";

class FakeAccountRepository implements AccountRepository {
  balanceCents = 10_000;
  movements: MovementRecord[] = [];
  payments: PaymentRecord[] = [];
  benefits: BenefitRecord[] = [];

  async initialize(): Promise<void> {}
  async listCustomers(): Promise<CustomerRecord[]> {
    return [];
  }
  async listAccounts(): Promise<AccountRecord[]> {
    return [];
  }
  async createCustomer(name: string, email: string | null): Promise<CustomerRecord> {
    return { id: "customer-1", name, email, createdAt: new Date().toISOString() };
  }
  async createAccount(input: AccountCreationInput): Promise<AccountRecord> {
    return {
      id: "account-1",
      customerId: input.customerId ?? "customer-1",
      accountNumber: "000001-1",
      holderName: input.holderName ?? "Cliente",
      balance: input.initialBalanceCents / 100,
      status: "active",
    };
  }
  async executeMovementTransaction<T>(
    operation: (transaction: AccountMovementTransaction) => Promise<T>,
  ): Promise<T> {
    const initialBalance = this.balanceCents;
    const movementCount = this.movements.length;
    const paymentCount = this.payments.length;
    const benefitCount = this.benefits.length;
    const transaction: AccountMovementTransaction = {
      findAccountForUpdate: async () => ({
        id: "account-1",
        balanceCents: this.balanceCents,
        status: "active",
      }),
      updateBalance: async (_accountId, cents) => {
        this.balanceCents = cents;
      },
      insertMovement: async (
        accountId,
        type: MovementType,
        amountCents,
        balanceAfterCents,
        details,
      ) => {
        const movement: MovementRecord = {
          id: `movement-${this.movements.length + 1}`,
          accountId,
          type,
          amount: amountCents / 100,
          balanceAfter: balanceAfterCents / 100,
          description: details?.description ?? null,
          reference: details?.reference ?? null,
          createdAt: new Date().toISOString(),
        };
        this.movements.push(movement);
        return movement;
      },
      insertPayment: async (input: PaymentInput) => {
        const payment: PaymentRecord = {
          id: `payment-${this.payments.length + 1}`,
          accountId: input.accountId,
          payee: input.payee,
          description: input.description,
          amount: input.amountCents / 100,
          createdAt: new Date().toISOString(),
        };
        this.payments.push(payment);
        return payment;
      },
      insertBenefit: async (input: BenefitInput) => {
        const benefit: BenefitRecord = {
          id: `benefit-${this.benefits.length + 1}`,
          accountId: input.accountId,
          benefitType: input.benefitType,
          reference: input.reference ?? null,
          amount: input.amountCents / 100,
          createdAt: new Date().toISOString(),
        };
        this.benefits.push(benefit);
        return benefit;
      },
    };

    try {
      return await operation(transaction);
    } catch (error) {
      this.balanceCents = initialBalance;
      this.movements.length = movementCount;
      this.payments.length = paymentCount;
      this.benefits.length = benefitCount;
      throw error;
    }
  }
  async listMovements(): Promise<MovementRecord[]> {
    return this.movements;
  }
  async createCreditRequest(
    input: CreditRequestInput,
  ): Promise<CreditRequestRecord> {
    return {
      id: "credit-1",
      customerId: input.customerId,
      accountId: input.accountId ?? null,
      type: input.type,
      amount: input.amountCents / 100,
      interestRate: 0,
      purpose: input.purpose,
      enterpriseName: input.enterpriseName ?? null,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }
  async createCardRequest(
    accountId: string,
    cardholderName: string,
  ): Promise<CardRequestRecord> {
    return {
      id: "card-1",
      accountId,
      customerId: "customer-1",
      cardholderName,
      status: "requested",
      createdAt: new Date().toISOString(),
    };
  }
  async listPayments(): Promise<PaymentRecord[]> {
    return this.payments;
  }
  async listBenefits(): Promise<BenefitRecord[]> {
    return this.benefits;
  }
  async listManagers(): Promise<ManagerRecord[]> {
    return [];
  }
  async addManager(
    accountId: string,
    name: string,
    email: string,
    role: string,
  ): Promise<ManagerRecord> {
    return {
      id: "manager-1",
      accountId,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    };
  }
  async removeManager(): Promise<boolean> {
    return false;
  }
  async getFinancialReport(period: "daily" | "weekly"): Promise<FinancialReport> {
    return {
      period,
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      totals: { deposits: 0, withdrawals: 0, payments: 0, benefits: 0, movements: 0 },
      movementCount: 0,
      accountCount: 0,
    };
  }
  async listCreditRequests(): Promise<CreditRequestRecord[]> {
    return [];
  }
  async listCardRequests(): Promise<CardRequestRecord[]> {
    return [];
  }
}

describe("CommunityService", () => {
  it("records a payment and its account debit together", async () => {
    const repository = new FakeAccountRepository();
    const service = new CommunityService(
      repository,
      new AccountService(repository),
    );

    const payment = await service.createPayment({
      accountId: "account-1",
      payee: "Energia comunitária",
      description: "Conta de luz",
      amount: 25,
    });

    assert.equal(payment.amount, 25);
    assert.equal(repository.balanceCents, 7_500);
    assert.equal(repository.movements[0]?.type, "payment");
    assert.equal(repository.movements[0]?.reference, "Energia comunitária");
    assert.equal(repository.payments.length, 1);
  });

  it("rolls back payment records when the account has insufficient funds", async () => {
    const repository = new FakeAccountRepository();
    repository.balanceCents = 100;
    const service = new CommunityService(
      repository,
      new AccountService(repository),
    );

    await assert.rejects(
      service.createPayment({
        accountId: "account-1",
        payee: "Energia comunitária",
        description: "Conta de luz",
        amount: 5,
      }),
      /Saldo insuficiente/,
    );
    assert.equal(repository.balanceCents, 100);
    assert.equal(repository.movements.length, 0);
    assert.equal(repository.payments.length, 0);
  });

  it("registers a benefit as an incoming account movement", async () => {
    const repository = new FakeAccountRepository();
    const service = new CommunityService(
      repository,
      new AccountService(repository),
    );

    const receipt = await service.receiveBenefit("account-1", {
      benefitType: "Aposentadoria",
      reference: "NB-123",
      amount: 100,
    });

    assert.equal(receipt.amount, 100);
    assert.equal(repository.balanceCents, 20_000);
    assert.equal(repository.movements[0]?.type, "benefit");
    assert.equal(repository.benefits.length, 1);
  });

  it("keeps solidarity credit requests interest-free and pending", async () => {
    const repository = new FakeAccountRepository();
    const service = new CommunityService(
      repository,
      new AccountService(repository),
    );

    const request = await service.createCreditRequest("solidarity", {
      customerId: "customer-1",
      enterpriseName: "Cooperativa local",
      purpose: "Equipamentos de produção",
      amount: 500,
    });

    assert.equal(request.interestRate, 0);
    assert.equal(request.status, "pending");
    assert.equal(request.enterpriseName, "Cooperativa local");
  });

  it("requires an enterprise name for solidarity credit", async () => {
    const repository = new FakeAccountRepository();
    const service = new CommunityService(
      repository,
      new AccountService(repository),
    );

    assert.throws(
      () =>
        service.createCreditRequest("solidarity", {
          customerId: "customer-1",
          purpose: "Capital de giro",
          amount: 100,
        }),
      /enterpriseName is required/,
    );
  });

  it("creates a card request associated with an account", async () => {
    const repository = new FakeAccountRepository();
    const service = new CommunityService(
      repository,
      new AccountService(repository),
    );

    const card = await service.createCardRequest("account-1", "Ana Souza");
    assert.equal(card.accountId, "account-1");
    assert.equal(card.status, "requested");
  });

  it("normalizes manager emails and limits roles to supported values", async () => {
    const repository = new FakeAccountRepository();
    const service = new CommunityService(
      repository,
      new AccountService(repository),
    );

    const manager = await service.addManager("account-1", {
      name: "Ana Souza",
      email: "ANA@EXAMPLE.COM",
      role: "GERENTE",
    });
    assert.equal(manager.email, "ana@example.com");
    assert.equal(manager.role, "gerente");
    assert.throws(
      () =>
        service.addManager("account-1", {
          name: "Ana Souza",
          email: "ana@example.com",
          role: "admin",
        }),
      /role must be responsavel or gerente/,
    );
  });
});
