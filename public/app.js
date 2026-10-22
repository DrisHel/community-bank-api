const table = document.querySelector("#accounts-table");
const searchInput = document.querySelector("#search-input");
const feedback = document.querySelector("#feedback");
const modal = document.querySelector("#modal");
const form = document.querySelector("#account-form");
const formError = document.querySelector("#form-error");
const movementModal = document.querySelector("#movement-modal");
const movementForm = document.querySelector("#movement-form");
const movementError = document.querySelector("#movement-error");
const movementHistory = document.querySelector("#movement-history-list");
const serviceFeedback = document.querySelector("#service-feedback");
const reportResults = document.querySelector("#report-results");
let selectedAccount = null;
let accounts = [];
let customers = [];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function initials(name) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function avatarClass(index) {
  return ["", "orange", "blue"][index % 3];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showFeedback(target, message, isError = false) {
  target.textContent = message;
  target.classList.toggle("is-error", isError);
  if (!isError) {
    setTimeout(() => {
      if (target.textContent === message) target.textContent = "";
    }, 4500);
  }
}

async function apiRequest(url, options) {
  const response = await fetch(url, options);
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(result?.message || "Não foi possível concluir a solicitação.");
  }
  return result;
}

function formPayload(formElement, numberFields = []) {
  const payload = Object.fromEntries(new FormData(formElement).entries());
  for (const field of numberFields) {
    payload[field] = Number(payload[field]);
  }
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && !value.trim()) delete payload[key];
  }
  return payload;
}

function populateAccountSelects() {
  const options = accounts.map((account) =>
    `<option value="${escapeHtml(account.id)}">${escapeHtml(account.accountNumber)} · ${escapeHtml(account.holderName)}</option>`
  ).join("");
  document.querySelectorAll(".account-select").forEach((select) => {
    const currentValue = select.value;
    const hasEmptyOption = select.querySelector('option[value=""]');
    select.innerHTML = `${hasEmptyOption ? '<option value="">Selecione uma conta</option>' : ""}${options}`;
    if (accounts.some((account) => account.id === currentValue)) {
      select.value = currentValue;
    } else if (!hasEmptyOption && accounts.length) {
      select.value = accounts[0].id;
    }
  });
}

function populateCustomerSelects() {
  const options = customers.map((customer) =>
    `<option value="${escapeHtml(customer.id)}">${escapeHtml(customer.name)}${customer.email ? ` · ${escapeHtml(customer.email)}` : ""}</option>`
  ).join("");
  document.querySelectorAll(".customer-select, #account-customer-select").forEach((select) => {
    const currentValue = select.value;
    const isOptional = select.id === "account-customer-select";
    select.innerHTML = `${isOptional ? '<option value="">Cadastrar novo cliente</option>' : ""}${options}`;
    if (customers.some((customer) => customer.id === currentValue)) {
      select.value = currentValue;
    } else if (!isOptional && customers.length) {
      select.value = customers[0].id;
    }
  });
}

async function loadCustomers() {
  const list = document.querySelector("#customers-list");
  list.textContent = "Carregando clientes...";
  try {
    customers = await apiRequest("/customers");
    populateCustomerSelects();
    list.innerHTML = customers.length
      ? customers.map((customer) => `<article class="record-item"><div><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.email || "Sem e-mail")} · ${escapeHtml(customer.id)}</small></div></article>`).join("")
      : '<p class="empty-state">Nenhum cliente cadastrado.</p>';
  } catch (error) {
    list.textContent = error instanceof Error ? error.message : "Erro ao carregar clientes.";
  }
}

async function loadCreditRequests() {
  const list = document.querySelector("#credit-list");
  list.textContent = "Carregando solicitações...";
  try {
    const requests = await apiRequest("/credit/requests");
    list.innerHTML = requests.length
      ? requests.map((request) => `<article class="record-item"><div><strong>${request.type === "solidarity" ? "Crédito para empreendimento" : "Crédito pessoal/familiar"}</strong><small>${escapeHtml(request.purpose)}${request.enterpriseName ? ` · ${escapeHtml(request.enterpriseName)}` : ""}</small><small>${escapeHtml(request.customerId)} · ${new Date(request.createdAt).toLocaleDateString("pt-BR")}</small></div><div class="record-value">${currency.format(request.amount)}<small>${escapeHtml(request.status)} · ${request.interestRate}% juros</small></div></article>`).join("")
      : '<p class="empty-state">Nenhuma solicitação de crédito.</p>';
  } catch (error) {
    list.textContent = error instanceof Error ? error.message : "Erro ao carregar solicitações.";
  }
}

