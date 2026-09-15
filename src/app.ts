import express from "express";

const app = express();
app.use(express.json());

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

app.get("/", (_request, response) => {
 return response.status(200).json({
 message: "Community Bank API"
 });
});
app.get("/accounts", (_request, response) => {
 return response.status(200).json(accounts);
});
app.get("/health", (_request, response) => {
 return response.status(200).json({
 status: "ok"
 });
});

export { app };