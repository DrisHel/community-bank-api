import express, { type NextFunction, type Request, type Response } from "express";
import { pool } from "./database.js";
import { AccountService } from "./application/account-service.js";
import { CommunityService } from "./application/community-service.js";
import { PostgresAccountRepository } from "./infrastructure/postgres-account-repository.js";
import {
  createAccountRouter,
  createCustomerRouter,
} from "./presentation/account-controller.js";
import { createCommunityRouter } from "./presentation/community-controller.js";
import {
  AccountNotFoundError,
  ConflictError,
  CustomerNotFoundError,
  InactiveAccountError,
  InsufficientFundsError,
  InvalidMovementError,
} from "./domain/account.js";

const app = express();
const accountRepository = new PostgresAccountRepository(pool);
const accountService = new AccountService(accountRepository);
const communityService = new CommunityService(accountRepository, accountService);

app.use(express.json());
app.use(express.static("public"));
app.use("/accounts", createAccountRouter(accountService));
app.use("/customers", createCustomerRouter(accountService));
app.use(createCommunityRouter(communityService));

app.get("/health", (_request, response) => {
  return response.status(200).json({ status: "ok" });
});

app.use(
  (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof InvalidMovementError) {
      return response.status(400).json({ message: error.message });
    }

    if (
      error instanceof AccountNotFoundError ||
      error instanceof CustomerNotFoundError
    ) {
      return response.status(404).json({ message: error.message });
    }

    if (
      error instanceof InsufficientFundsError ||
      error instanceof InactiveAccountError
    ) {
      return response.status(409).json({ message: error.message });
    }

    if (error instanceof ConflictError) {
      return response.status(409).json({ message: error.message });
    }

    console.error("Request failed:", error);
    return response.status(500).json({
      message: "Não foi possível concluir a solicitação.",
    });
  },
);

async function initializeApp(): Promise<void> {
  await accountRepository.initialize();
}

export { app, initializeApp };