async function loadCards() {
  const list = document.querySelector("#cards-list");
  list.textContent = "Carregando pedidos...";
  try {
    const cards = await apiRequest("/cards");
    list.innerHTML = cards.length
      ? cards.map((card) => `<article class="record-item"><div><strong>${escapeHtml(card.cardholderName)}</strong><small>${escapeHtml(card.accountId)} · ${escapeHtml(card.customerId)}</small></div><span class="record-status">${escapeHtml(card.status)}</span></article>`).join("")
      : '<p class="empty-state">Nenhum pedido de cartão.</p>';
  } catch (error) {
    list.textContent = error instanceof Error ? error.message : "Erro ao carregar pedidos.";
  }
}

async function loadPayments() {
  const accountId = document.querySelector("#payment-account-filter").value;
  const list = document.querySelector("#payments-list");
  if (!accountId) {
    list.textContent = "Cadastre uma conta para consultar pagamentos.";
    return;
  }
  list.textContent = "Carregando pagamentos...";
  try {
    const payments = await apiRequest(`/accounts/${encodeURIComponent(accountId)}/payments`);
    list.innerHTML = payments.length
      ? payments.map((payment) => `<article class="record-item"><div><strong>${escapeHtml(payment.payee)}</strong><small>${escapeHtml(payment.description)} · ${new Date(payment.createdAt).toLocaleString("pt-BR")}</small></div><span class="record-value">${currency.format(payment.amount)}</span></article>`).join("")
      : '<p class="empty-state">Nenhum pagamento nesta conta.</p>';
  } catch (error) {
    list.textContent = error instanceof Error ? error.message : "Erro ao carregar pagamentos.";
  }
}

async function loadBenefits() {
  const accountId = document.querySelector("#benefit-account-filter").value;
  const list = document.querySelector("#benefits-list");
  if (!accountId) {
    list.textContent = "Cadastre uma conta para consultar benefícios.";
    return;
  }
  list.textContent = "Carregando benefícios...";
  try {
    const benefits = await apiRequest(`/accounts/${encodeURIComponent(accountId)}/benefits`);
    list.innerHTML = benefits.length
      ? benefits.map((benefit) => `<article class="record-item"><div><strong>${escapeHtml(benefit.benefitType)}</strong><small>${escapeHtml(benefit.reference || "Sem referência")} · ${new Date(benefit.createdAt).toLocaleString("pt-BR")}</small></div><span class="record-value">${currency.format(benefit.amount)}</span></article>`).join("")
      : '<p class="empty-state">Nenhum benefício nesta conta.</p>';
  } catch (error) {
    list.textContent = error instanceof Error ? error.message : "Erro ao carregar benefícios.";
  }
}

async function loadManagers() {
  const accountId = document.querySelector("#manager-account-filter").value;
  const list = document.querySelector("#managers-list");
  if (!accountId) {
    list.textContent = "Cadastre uma conta para gerenciar responsáveis.";
    return;
  }
  list.textContent = "Carregando responsáveis...";
  try {
    const managers = await apiRequest(`/accounts/${encodeURIComponent(accountId)}/managers`);
    list.innerHTML = managers.length
      ? managers.map((manager) => `<article class="record-item"><div><strong>${escapeHtml(manager.name)}</strong><small>${escapeHtml(manager.email)} · ${escapeHtml(manager.role)}</small></div><button class="remove-manager" type="button" data-account-id="${escapeHtml(accountId)}" data-manager-id="${escapeHtml(manager.id)}">Remover</button></article>`).join("")
      : '<p class="empty-state">Nenhum responsável associado a esta conta.</p>';
  } catch (error) {
    list.textContent = error instanceof Error ? error.message : "Erro ao carregar responsáveis.";
  }
}

