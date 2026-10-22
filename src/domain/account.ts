export type MovementType = "deposit" | "withdrawal" | "payment" | "benefit";
const MAX_MONEY_CENTS = 99_999_999_999_999;

export class InvalidMovementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMovementError";
  }
}

export class AccountNotFoundError extends Error {
  constructor() {
    super("Conta não encontrada.");
    this.name = "AccountNotFoundError";
  }
}

export class CustomerNotFoundError extends Error {
  constructor() {
    super("Cliente não encontrado ou não vinculado à conta.");
    this.name = "CustomerNotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class InactiveAccountError extends Error {
  constructor() {
    super("A conta não está ativa.");
    this.name = "InactiveAccountError";
  }
}

export class InsufficientFundsError extends Error {
  constructor() {
    super("Saldo insuficiente para realizar o saque.");
    this.name = "InsufficientFundsError";
  }
}

export function moneyToCents(value: number | string, allowZero = false): number {
  const amount = Number(value);
  const cents = Math.round(amount * 100);

  if (
    !Number.isFinite(amount) ||
    !Number.isSafeInteger(cents) ||
    cents > MAX_MONEY_CENTS ||
    (allowZero ? cents < 0 : cents <= 0) ||
    Math.abs(amount * 100 - cents) > 0.000001
  ) {
    throw new InvalidMovementError(
      allowZero
        ? "O saldo deve ser um valor não negativo com até duas casas decimais."
        : "O valor deve ser maior que zero e ter até duas casas decimais.",
    );
  }

  return cents;
}

export class Account {
  constructor(
    readonly id: string,
    readonly balanceCents: number,
    readonly status: string,
  ) {}

  applyMovement(type: MovementType, amountCents: number): number {
    if (this.status !== "active") {
      throw new InactiveAccountError();
    }

    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      throw new InvalidMovementError("O valor da movimentação é inválido.");
    }

    if (type === "deposit" || type === "benefit") {
      const newBalance = this.balanceCents + amountCents;
      if (!Number.isSafeInteger(newBalance) || newBalance > MAX_MONEY_CENTS) {
        throw new InvalidMovementError("O saldo excede o limite permitido.");
      }
      return newBalance;
    }

    if (type === "withdrawal" || type === "payment") {
      if (amountCents > this.balanceCents) {
        throw new InsufficientFundsError();
      }
      return this.balanceCents - amountCents;
    }

    throw new InvalidMovementError("Tipo de movimentação inválido.");
  }
}
