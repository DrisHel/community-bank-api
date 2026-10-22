import {
  InvalidMovementError,
  moneyToCents,
} from "../domain/account.js";
import type {
  CommunityRepository,
  BenefitRecord,
  CardRequestRecord,
  CreditRequestRecord,
  FinancialReport,
  ManagerRecord,
  PaymentRecord,
} from "./account-repository.js";
import { AccountService } from "./account-service.js";

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new InvalidMovementError(`${field} is required`);
  }
  return value.trim();
}

function positiveAmount(value: unknown): number {
  if (typeof value !== "number") {
    throw new InvalidMovementError("amount must be a positive number");
  }
  return moneyToCents(value);
}

export class CommunityService {
  constructor(
    private readonly repository: CommunityRepository,
    private readonly accounts: AccountService,
  ) {}

  createCreditRequest(
    type: "solidarity" | "personal",
    input: Record<string, unknown>,
  ): Promise<CreditRequestRecord> {
    const customerId = requiredText(input.customerId, "customerId");
    const purpose = requiredText(input.purpose, "purpose");
    let accountId: string | undefined;
    if (input.accountId !== undefined && input.accountId !== null) {
      accountId = requiredText(input.accountId, "accountId");
    }
    const enterpriseName =
      type === "solidarity"
        ? requiredText(input.enterpriseName, "enterpriseName")
        : undefined;
    const amountCents = positiveAmount(input.amount);

    return this.repository.createCreditRequest({
      customerId,
      ...(accountId ? { accountId } : {}),
      type,
      amountCents,
      purpose,
      ...(enterpriseName ? { enterpriseName } : {}),
    });
  }

  createCardRequest(
    accountId: string,
    cardholderName: unknown,
  ): Promise<CardRequestRecord> {
    return this.repository.createCardRequest(
      requiredText(accountId, "accountId"),
      requiredText(cardholderName, "cardholderName"),
    );
  }

  async createPayment(input: Record<string, unknown>): Promise<PaymentRecord> {
    const accountId = requiredText(input.accountId, "accountId");
    const payee = requiredText(input.payee, "payee");
    const description = requiredText(input.description, "description");
    const amountCents = positiveAmount(input.amount);
    let payment: PaymentRecord | undefined;

    await this.accounts.createMovement(
      accountId,
      "payment",
      amountCents / 100,
      { description, reference: payee },
      async (transaction) => {
        payment = await transaction.insertPayment({
          accountId,
          payee,
          description,
          amountCents,
        });
      },
    );

    if (!payment) {
      throw new Error("Payment transaction completed without a payment record");
    }
    return payment;
  }

  async receiveBenefit(
    accountId: string,
    input: Record<string, unknown>,
  ): Promise<BenefitRecord> {
    const benefitType = requiredText(input.benefitType, "benefitType");
    const reference =
      input.reference === undefined || input.reference === null
        ? undefined
        : requiredText(input.reference, "reference");
    const amountCents = positiveAmount(input.amount);
    const normalizedAccountId = requiredText(accountId, "accountId");
    let benefit: BenefitRecord | undefined;

    await this.accounts.createMovement(
      normalizedAccountId,
      "benefit",
      amountCents / 100,
      { description: benefitType, ...(reference ? { reference } : {}) },
      async (transaction) => {
        benefit = await transaction.insertBenefit({
          accountId: normalizedAccountId,
          benefitType,
          ...(reference ? { reference } : {}),
          amountCents,
        });
      },
    );

    if (!benefit) {
      throw new Error("Benefit transaction completed without a receipt");
    }
    return benefit;
  }

  listPayments(accountId: string): Promise<PaymentRecord[]> {
    return this.repository.listPayments(requiredText(accountId, "accountId"));
  }

  listBenefits(accountId: string): Promise<BenefitRecord[]> {
    return this.repository.listBenefits(requiredText(accountId, "accountId"));
  }

  listManagers(accountId: string): Promise<ManagerRecord[]> {
    return this.repository.listManagers(requiredText(accountId, "accountId"));
  }

  addManager(
    accountId: string,
    input: Record<string, unknown>,
  ): Promise<ManagerRecord> {
    const name = requiredText(input.name, "name");
    const email = requiredText(input.email, "email").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new InvalidMovementError("email must be a valid email address");
    }
    const role =
      input.role === undefined ? "responsavel" : requiredText(input.role, "role");
    if (!["responsavel", "gerente"].includes(role.toLowerCase())) {
      throw new InvalidMovementError("role must be responsavel or gerente");
    }
    return this.repository.addManager(
      requiredText(accountId, "accountId"),
      name,
      email,
      role.toLowerCase(),
    );
  }

  removeManager(accountId: string, managerId: string): Promise<boolean> {
    return this.repository.removeManager(
      requiredText(accountId, "accountId"),
      requiredText(managerId, "managerId"),
    );
  }

  getFinancialReport(period: "daily" | "weekly"): Promise<FinancialReport> {
    return this.repository.getFinancialReport(period);
  }

  listCreditRequests(customerId: unknown) {
    const id =
      customerId === undefined || customerId === null
        ? undefined
        : requiredText(customerId, "customerId");
    return this.repository.listCreditRequests(id);
  }

  listCardRequests(accountId: unknown) {
    const id =
      accountId === undefined || accountId === null
        ? undefined
        : requiredText(accountId, "accountId");
    return this.repository.listCardRequests(id);
  }
}