async function loadReport(period = "daily") {
  reportResults.innerHTML = '<p class="loading">Carregando relatório...</p>';
  try {
    const report = await apiRequest(`/reports/${period}`);
    reportResults.innerHTML = `
      <article class="report-card"><span>Depósitos</span><strong>${currency.format(report.totals.deposits)}</strong></article>
      <article class="report-card"><span>Saques</span><strong>${currency.format(report.totals.withdrawals)}</strong></article>
      <article class="report-card"><span>Pagamentos</span><strong>${currency.format(report.totals.payments)}</strong></article>
      <article class="report-card"><span>Benefícios recebidos</span><strong>${currency.format(report.totals.benefits)}</strong></article>
      <article class="report-card highlight"><span>Movimentação líquida</span><strong>${currency.format(report.totals.movements)}</strong></article>
      <article class="report-card"><span>Lançamentos no período</span><strong>${report.movementCount}</strong></article>
      <article class="report-card"><span>Contas ativas</span><strong>${report.accountCount}</strong></article>
      <p class="report-period">Período: ${new Date(report.startsAt).toLocaleString("pt-BR")} a ${new Date(report.endsAt).toLocaleString("pt-BR")}</p>`;
  } catch (error) {
    reportResults.textContent = error instanceof Error ? error.message : "Erro ao carregar relatório.";
  }
}

