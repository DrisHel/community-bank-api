import {
  Account,
  AccountNotFoundError,
  InvalidMovementError,
  moneyToCents,
} from "../domain/account.js";
import type {
  AccountMovementTransaction,
  AccountCreationInput,
  AccountRecord,
  AccountRepository,
  CustomerRecord,
  MovementRecord,
} from "./account-repository.js";

export class AccountService {
  constructor(private readonly accounts: AccountRepository) {}

  listAccounts(): Promise<AccountRecord[]> {
    return this.accounts.listAccounts();
  }

  listCustomers(): Promise<CustomerRecord[]> {
    return this.accounts.listCustomers();
  }

  createAccount(
    holderName: unknown,
    customerId: unknown,
    balance: unknown,
  ): Promise<AccountRecord> {
    if (typeof balance !== "number") {
      throw new InvalidMovementError(
        "balance must be a non-negative number with up to two decimal places",
      );
    }

    const initialBalanceCents = moneyToCents(balance, true);
    const input: AccountCreationInput = { initialBalanceCents };

    if (customerId !== undefined && customerId !== null) {
      if (typeof customerId !== "string" || !customerId.trim()) {
        throw new InvalidMovementError("customerId must be a non-empty string");
      }
      input.customerId = customerId.trim();
    } else if (typeof holderName === "string" && holderName.trim()) {
      input.holderName = holderName.trim();
    } else {
      throw new InvalidMovementError(
        "Informe customerId ou holderName para vincular a conta a um cliente.",
      );
    }

    return this.accounts.createAccount(input);
  }

  createCustomer(name: unknown, email: unknown): Promise<CustomerRecord> {
    if (typeof name !== "string" || !name.trim()) {
      throw new InvalidMovementError("name is required");
    }

    if (
      email !== undefined &&
      email !== null &&
      (typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    ) {
      throw new InvalidMovementError("email must be a valid email address");
    }

    return this.accounts.createCustomer(
      name.trim(),
      typeof email === "string" ? email.trim().toLowerCase() : null,
    );
  }

  createMovement(
    accountId: string,
    type: unknown,
    amount: unknown,
    details?: { description?: string; reference?: string },
    afterMovement?: (transaction: AccountMovementTransaction) => Promise<void>,
  ): Promise<MovementRecord> {
    if (
      type !== "deposit" &&
      type !== "withdrawal" &&
      type !== "payment" &&
      type !== "benefit"
    ) {
      throw new InvalidMovementError(
        "type must be a supported account movement",
      );
    }

    if (typeof amount !== "number") {
      throw new InvalidMovementError("amount must be a positive number");
    }

    const amountCents = moneyToCents(amount);

    return this.accounts.executeMovementTransaction(async (transaction) => {
      const accountRecord = await transaction.findAccountForUpdate(accountId);
      if (!accountRecord) {
        throw new AccountNotFoundError();
      }

      const account = new Account(
        accountRecord.id,
        accountRecord.balanceCents,
        accountRecord.status,
      );
      const balanceAfterCents = account.applyMovement(type, amountCents);

      await transaction.updateBalance(accountId, balanceAfterCents);
      const movement = await transaction.insertMovement(
        accountId,
        type,
        amountCents,
        balanceAfterCents,
        details,
      );
      if (afterMovement) {
        await afterMovement(transaction);
      }
      return movement;
    });
  }

  listMovements(accountId: string): Promise<MovementRecord[]> {
    return this.accounts.listMovements(accountId);
  }
}
