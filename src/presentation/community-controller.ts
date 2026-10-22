import { Router } from "express";
import type { CommunityService } from "../application/community-service.js";

function requestBody(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

function createCommunityRouter(service: CommunityService): Router {
  const router = Router();

  router.post("/credit/solidarity", async (request, response) => {
    const result = await service.createCreditRequest(
      "solidarity",
      requestBody(request.body),
    );
    return response.status(201).json(result);
  });
  router.get("/credit/requests", async (request, response) => {
    const result = await service.listCreditRequests(request.query.customerId);
    return response.status(200).json(result);
  });
  router.post("/credit/personal", async (request, response) => {
    const result = await service.createCreditRequest(
      "personal",
      requestBody(request.body),
    );
    return response.status(201).json(result);
  });
  router.post("/cards", async (request, response) => {
    const body = requestBody(request.body);
    const result = await service.createCardRequest(
      typeof body.accountId === "string" ? body.accountId : "",
      body.cardholderName,
    );
    return response.status(201).json(result);
  });
  router.get("/cards", async (request, response) => {
    const result = await service.listCardRequests(request.query.accountId);
    return response.status(200).json(result);
  });
  router.post("/payments", async (request, response) => {
    const result = await service.createPayment(requestBody(request.body));
    return response.status(201).json(result);
  });
  router.get("/accounts/:accountId/payments", async (request, response) => {
    const result = await service.listPayments(request.params.accountId!);
    return response.status(200).json(result);
  });
  router.post("/accounts/:accountId/benefits", async (request, response) => {
    const result = await service.receiveBenefit(
      request.params.accountId!,
      requestBody(request.body),
    );
    return response.status(201).json(result);
  });
  router.get("/accounts/:accountId/benefits", async (request, response) => {
    const result = await service.listBenefits(request.params.accountId!);
    return response.status(200).json(result);
  });
  router.get("/accounts/:accountId/managers", async (request, response) => {
    const result = await service.listManagers(request.params.accountId!);
    return response.status(200).json(result);
  });
  router.post("/accounts/:accountId/managers", async (request, response) => {
    const result = await service.addManager(
      request.params.accountId!,
      requestBody(request.body),
    );
    return response.status(201).json(result);
  });
  router.delete(
    "/accounts/:accountId/managers/:managerId",
    async (request, response) => {
      const removed = await service.removeManager(
        request.params.accountId!,
        request.params.managerId!,
      );
      return removed
        ? response.status(204).end()
        : response.status(404).json({ message: "Responsável não encontrado." });
    },
  );
  router.get("/reports/daily", async (_request, response) => {
    return response.status(200).json(await service.getFinancialReport("daily"));
  });
  router.get("/reports/weekly", async (_request, response) => {
    return response.status(200).json(await service.getFinancialReport("weekly"));
  });

  return router;
}

export { createCommunityRouter };
