import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  Account,
  InsufficientFundsError,
  InactiveAccountError,
  InvalidMovementError,
  moneyToCents,
} from "./account.js";

describe("Account movements", () => {
  it("converts monetary values to exact cents", () => {
    assert.equal(moneyToCents(12.34), 1234);
    assert.equal(moneyToCents(0, true), 0);
  });

  it("rejects values that are not positive cent amounts", () => {
    assert.throws(() => moneyToCents(0), InvalidMovementError);
    assert.throws(() => moneyToCents(1.001), InvalidMovementError);
  });

  it("credits deposits without floating-point balance drift", () => {
    const account = new Account("acc-001", 1000, "active");
    assert.equal(account.applyMovement("deposit", 200), 1200);
  });

  it("credits a registered government benefit to the account", () => {
    const account = new Account("acc-001", 1000, "active");
    assert.equal(account.applyMovement("benefit", 250), 1250);
  });

  it("debits a bill payment using the same balance safeguards as a withdrawal", () => {
    const account = new Account("acc-001", 1000, "active");
    assert.equal(account.applyMovement("payment", 300), 700);
    assert.throws(
      () => account.applyMovement("payment", 1001),
      InsufficientFundsError,
    );
  });

  it("blocks withdrawals that exceed the available balance", () => {
    const account = new Account("acc-001", 1000, "active");
    assert.throws(
      () => account.applyMovement("withdrawal", 1001),
      InsufficientFundsError,
    );
  });

  it("blocks movements on inactive accounts", () => {
    const account = new Account("acc-001", 1000, "inactive");
    assert.throws(
      () => account.applyMovement("deposit", 100),
      InactiveAccountError,
    );
  });
});