async function submitServiceForm(formElement, endpoint, options = {}) {
  const payload = formPayload(formElement, options.numberFields || []);
  const result = await apiRequest(endpoint(payload), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  formElement.reset();
  showFeedback(serviceFeedback, options.success);
  await options.refresh?.(result);
}

function bindServiceForm(formId, endpoint, options) {
  const formElement = document.querySelector(`#${formId}`);
  formElement.addEventListener("submit", async (event) => {
    event.preventDefault();
    showFeedback(serviceFeedback, "");
    try {
      await submitServiceForm(formElement, endpoint, options);
    } catch (error) {
      showFeedback(
        serviceFeedback,
        error instanceof Error ? error.message : "Não foi possível concluir a operação.",
        true
      );
    }
  });
}

function renderAccounts(list = accounts) {
  if (!list.length) {
    table.innerHTML = '<tr><td colspan="5" class="loading">Nenhuma conta encontrada.</td></tr>';
  } else {
    table.innerHTML = list.map((account) => {
      const originalIndex = accounts.findIndex((item) => item.id === account.id);
      return `<tr>
        <td><div class="account-cell"><span class="account-avatar ${avatarClass(originalIndex)}">${initials(account.holderName)}</span><div><span class="account-name">${account.accountNumber}</span><span class="account-id">${account.id}</span></div></div></td>
        <td>${escapeHtml(account.holderName)}</td>
        <td class="balance">${currency.format(account.balance)}</td>
        <td><span class="status"><i></i>Ativa</span></td>
        <td><button class="movement-button" data-account-id="${escapeHtml(account.id)}">Movimentar</button></td>
      </tr>`;
    }).join("");
  }

  document.querySelector("#table-count").textContent = `${list.length} ${list.length === 1 ? "conta" : "contas"}`;
}

function updateMetrics() {
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  const average = accounts.length ? total / accounts.length : 0;
  document.querySelector("#total-balance").textContent = currency.format(total);
  document.querySelector("#account-count").textContent = accounts.length;
  document.querySelector("#average-balance").textContent = currency.format(average);
}

async function loadAccounts() {
  try {
    const response = await fetch("/accounts");
    if (!response.ok) throw new Error("Não foi possível carregar as contas.");
    accounts = await response.json();
    populateAccountSelects();
    renderAccounts();
    updateMetrics();
  } catch (error) {
    table.innerHTML = `<tr><td colspan="5" class="loading">${escapeHtml(error instanceof Error ? error.message : "Erro ao carregar contas.")}</td></tr>`;
  }
}

function setModal(open) {
  modal.classList.toggle("open", open);
  modal.setAttribute("aria-hidden", String(!open));
  if (open) form.elements.holderName.focus();
}

function setMovementModal(open) {
  movementModal.classList.toggle("open", open);
  movementModal.setAttribute("aria-hidden", String(!open));
  if (open) movementForm.elements.type.focus();
}

async function loadMovementHistory(account) {
  movementHistory.textContent = "Carregando extrato...";
  try {
    const response = await fetch(`/accounts/${encodeURIComponent(account.id)}/transactions`);
    const movements = await response.json();
    if (!response.ok) throw new Error(movements.message || "Não foi possível carregar o extrato.");

    if (!movements.length) {
      movementHistory.textContent = "Ainda não há movimentações nesta conta.";
      return;
    }

    movementHistory.innerHTML = movements.map((movement) => {
      const labels = {
        deposit: "Depósito",
        withdrawal: "Saque",
        payment: "Pagamento",
        benefit: "Benefício"
      };
      const label = labels[movement.type] || "Movimentação";
      const date = new Date(movement.createdAt).toLocaleString("pt-BR");
      return `<article class="history-item">
        <div><strong>${label}</strong><small>${escapeHtml(date)}</small></div>
        <div><strong>${currency.format(movement.amount)}</strong><small>Saldo: ${currency.format(movement.balanceAfter)}</small></div>
      </article>`;
    }).join("");
  } catch (error) {
    movementHistory.textContent = error instanceof Error ? error.message : "Erro ao carregar o extrato.";
  }
}

function openMovementModal(account) {
  selectedAccount = account;
  movementError.textContent = "";
  movementForm.reset();
  document.querySelector("#movement-account").textContent =
    `${account.holderName} · Conta ${account.accountNumber}`;
  setMovementModal(true);
  loadMovementHistory(account);
}

document.querySelector("#open-modal").addEventListener("click", () => setModal(true));
document.querySelector("#close-modal").addEventListener("click", () => setModal(false));
document.querySelector("#close-movement-modal").addEventListener("click", () => setMovementModal(false));
modal.addEventListener("click", (event) => {
  if (event.target === modal) setModal(false);
});
movementModal.addEventListener("click", (event) => {
  if (event.target === movementModal) setMovementModal(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setModal(false);
    setMovementModal(false);
  }
});

table.addEventListener("click", (event) => {
  const button = event.target.closest(".movement-button");
  if (!button) return;
  const account = accounts.find((item) => item.id === button.dataset.accountId);
  if (account) openMovementModal(account);
});

searchInput.addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase().trim();
  const filtered = accounts.filter((account) => `${account.holderName} ${account.accountNumber} ${account.id}`.toLowerCase().includes(query));
  renderAccounts(filtered);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";
  const data = new FormData(form);
  const customerId = String(data.get("customerId") || "").trim();
  const holderName = String(data.get("holderName") || "").trim();
  if (!customerId && !holderName) {
    formError.textContent = "Selecione um cliente ou informe o nome do novo titular.";
    return;
  }
  const payload = { balance: Number(data.get("balance")) };
  if (customerId) payload.customerId = customerId;
  if (holderName) payload.holderName = holderName;

  try {
    const account = await apiRequest("/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    await Promise.all([loadAccounts(), loadCustomers()]);
    form.reset();
    setModal(false);
    feedback.textContent = "Conta criada com sucesso.";
    setTimeout(() => { feedback.textContent = ""; }, 3500);
  } catch (error) {
    formError.textContent = error instanceof Error ? error.message : "Erro ao criar a conta.";
  }
});

movementForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  movementError.textContent = "";
  if (!selectedAccount) return;

  const data = new FormData(movementForm);
  const payload = {
    type: data.get("type"),
    amount: Number(data.get("amount"))
  };

  try {
    const response = await fetch(
      `/accounts/${encodeURIComponent(selectedAccount.id)}/transactions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Não foi possível registrar a movimentação.");

    const operation = result.type === "deposit" ? "Depósito" : "Saque";
    feedback.textContent = `${operation} de ${currency.format(result.amount)} registrado.`;
    await loadAccounts();
    selectedAccount = accounts.find((account) => account.id === result.accountId);
    if (selectedAccount) {
      document.querySelector("#movement-account").textContent =
        `${selectedAccount.holderName} · Conta ${selectedAccount.accountNumber}`;
      await loadMovementHistory(selectedAccount);
    }
    movementForm.reset();
  } catch (error) {
    movementError.textContent = error instanceof Error
      ? error.message
      : "Erro ao registrar a movimentação.";
  }
});

document.querySelectorAll(".service-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".service-tab").forEach((item) => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-service-panel]").forEach((panel) => {
      const active = panel.dataset.servicePanel === tab.dataset.panel;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    showFeedback(serviceFeedback, "");
  });
});

document.querySelector("#credit-form [name='type']").addEventListener("change", (event) => {
  const enterpriseField = document.querySelector("#enterprise-field");
  const enterpriseInput = enterpriseField.querySelector("input");
  const required = event.target.value === "solidarity";
  enterpriseField.hidden = !required;
  enterpriseInput.required = required;
  if (!required) enterpriseInput.value = "";
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => {
      item.classList.toggle("active", item === link);
    });
  });
});

bindServiceForm("customer-form", () => "/customers", {
  success: "Cliente cadastrado com sucesso.",
  refresh: async () => {
    await loadCustomers();
    await loadAccounts();
  }
});

bindServiceForm("credit-form", (payload) =>
  payload.type === "solidarity" ? "/credit/solidarity" : "/credit/personal", {
  numberFields: ["amount"],
  success: "Solicitação de crédito registrada como pendente.",
  refresh: loadCreditRequests
});

bindServiceForm("card-form", () => "/cards", {
  success: "Pedido de cartão registrado.",
  refresh: loadCards
});

bindServiceForm("payment-form", () => "/payments", {
  numberFields: ["amount"],
  success: "Pagamento registrado e debitado da conta.",
  refresh: async (payment) => {
    await Promise.all([loadAccounts(), loadPayments()]);
    const account = accounts.find((item) => item.id === payment.accountId);
    if (account) showFeedback(serviceFeedback, `Pagamento de ${currency.format(payment.amount)} confirmado para ${payment.payee}.`);
  }
});

bindServiceForm("benefit-form", (payload) =>
  `/accounts/${encodeURIComponent(payload.accountId)}/benefits`, {
  numberFields: ["amount"],
  success: "Benefício registrado e creditado na conta.",
  refresh: async () => {
    await Promise.all([loadAccounts(), loadBenefits()]);
  }
});

bindServiceForm("manager-form", (payload) =>
  `/accounts/${encodeURIComponent(payload.accountId)}/managers`, {
  success: "Responsável associado à conta.",
  refresh: loadManagers
});

document.querySelector("#payment-account-filter").addEventListener("change", loadPayments);
document.querySelector("#benefit-account-filter").addEventListener("change", loadBenefits);
document.querySelector("#manager-account-filter").addEventListener("change", loadManagers);

document.querySelector("#managers-list").addEventListener("click", async (event) => {
  const button = event.target.closest(".remove-manager");
  if (!button) return;
  button.disabled = true;
  try {
    await apiRequest(
      `/accounts/${encodeURIComponent(button.dataset.accountId)}/managers/${encodeURIComponent(button.dataset.managerId)}`,
      { method: "DELETE" }
    );
    showFeedback(serviceFeedback, "Responsável removido da conta.");
    await loadManagers();
  } catch (error) {
    showFeedback(
      serviceFeedback,
      error instanceof Error ? error.message : "Não foi possível remover o responsável.",
      true
    );
    button.disabled = false;
  }
});

document.querySelectorAll(".report-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".report-button").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    loadReport(button.dataset.period);
  });
});

async function loadServiceScreens() {
  await Promise.all([
    loadCreditRequests(),
    loadCards(),
    loadReport("daily")
  ]);
  await Promise.all([loadPayments(), loadBenefits(), loadManagers()]);
}

async function initializeDashboard() {
  await Promise.all([loadAccounts(), loadCustomers()]);
  await loadServiceScreens();
}

initializeDashboard();
