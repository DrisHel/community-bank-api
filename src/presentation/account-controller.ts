import { Router } from "express";
import type { AccountService } from "../application/account-service.js";
import { InvalidMovementError } from "../domain/account.js";

function requestBody(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

function createAccountRouter(service: AccountService): Router {
  const router = Router();

  router.get("/", async (_request, response) => {
    return response.status(200).json(await service.listAccounts());
  });

  router.post("/", async (request, response) => {
    const body = requestBody(request.body);
    const account = await service.createAccount(
      body.holderName,
      body.customerId,
      body.balance === undefined ? 0 : body.balance,
    );
    return response.status(201).json(account);
  });

  router.post("/:accountId/transactions", async (request, response) => {
    const body = requestBody(request.body);
    if (body.type !== "deposit" && body.type !== "withdrawal") {
      throw new InvalidMovementError(
        "type must be either 'deposit' or 'withdrawal'",
      );
    }
    const movement = await service.createMovement(
      request.params.accountId!,
      body.type,
      body.amount,
    );
    return response.status(201).json(movement);
  });

  router.get("/:accountId/statement", async (request, response) => {
    const movements = await service.listMovements(request.params.accountId!);
    return response.status(200).json(movements);
  });

  router.post("/:accountId/deposits", async (request, response) => {
    const body = requestBody(request.body);
    const movement = await service.createMovement(
      request.params.accountId!,
      "deposit",
      body.amount,
      {
        ...(typeof body.description === "string"
          ? { description: body.description }
          : {}),
      },
    );
    return response.status(201).json(movement);
  });

  router.post("/:accountId/withdrawals", async (request, response) => {
    const body = requestBody(request.body);
    const movement = await service.createMovement(
      request.params.accountId!,
      "withdrawal",
      body.amount,
      {
        ...(typeof body.description === "string"
          ? { description: body.description }
          : {}),
      },
    );
    return response.status(201).json(movement);
  });

  router.get("/:accountId/transactions", async (request, response) => {
    const movements = await service.listMovements(request.params.accountId!);
    return response.status(200).json(movements);
  });

  return router;
}

function createCustomerRouter(service: AccountService): Router {
  const router = Router();
  router.get("/", async (_request, response) => {
    return response.status(200).json(await service.listCustomers());
  });
  router.post("/", async (request, response) => {
    const body = requestBody(request.body);
    const customer = await service.createCustomer(body.name, body.email);
    return response.status(201).json(customer);
  });
  return router;
}

export { createAccountRouter, createCustomerRouter };
