import express from "express";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const accounts = [
 {
  id: "acc-001",
  accountNumber: "000123-4",
  holderName: "Ana Souza",
  balance: 1250.75,
  status: "active"
 },
 {
  id: "acc-002",
  accountNumber: "000567-8",
  holderName: "Carlos Oliveira",
  balance: 830.2,
  status: "active"
 },
 {
  id: "acc-003",
  accountNumber: "000901-2",
  holderName: "Mariana Santos",
  balance: 0,
  status: "active"
 }
];

app.get("/accounts", (_request, response) => {
 return response.status(200).json(accounts);
});
app.post("/accounts", (request, response) => {
 const { holderName, balance = 0 } = request.body as {
  holderName?: unknown;
  balance?: unknown;
 };

 if (typeof holderName !== "string" || holderName.trim() === "") {
  return response.status(400).json({
   message: "holderName is required"
  });
 }

 if (typeof balance !== "number" || balance < 0) {
  return response.status(400).json({
   message: "balance must be a non-negative number"
  });
 }

 const account = {
  id: `acc-${String(accounts.length + 1).padStart(3, "0")}`,
  accountNumber: `${String(accounts.length + 1).padStart(6, "0")}-${accounts.length + 5}`,
  holderName: holderName.trim(),
  balance,
  status: "active"
 };

 accounts.push(account);

 return response.status(201).json(account);
});
app.get("/health", (_request, response) => {
 return response.status(200).json({
 status: "ok"
 });
});

export { app };