import type { MovementType } from "../domain/account.js";

export interface AccountRecord {
  id: string;
  customerId: string;
  accountNumber: string;
  holderName: string;
  balance: number;
  status: string;
}

export interface MovementRecord {
  id: string;
  accountId: string;
  type: MovementType;
  amount: number;
  balanceAfter: number;
  description: string | null;
  reference: string | null;
  createdAt: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
}

export interface AccountCreationInput {
  customerId?: string;
  holderName?: string;
  initialBalanceCents: number;
}

export interface CreditRequestInput {
  customerId: string;
  accountId?: string;
  type: "solidarity" | "personal";
  amountCents: number;
  purpose: string;
  enterpriseName?: string;
}

export interface CreditRequestRecord {
  id: string;
  customerId: string;
  accountId: string | null;
  type: "solidarity" | "personal";
  amount: number;
  interestRate: number;
  purpose: string;
  enterpriseName: string | null;
  status: "pending";
  createdAt: string;
}

export interface CardRequestRecord {
  id: string;
  accountId: string;
  customerId: string;
  cardholderName: string;
  status: "requested";
  createdAt: string;
}

export interface PaymentInput {
  accountId: string;
  payee: string;
  description: string;
  amountCents: number;
}

export interface PaymentRecord {
  id: string;
  accountId: string;
  payee: string;
  description: string;
  amount: number;
  createdAt: string;
}

export interface BenefitInput {
  accountId: string;
  benefitType: string;
  reference?: string;
  amountCents: number;
}

export interface BenefitRecord {
  id: string;
  accountId: string;
  benefitType: string;
  reference: string | null;
  amount: number;
  createdAt: string;
}

export interface ManagerRecord {
  id: string;
  accountId: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface FinancialReport {
  period: "daily" | "weekly";
  startsAt: string;
  endsAt: string;
  totals: {
    deposits: number;
    withdrawals: number;
    payments: number;
    benefits: number;
    movements: number;
  };
  movementCount: number;
  accountCount: number;
}

export interface LockedAccountRecord {
  id: string;
  balanceCents: number;
  status: string;
}

export interface AccountMovementTransaction {
  findAccountForUpdate(accountId: string): Promise<LockedAccountRecord | null>;
  updateBalance(accountId: string, balanceCents: number): Promise<void>;
  insertMovement(
    accountId: string,
    type: MovementType,
    amountCents: number,
    balanceAfterCents: number,
    details?: { description?: string; reference?: string },
  ): Promise<MovementRecord>;
  insertPayment(input: PaymentInput): Promise<PaymentRecord>;
  insertBenefit(input: BenefitInput): Promise<BenefitRecord>;
}

export interface CommunityRepository {
  createCreditRequest(input: CreditRequestInput): Promise<CreditRequestRecord>;
  createCardRequest(
    accountId: string,
    cardholderName: string,
  ): Promise<CardRequestRecord>;
  listPayments(accountId: string): Promise<PaymentRecord[]>;
  listBenefits(accountId: string): Promise<BenefitRecord[]>;
  listManagers(accountId: string): Promise<ManagerRecord[]>;
  addManager(
    accountId: string,
    name: string,
    email: string,
    role: string,
  ): Promise<ManagerRecord>;
  removeManager(accountId: string, managerId: string): Promise<boolean>;
  getFinancialReport(period: "daily" | "weekly"): Promise<FinancialReport>;
  listCreditRequests(customerId?: string): Promise<CreditRequestRecord[]>;
  listCardRequests(accountId?: string): Promise<CardRequestRecord[]>;
}

export interface AccountRepository extends CommunityRepository {
  initialize(): Promise<void>;
  listCustomers(): Promise<CustomerRecord[]>;
  listAccounts(): Promise<AccountRecord[]>;
  createCustomer(name: string, email: string | null): Promise<CustomerRecord>;
  createAccount(input: AccountCreationInput): Promise<AccountRecord>;
  executeMovementTransaction<T>(
    operation: (transaction: AccountMovementTransaction) => Promise<T>,
  ): Promise<T>;
  listMovements(accountId: string): Promise<MovementRecord[]>;
}
